/*
 * Native TI-Nspire WebUSB transport.
 * Independent implementation based on the publicly documented packet protocol:
 * https://www.hackspire.org/USB_Protocol/
 * No WebTILP, iframe, proprietary SDK, or background localhost service.
 */
(() => {
  "use strict";
  const VENDOR_ID = 0x0451;
  const PRODUCT_IDS = [0xe012, 0xe022];
  const SERVICE_FILES = 0x4060;
  const SERVICE_SCREEN_RLE = 0x4024;
  const MAX_FILE_SIZE = 32 * 1024 * 1024;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: false });

  class NspireError extends Error {
    constructor(message) { super(message); this.name = "NspireError"; }
  }
  function ensure(condition, message) {
    if (!condition) throw new NspireError(message);
  }
  function be16(n) { return Uint8Array.of((n >>> 8) & 255, n & 255); }
  function be32(n) { return Uint8Array.of((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255); }
  function u16(bytes, offset = 0) { return (bytes[offset] << 8) | bytes[offset + 1]; }
  function u32(bytes, offset = 0) {
    return ((bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) +
      (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
  }
  function concat(...parts) {
    const len = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(len);
    let offset = 0;
    for (const part of parts) { result.set(part, offset); offset += part.length; }
    return result;
  }
  function checksum(data) {
    let value = 0;
    for (const byte of data) {
      const first = (byte << 8) | (value >>> 8);
      value &= 255;
      const second = (((value & 15) << 4) ^ value) << 8;
      const third = second >>> 5;
      value = ((third >>> 7) ^ first ^ second ^ third) & 65535;
    }
    return value;
  }
  function packet(data, opts = {}) {
    data = data instanceof Uint8Array ? data : new Uint8Array(data);
    ensure(data.length <= 2048, "Paquete USB demasiado grande.");
    const large = data.length > 254;
    const header = new Uint8Array(16);
    const dv = new DataView(header.buffer);
    dv.setUint16(0, 0x54fd);
    dv.setUint16(2, opts.srcAddr ?? 0x6400);
    dv.setUint16(4, opts.srcSid ?? 0x4003);
    dv.setUint16(6, opts.dstAddr ?? 0x6401);
    dv.setUint16(8, opts.dstSid ?? 0x4003);
    const lengthPrefix = opts.bigEndianLength ? be32(data.length) :
      Uint8Array.of(data.length & 255, (data.length >>> 8) & 255, 0, 0);
    const payload = large ? concat(lengthPrefix, data) : data;
    dv.setUint16(10, checksum(payload));
    header[12] = large ? 255 : data.length;
    header[13] = opts.ack ?? 0;
    header[14] = opts.seq ?? 1;
    header[15] = header.subarray(0, 15).reduce((sum, x) => (sum + x) & 255, 0);
    return concat(header, payload);
  }
  function parsePacket(bytes, opts = {}) {
    ensure(bytes.length >= 16, "Trama USB incompleta.");
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    ensure(dv.getUint16(0) === 0x54fd, "Identificador de trama TI-Nspire inválido.");
    const length = bytes[12] === 255 ? dv.getUint32(16, !opts.bigEndianLength) : bytes[12];
    const offset = bytes[12] === 255 ? 20 : 16;
    ensure(length <= MAX_FILE_SIZE && bytes.length === offset + length, "Longitud de trama USB incorrecta.");
    const headSum = bytes.subarray(0, 15).reduce((sum, x) => (sum + x) & 255, 0);
    ensure(headSum === bytes[15], "Checksum de cabecera USB incorrecto.");
    const payload = bytes.subarray(16);
    ensure(checksum(payload) === dv.getUint16(10), "Checksum de datos USB incorrecto.");
    return {
      srcAddr: dv.getUint16(2), srcSid: dv.getUint16(4),
      dstAddr: dv.getUint16(6), dstSid: dv.getUint16(8),
      ack: bytes[13], seq: bytes[14],
      data: bytes.subarray(offset), length
    };
  }
  function pathName(value) {
    ensure(typeof value === "string" && value.startsWith("/") && !value.includes("\\") &&
      !value.includes("\0") && !value.split("/").includes("..") &&
      !value.split("/").includes("."), "Ruta de calculadora inválida.");
    return "/" + value.split("/").filter(Boolean).join("/");
  }
  function childPath(parent, name) {
    ensure(typeof name === "string" && name.trim() && name.length <= 170 &&
      !/[/\\\x00-\x1f]/.test(name) && name !== "." && name !== "..", "Nombre inválido.");
    return (pathName(parent).replace(/\/$/, "") || "") + "/" + name;
  }
  function pathField(value) {
    const bytes = encoder.encode(pathName(value));
    ensure(bytes.length <= 240, "Ruta demasiado larga para TI-Nspire.");
    return bytes.length < 8
      ? concat(bytes, new Uint8Array(9 - bytes.length))
      : concat(bytes, Uint8Array.of(0));
  }
  function dirEntry(value) {
    ensure(value.length >= 12 && value[0] === 0x10, "Entrada de directorio inválida.");
    const end = value.indexOf(0, 3);
    ensure(end > 3, "Nombre de entrada inválido.");
    const name = decoder.decode(value.subarray(3, end));
    const offset = Math.max(3 + 8, end) + 1;
    ensure(offset + 9 <= value.length, "Entrada de directorio truncada.");
    return { name, size: u32(value, offset), date: u32(value, offset + 4), isDir: value[offset + 8] === 1 };
  }
  function decodeRle(rle, expectedLength, unitBytes = 1) {
    // Classic TI-Nspire compresses bytes (two grayscale pixels per byte).
    // CX/CX II color screens compress 32-bit groups containing two RGB565 pixels.
    ensure(expectedLength > 0 && expectedLength <= 3 * 1024 * 1024 &&
      (unitBytes === 1 || unitBytes === 4) && expectedLength % unitBytes === 0,
      "Dimensiones de captura incorrectas.");
    const output = new Uint8Array(expectedLength);
    let i = 0, o = 0;
    while (i < rle.length && o < expectedLength) {
      const signed = (rle[i++] << 24) >> 24;
      const count = (signed >= 0 ? signed + 1 : 1 - signed);
      const length = count * unitBytes;
      ensure(o + length <= expectedLength, "RLE desbordado.");
      if (signed >= 0) {
        ensure(i + unitBytes <= rle.length, "RLE incompleta.");
        const sample = rle.subarray(i, i + unitBytes);
        for (let j = 0; j < count; j++) output.set(sample, o + j * unitBytes);
        i += unitBytes;
      } else {
        ensure(i + length <= rle.length, "RLE truncado.");
        output.set(rle.subarray(i, i + length), o);
        i += length;
      }
      o += length;
    }
    ensure(o === expectedLength, "La imagen recibida está incompleta.");
    return output;
  }

  class NspireUSB {
    constructor(device) {
      ensure(PRODUCT_IDS.includes(device.productId) && device.vendorId === VENDOR_ID, "No es una TI-Nspire USB compatible.");
      this.device = device;
      this.cx2 = device.productId === 0xe022;
      this.iface = 0; this.endpointIn = 1; this.endpointOut = 1;
      this.outPacketSize = 64; this.hostSid = 0x4003; this.deviceSid = 0x4003;
      this.seq = 1; this.initialized = false; this.activeService = false;
      this.readBuffer = new Uint8Array(0); this.queue = [];
      this.connected = false; this.busy = false;
      this.nnse = null;
    }
    static async select() {
      ensure(navigator.usb?.requestDevice, "WebUSB no disponible. Abre la página en Chrome, Brave o Edge por HTTPS.");
      const device = await navigator.usb.requestDevice({
        filters: PRODUCT_IDS.map(productId => ({ vendorId: VENDOR_ID, productId }))
      });
      return new NspireUSB(device);
    }
    async connect() {
      ensure(!this.connected, "Ya existe una conexión.");
      try {
        if (!this.device.opened) await this.device.open();
        // Older Nspire handsets issue their address-request packet after a
        // USB reset. CX II speaks a different initialization variant.
        if (!this.cx2 && typeof this.device.reset === "function") {
          try { await this.device.reset(); }
          catch (_) { /* some WebUSB drivers forbid resets */ }
        }
        if (!this.device.configuration) await this.device.selectConfiguration(1);
        const found = [...(this.device.configuration?.interfaces || [])]
          .flatMap(iface => (iface.alternates || []).map(alt => ({ iface, alt })))
          .find(entry => entry.alt.endpoints?.some(p => p.type === "bulk" && p.direction === "in") &&
            entry.alt.endpoints?.some(p => p.type === "bulk" && p.direction === "out"));
        ensure(found, "La interfaz USB de la calculadora no ofrece endpoints de transferencia.");
        this.iface = found.iface.interfaceNumber;
        await this.device.claimInterface(this.iface);
        if (found.alt.alternateSetting) await this.device.selectAlternateInterface(this.iface, found.alt.alternateSetting);
        const inEp = found.alt.endpoints.find(p => p.type === "bulk" && p.direction === "in");
        const outEp = found.alt.endpoints.find(p => p.type === "bulk" && p.direction === "out");
        this.endpointIn = inEp.endpointNumber;
        this.endpointOut = outEp.endpointNumber;
        this.outPacketSize = outEp.packetSize || 64;
        if (this.cx2 && this.device.configuration.configurationValue === 1) {
          ensure(window.TnsNspireNNSE?.NNSETransport,
            "Falta cargar el transporte NNSE de TI-Nspire CX II.");
          this.nnse = new window.TnsNspireNNSE.NNSETransport({
            readExact: count => this.readExact(count),
            write: bytes => this.out(bytes)
          });
        }
        // A successful filesystem exchange, not enumeration, proves connection.
        await this.initialize();
        const files = await this.listDir("/");
        this.connected = true;
        return files;
      } catch (e) {
        await this.close();
        throw new NspireError("No se pudo establecer el protocolo TI-Nspire: " + (e.message || e));
      }
    }
    async close() {
      this.connected = false;
      // Send any pending service disconnect using its original USB framing
      // before disposing of the NNSE transport.
      try { if (this.activeService) await this.disconnectService(); } catch (_) {}
      this.initialized = false;
      this.nnse?.reset(); this.nnse = null;
      this.queue = []; this.readBuffer = new Uint8Array(0);
      try { if (this.device.opened) await this.device.releaseInterface(this.iface); } catch (_) {}
      try { if (this.device.opened) await this.device.close(); } catch (_) {}
    }
    async out(bytes) {
      const result = await this.device.transferOut(this.endpointOut, bytes);
      ensure(result.status === "ok", "La transferencia USB OUT falló.");
      if (bytes.length > 0 && bytes.length % this.outPacketSize === 0) {
        // Protocol packets aligned with USB max-packet size need termination.
        const zlp = await this.device.transferOut(this.endpointOut, new Uint8Array(0));
        ensure(zlp.status === "ok", "Fallo terminando trama USB.");
      }
    }
    async readExact(n) {
      while (this.readBuffer.length < n) {
        const response = await this.device.transferIn(this.endpointIn, Math.max(512, n - this.readBuffer.length));
        ensure(response.status === "ok" && response.data?.byteLength, "La calculadora no respondió por USB.");
        const part = new Uint8Array(response.data.buffer, response.data.byteOffset, response.data.byteLength);
        this.readBuffer = concat(this.readBuffer, part);
      }
      const bytes = this.readBuffer.slice(0, n);
      this.readBuffer = this.readBuffer.slice(n);
      return bytes;
    }
    async receiveRawPacket() {
      const header = await this.readExact(16);
      ensure(header[0] === 0x54 && header[1] === 0xfd,
        "Cabecera USB NavNet desconocida (" +
        Array.from(header.subarray(0, 8), b => b.toString(16).padStart(2, "0")).join(" ") +
        "). En una CX II con configuración USB 1 se requiere NNSE.");
      const size = header[12] === 255 ? await this.readExact(4) : new Uint8Array(0);
      const count = header[12] === 255 ? new DataView(size.buffer).getUint32(0, true) : header[12];
      ensure(count < 4 * 1024 * 1024, "Respuesta USB excesiva.");
      const data = await this.readExact(count);
      return parsePacket(concat(header, size, data));
    }
    async initialize() {
      if (this.initialized) return;
      if (this.nnse) {
        await this.nnse.handshake();
        this.hostSid = 0x8000;
        this.initialized = true;
        return;
      }
      if (!this.cx2) {
        // Legacy handhelds first send an address-request packet; the caller
        // must reconnect on timeout/disconnect instead of assuming CX II mode.
        const request = await this.receiveRawPacket();
        ensure(request.srcSid === 0x4003, "No se recibió la petición de dirección TI-Nspire.");
      }
      await this.out(packet(Uint8Array.of(0x64, 0x01, 0xff, 0x00), {
        srcSid: this.hostSid, dstSid: this.deviceSid, seq: this.cx2 ? 0 : this.seq
      }));
      this.hostSid = 0x8000;
      this.initialized = true;
    }
    ackFor(received, nack = false) {
      return packet(be16(received.dstSid), {
        srcSid: nack ? 0x00d3 : (received.seq ? 0x00ff : 0x00fe),
        dstSid: received.srcSid, ack: 0x0a, seq: received.seq
      });
    }
    async sendData(data, overrideSid = null) {
      if (this.nnse) {
        await this.nnse.sendStream(packet(data, {
          srcSid: overrideSid ?? this.hostSid, dstSid: this.deviceSid,
          seq: 0, bigEndianLength: true
        }));
        return;
      }
      await this.out(packet(data, {
        srcSid: overrideSid ?? this.hostSid, dstSid: this.deviceSid,
        seq: this.cx2 ? 0 : this.seq
      }));
      if (this.cx2) return;
      for (let attempt = 0; attempt < 32; attempt++) {
        const response = await this.receiveRawPacket();
        if (response.dstSid === this.hostSid) {
          if (response.srcSid === 0xff || response.srcSid === 0xfe) {
            this.seq = this.seq % 255 + 1; return;
          }
          if (response.srcSid === 0xd3) throw new NspireError("La calculadora rechazó el paquete.");
          await this.out(this.ackFor(response));
          this.queue.push(response);
        } else {
          await this.out(this.ackFor(response, response.dstSid !== 0x40de));
        }
      }
      throw new NspireError("Demasiados paquetes USB inesperados.");
    }
    async recvData() {
      if (this.nnse) {
        for (let attempt = 0; attempt < 64; attempt++) {
          const response = parsePacket(await this.nnse.receiveRaw(), { bigEndianLength: true });
          if (response.dstSid === this.hostSid) return response.data;
          // Discard delayed messages from an earlier filesystem operation.
        }
        throw new NspireError("La TI-Nspire CX II no respondió al servicio solicitado.");
      }
      for (let attempt = 0; attempt < 32; attempt++) {
        const alreadyAcked = this.queue.length > 0;
        const response = alreadyAcked ? this.queue.shift() : await this.receiveRawPacket();
        if (response.dstSid !== this.hostSid) {
          await this.out(this.ackFor(response, response.dstSid !== 0x40de));
          continue;
        }
        if (!this.cx2 && !alreadyAcked) await this.out(this.ackFor(response));
        return response.data;
      }
      throw new NspireError("La calculadora no devolvió una respuesta de servicio.");
    }
    async disconnectService() {
      if (!this.activeService) return;
      try { await this.sendData(be16(this.hostSid), 0x40de); }
      finally { this.activeService = false; this.hostSid++; this.queue = []; }
    }
    async usingService(sid, fn) {
      ensure(!this.busy, "Ya hay otra operación sobre la calculadora.");
      this.busy = true;
      try {
        await this.initialize();
        this.deviceSid = sid;
        this.activeService = true;
        return await fn();
      } finally {
        try { await this.disconnectService(); }
        finally { this.busy = false; }
      }
    }
    async listDir(path) {
      path = pathName(path);
      return this.usingService(SERVICE_FILES, async () => {
        await this.sendData(concat(Uint8Array.of(0x0d), pathField(path)));
        const opening = await this.recvData();
        ensure(opening[0] === 0xff && opening[1] === 0, "No se pudo abrir la carpeta " + path);
        const result = [];
        try {
          for (let n = 0; n < 8192; n++) {
            await this.sendData(Uint8Array.of(0x0e));
            const entry = await this.recvData();
            if (entry[0] === 0xff && entry[1] === 0x11) break;
            ensure(entry[0] === 0x10, "Respuesta de carpeta desconocida.");
            const item = dirEntry(entry);
            item.path = childPath(path, item.name);
            result.push(item);
          }
        } finally {
          await this.sendData(Uint8Array.of(0x0f));
          const done = await this.recvData();
          ensure(done[0] === 0xff && done[1] === 0, "La calculadora no cerró la enumeración.");
        }
        return result;
      });
    }
    async deleteEntry(path, isDir = false) {
      path = pathName(path);
      ensure(path !== "/", "No se puede borrar la raíz.");
      return this.usingService(SERVICE_FILES, async () => {
        const command = isDir ? Uint8Array.of(0x0b, 0x03) : Uint8Array.of(0x09, 0x01);
        await this.sendData(concat(command, pathField(path)));
        const result = await this.recvData();
        ensure(result.length >= 2 && result[0] === 0xff && result[1] === 0, "La calculadora rechazó la eliminación.");
      });
    }
    async makeDir(path) {
      return this.usingService(SERVICE_FILES, async () => {
        await this.sendData(concat(Uint8Array.of(0x0a, 0x03), pathField(path)));
        const done = await this.recvData();
        ensure(done[0] === 0xff && done[1] === 0, "No se pudo crear la carpeta.");
      });
    }
    async getFile(path, onProgress = () => {}) {
      return this.usingService(SERVICE_FILES, async () => {
        await this.sendData(concat(Uint8Array.of(0x07, 0x01), pathField(path)));
        const info = await this.recvData();
        ensure(info.length >= 15 && info[0] === 3 && info[1] === 1, "La calculadora no pudo abrir el archivo.");
        const count = u32(info, 11);
        ensure(count > 0 && count <= MAX_FILE_SIZE, "Tamaño de documento fuera de límites.");
        const data = new Uint8Array(count);
        await this.sendData(Uint8Array.of(4));
        let offset = 0;
        while (offset < count) {
          const chunk = await this.recvData();
          ensure(chunk[0] === 5 && chunk.length > 1, "Bloque del documento incorrecto.");
          const n = Math.min(chunk.length - 1, count - offset);
          data.set(chunk.subarray(1, 1 + n), offset); offset += n;
          onProgress(offset, count);
        }
        // All document bytes have arrived, but TI-Nspire must still
        // acknowledge the final command and disconnect the filesystem service.
        onProgress(offset, count, "finalizing");
        await this.sendData(Uint8Array.of(0xff, 0));
        return data;
      });
    }
    async putFile(path, data, onProgress = () => {}) {
      ensure(/\.tns$/i.test(path), "Solo se pueden enviar archivos .tns.");
      ensure(data instanceof Uint8Array && data.length > 0 && data.length <= MAX_FILE_SIZE, "Archivo .tns inválido o demasiado grande.");
      return this.usingService(SERVICE_FILES, async () => {
        await this.sendData(concat(Uint8Array.of(3, 1), pathField(path), be32(data.length)));
        const ready = await this.recvData();
        ensure(ready[0] === 4, "La calculadora rechazó el nombre, carpeta o tamaño del TNS.");
        const block = this.cx2 ? 1439 : 253;
        for (let offset = 0; offset < data.length; offset += block) {
          const chunk = data.subarray(offset, Math.min(data.length, offset + block));
          await this.sendData(concat(Uint8Array.of(5), chunk));
          onProgress(Math.min(data.length, offset + block), data.length);
        }
        onProgress(data.length, data.length, "finalizing");
        const done = await this.recvData();
        ensure(done.length >= 2 && done[0] === 0xff && done[1] === 0, "La calculadora no confirmó el archivo recibido.");
      });
    }
    async screenshotRle() {
      return this.usingService(SERVICE_SCREEN_RLE, async () => {
        await this.sendData(Uint8Array.of(0));
        const meta = await this.recvData();
        ensure(meta.length >= 13 && meta[0] === 1, "No hay respuesta de captura de pantalla.");
        const width = u16(meta, 9), height = u16(meta, 11);
        // Screen metadata need not contain a pixel-depth byte. Color Nspire
        // screens use RGB565; the original Nspire uses packed 4-bit grayscale.
        const bpp = meta[13] === 4 || meta[13] === 16 ? meta[13] : (this.cx2 ? 16 : 4);
        ensure(width > 0 && width <= 640 && height > 0 && height <= 480 &&
          (bpp === 4 || bpp === 16), "Formato de captura de pantalla no compatible.");
        const wanted = bpp === 16 ? width * height * 2 : Math.ceil(width * height / 2);
        const unitBytes = bpp === 16 ? 4 : 1;
        const encoded = [];
        let decoded = null;
        for (let i = 0; i < 2048; i++) {
          const part = await this.recvData();
          ensure(part.length > 1 && part[0] === 2, "Trama de captura desconocida.");
          encoded.push(part.subarray(1));
          const all = concat(...encoded);
          try { decoded = decodeRle(all, wanted, unitBytes); break; }
          catch (e) { if (!/incompleta|truncado/.test(e.message)) throw e; }
          ensure(all.length <= 1024 * 1024, "Captura excesiva.");
        }
        ensure(decoded, "Captura de pantalla incompleta.");
        return { width, height, bpp, pixels: decoded };
      });
    }
  }
  window.TnsNspireUSB = Object.freeze({
    NspireUSB, NspireError, checksum, packet, parsePacket, pathName, childPath,
    pathField, dirEntry, decodeRle, products: PRODUCT_IDS.slice()
  });
})();