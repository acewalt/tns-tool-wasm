using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using Microsoft.Win32;

internal static class Program
{
    private const string LauncherVersion = "1.0.0";
    private const string BackendVersion = "0.2.2";
    private const string BackendTag = "tns-tool-compiler-v4";
    private const string BackendUrl = "https://github.com/acewalt/tns-tool-wasm/releases/download/tns-tool-compiler-v4/TNS-Tool-Compiler-Windows-x64.exe";
    private const string BackendSha256 = "b7de803d2fbd9799689cf7cdf1f7c8575d712dd57f6755ba36b16c04c07fdb2f";
    private const int Port = 34983;
    private const int MaxRequestBytes = 32 * 1024 * 1024;

    private static readonly object StateLock = new object();
    private static readonly object BuildLock = new object();
    private static string BackendPath = null;
    private static bool BackendReady = false;
    private static string Stage = "starting";
    private static string Message = "Iniciando Ndless Web Compiler...";
    private static int Progress = 0;
    private static string LastError = "";

    private static int Main(string[] rawArgs)
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.Title = "Ndless Web Compiler";
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;

        var args = new List<string>(rawArgs ?? new string[0]);
        if (args.Count > 0 && string.Equals(args[0], "--self-test", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine("NdlessWebCompiler " + LauncherVersion);
            Console.WriteLine("backend=" + BackendVersion);
            Console.WriteLine("port=" + Port);
            Console.WriteLine("protocol=ndlessweb");
            return 0;
        }

        if (args.Count > 0 && args[0].EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                string backend = ResolveBackend(true);
                int failures = 0;
                foreach (string value in args)
                {
                    if (!value.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)) continue;
                    try { CompileZip(Path.GetFullPath(value), backend); }
                    catch (Exception ex)
                    {
                        failures++;
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine("[ERROR] " + Path.GetFileName(value));
                        Console.ResetColor();
                        Console.WriteLine(ex.Message);
                    }
                }
                return failures == 0 ? 0 : 1;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex.Message);
                return 2;
            }
        }

        try
        {
            string installed = InstallSelfAndProtocol();
            string current = Path.GetFullPath(Process.GetCurrentProcess().MainModule.FileName);
            bool runningInstalled = PathsEqual(current, installed);

            if (!runningInstalled)
            {
                StartInstalled(installed);
                Console.WriteLine("Ndless Web Compiler instalado.");
                Console.WriteLine("Puedes volver al navegador; la página detectará el compilador automáticamente.");
                Thread.Sleep(1400);
                return 0;
            }

            RunServer();
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Ndless Web Compiler no pudo iniciar: " + ex.Message);
            return 3;
        }
    }

    private static string InstallSelfAndProtocol()
    {
        string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Ndless Web Compiler");
        Directory.CreateDirectory(dir);
        string target = Path.Combine(dir, "Ndless-Web-Compiler.exe");
        string current = Path.GetFullPath(Process.GetCurrentProcess().MainModule.FileName);

        if (!PathsEqual(current, target))
        {
            try { File.Copy(current, target, true); }
            catch (IOException)
            {
                if (!File.Exists(target)) throw;
            }
        }

        using (RegistryKey root = Registry.CurrentUser.CreateSubKey(@"Software\Classes\ndlessweb"))
        {
            root.SetValue("", "URL:Ndless Web Compiler Protocol");
            root.SetValue("URL Protocol", "");
            using (RegistryKey command = root.CreateSubKey(@"shell\open\command"))
                command.SetValue("", "\"" + target + "\" --serve \"%1\"");
        }
        return target;
    }

    private static void StartInstalled(string installed)
    {
        var psi = new ProcessStartInfo();
        psi.FileName = installed;
        psi.Arguments = "--serve";
        psi.UseShellExecute = false;
        psi.WorkingDirectory = Path.GetDirectoryName(installed);
        Process.Start(psi);
    }

    private static bool PathsEqual(string a, string b)
    {
        try { return string.Equals(Path.GetFullPath(a).TrimEnd('\\'), Path.GetFullPath(b).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase); }
        catch { return false; }
    }

    private static void RunServer()
    {
        TcpListener listener;
        try
        {
            listener = new TcpListener(IPAddress.Loopback, Port);
            listener.Start();
        }
        catch (SocketException)
        {
            return;
        }

        Console.WriteLine("========================================");
        Console.WriteLine(" Ndless Web Compiler " + LauncherVersion);
        Console.WriteLine(" http://127.0.0.1:" + Port);
        Console.WriteLine(" backend: TNS Tool Compiler v4 / " + BackendVersion);
        Console.WriteLine("========================================");
        Console.WriteLine();
        Console.WriteLine("Deja esta ventana abierta mientras uses Build TNS.");
        Console.WriteLine();

        Thread prepare = new Thread(PrepareBackend);
        prepare.IsBackground = true;
        prepare.Start();

        while (true)
        {
            TcpClient client = listener.AcceptTcpClient();
            ThreadPool.QueueUserWorkItem(delegate { HandleClient(client); });
        }
    }

    private static void PrepareBackend()
    {
        try
        {
            SetState("checking", 1, "Buscando backend v4...", "");
            string path = ResolveBackend(false);
            lock (StateLock)
            {
                BackendPath = path;
                BackendReady = true;
                Stage = "ready";
                Progress = 100;
                Message = "Backend v4 listo para compilar.";
                LastError = "";
            }
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("Backend listo. La página ya puede enviar project.zip.");
            Console.ResetColor();
        }
        catch (Exception ex)
        {
            lock (StateLock)
            {
                BackendReady = false;
                Stage = "error";
                Message = "No se pudo preparar el backend v4.";
                LastError = ex.Message;
            }
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Backend error: " + ex.Message);
            Console.ResetColor();
        }
    }

    private static void SetState(string stage, int progress, string message, string error)
    {
        lock (StateLock)
        {
            Stage = stage;
            Progress = Math.Max(0, Math.Min(100, progress));
            Message = message ?? "";
            LastError = error ?? "";
        }
    }

    private static string ResolveBackend(bool verbose)
    {
        string overridePath = Environment.GetEnvironmentVariable("TNS_TOOL_COMPILER_EXE");
        if (!string.IsNullOrWhiteSpace(overridePath) && File.Exists(overridePath))
        {
            if (EnsureUsableBackend(overridePath, verbose)) return Path.GetFullPath(overridePath);
        }

        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string installed = Path.Combine(local, "TNS Tool Compiler", "TNS-Tool-Compiler.exe");
        if (File.Exists(installed) && EnsureUsableBackend(installed, verbose)) return installed;

        string cacheDir = Path.Combine(local, "Ndless Web Compiler", "backend-v4");
        Directory.CreateDirectory(cacheDir);
        string cached = Path.Combine(cacheDir, "TNS-Tool-Compiler-Windows-x64.exe");

        if (File.Exists(cached))
        {
            SetState("verifying", 100, "Verificando backend v4 almacenado...", "");
            if (string.Equals(Sha256(cached), BackendSha256, StringComparison.OrdinalIgnoreCase))
            {
                if (EnsureUsableBackend(cached, verbose)) return cached;
            }
            try { File.Delete(cached); } catch { }
        }

        SetState("downloading", 0, "Descargando backend v4 (~262 MB)...", "");
        DownloadBackend(cached, verbose);
        SetState("verifying", 100, "Verificando SHA-256 del backend...", "");
        string hash = Sha256(cached);
        if (!string.Equals(hash, BackendSha256, StringComparison.OrdinalIgnoreCase))
        {
            try { File.Delete(cached); } catch { }
            throw new InvalidDataException("SHA-256 incorrecto para TNS Tool Compiler v4.");
        }

        if (!EnsureUsableBackend(cached, verbose))
            throw new InvalidDataException("TNS Tool Compiler v4 se descargó, pero su runtime no quedó listo después de repararlo.");
        return cached;
    }

    private static bool EnsureUsableBackend(string path, bool verbose)
    {
        SetState("preparing-runtime", 100, "Preparando runtime ARM/Ndless...", "");
        if (IsUsableBackend(path)) return true;

        string runtime = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TNS Tool Compiler", "runtime", "runtime-0.2.2");
        try
        {
            if (Directory.Exists(runtime))
            {
                if (verbose) Console.WriteLine("Reparando runtime-0.2.2...");
                SetState("repairing-runtime", 100, "Reparando runtime-0.2.2...", "");
                Directory.Delete(runtime, true);
            }
        }
        catch { }
        return IsUsableBackend(path);
    }

    private static bool IsUsableBackend(string path)
    {
        try
        {
            var psi = new ProcessStartInfo();
            psi.FileName = path;
            psi.Arguments = "--status-json";
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.CreateNoWindow = true;
            using (Process p = Process.Start(psi))
            {
                if (p == null) return false;
                string output = p.StandardOutput.ReadToEnd();
                p.StandardError.ReadToEnd();
                if (!p.WaitForExit(240000)) { try { p.Kill(); } catch { } return false; }
                if (p.ExitCode != 0) return false;
                Match version = Regex.Match(output, "\\\"version\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
                Match ready = Regex.Match(output, "\\\"toolchainReady\\\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
                return version.Success && ready.Success && CompareVersions(version.Groups[1].Value, BackendVersion) >= 0 && string.Equals(ready.Groups[1].Value, "true", StringComparison.OrdinalIgnoreCase);
            }
        }
        catch { return false; }
    }

    private static int CompareVersions(string left, string right)
    {
        string[] a = Regex.Split(left ?? "0", "[^0-9]+");
        string[] b = Regex.Split(right ?? "0", "[^0-9]+");
        int count = Math.Max(a.Length, b.Length);
        for (int i = 0; i < count; i++)
        {
            int av = i < a.Length && a[i].Length > 0 ? SafeInt(a[i]) : 0;
            int bv = i < b.Length && b[i].Length > 0 ? SafeInt(b[i]) : 0;
            if (av != bv) return av < bv ? -1 : 1;
        }
        return 0;
    }

    private static int SafeInt(string value) { int n; return int.TryParse(value, out n) ? n : 0; }

    private static void DownloadBackend(string destination, bool verbose)
    {
        string partial = destination + ".part";
        try { File.Delete(partial); } catch { }
        HttpWebRequest request = (HttpWebRequest)WebRequest.Create(BackendUrl);
        request.Method = "GET";
        request.AllowAutoRedirect = true;
        request.UserAgent = "NdlessWebCompiler/" + LauncherVersion;
        request.Timeout = 60000;
        request.ReadWriteTimeout = 60000;

        using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
        using (Stream input = response.GetResponseStream())
        using (FileStream output = new FileStream(partial, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            if (input == null) throw new IOException("GitHub no devolvió el backend v4.");
            long total = response.ContentLength;
            long done = 0;
            byte[] buffer = new byte[1024 * 1024];
            int last = -1;
            while (true)
            {
                int read = input.Read(buffer, 0, buffer.Length);
                if (read <= 0) break;
                output.Write(buffer, 0, read);
                done += read;
                int percent = total > 0 ? (int)(done * 100L / total) : 0;
                if (percent != last)
                {
                    last = percent;
                    SetState("downloading", percent, "Descargando backend v4: " + percent + "%", "");
                    if (verbose) Console.Write("\rDescargando backend: {0,3}%", percent);
                }
            }
            output.Flush(true);
        }
        if (verbose) Console.WriteLine();
        if (File.Exists(destination)) File.Delete(destination);
        File.Move(partial, destination);
    }

    private static string Sha256(string path)
    {
        using (SHA256 sha = SHA256.Create())
        using (FileStream stream = File.OpenRead(path))
        {
            byte[] hash = sha.ComputeHash(stream);
            StringBuilder text = new StringBuilder(hash.Length * 2);
            foreach (byte b in hash) text.Append(b.ToString("x2"));
            return text.ToString();
        }
    }

    private sealed class HttpRequest
    {
        public string Method;
        public string Path;
        public Dictionary<string, string> Headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        public byte[] Body = new byte[0];
    }

    private static void HandleClient(TcpClient client)
    {
        using (client)
        {
            try
            {
                client.ReceiveTimeout = 20000;
                client.SendTimeout = 240000;
                using (NetworkStream stream = client.GetStream())
                {
                    HttpRequest request = ReadRequest(stream);
                    string origin = HeaderValue(request, "Origin");
                    if (!OriginAllowed(origin))
                    {
                        WriteJson(stream, 403, "Forbidden", "{\"ok\":false,\"code\":\"ORIGIN_REJECTED\"}", origin);
                        return;
                    }
                    if (string.Equals(request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
                    {
                        WriteJson(stream, 204, "No Content", "{}", origin);
                        return;
                    }
                    if (request.Method == "GET" && (request.Path == "/v2/status" || request.Path == "/v1/status"))
                    {
                        WriteJson(stream, 200, "OK", StatusJson(), origin);
                        return;
                    }
                    if (request.Method == "POST" && request.Path == "/v2/build")
                    {
                        HandleBuild(stream, request, origin);
                        return;
                    }
                    WriteJson(stream, 404, "Not Found", "{\"ok\":false,\"code\":\"NOT_FOUND\"}", origin);
                }
            }
            catch (Exception ex)
            {
                try
                {
                    using (NetworkStream stream = client.GetStream())
                        WriteJson(stream, 500, "Internal Server Error", "{\"ok\":false,\"code\":\"SERVER_ERROR\",\"message\":\"" + JsonEscape(ex.Message) + "\"}", null);
                }
                catch { }
            }
        }
    }

    private static HttpRequest ReadRequest(NetworkStream stream)
    {
        MemoryStream all = new MemoryStream();
        byte[] buffer = new byte[8192];
        int headerEnd = -1;
        while (headerEnd < 0)
        {
            int read = stream.Read(buffer, 0, buffer.Length);
            if (read <= 0) throw new IOException("HTTP request ended before headers.");
            all.Write(buffer, 0, read);
            if (all.Length > 128 * 1024) throw new InvalidDataException("HTTP headers are too large.");
            byte[] current = all.ToArray();
            headerEnd = FindHeaderEnd(current);
        }

        byte[] raw = all.ToArray();
        string headerText = Encoding.ASCII.GetString(raw, 0, headerEnd);
        string[] lines = headerText.Split(new string[] { "\r\n" }, StringSplitOptions.None);
        if (lines.Length == 0) throw new InvalidDataException("Invalid HTTP request.");
        string[] first = lines[0].Split(' ');
        if (first.Length < 2) throw new InvalidDataException("Invalid HTTP request line.");

        HttpRequest request = new HttpRequest();
        request.Method = first[0].ToUpperInvariant();
        request.Path = first[1];
        int q = request.Path.IndexOf('?');
        if (q >= 0) request.Path = request.Path.Substring(0, q);
        for (int i = 1; i < lines.Length; i++)
        {
            int colon = lines[i].IndexOf(':');
            if (colon <= 0) continue;
            request.Headers[lines[i].Substring(0, colon).Trim()] = lines[i].Substring(colon + 1).Trim();
        }

        int contentLength = 0;
        string lengthText;
        if (request.Headers.TryGetValue("Content-Length", out lengthText)) int.TryParse(lengthText, out contentLength);
        if (contentLength < 0 || contentLength > MaxRequestBytes) throw new InvalidDataException("Project ZIP is too large.");
        request.Body = new byte[contentLength];
        int bodyStart = headerEnd + 4;
        int already = Math.Min(contentLength, raw.Length - bodyStart);
        if (already > 0) Buffer.BlockCopy(raw, bodyStart, request.Body, 0, already);
        int offset = already;
        while (offset < contentLength)
        {
            int read = stream.Read(request.Body, offset, contentLength - offset);
            if (read <= 0) throw new IOException("HTTP request body ended early.");
            offset += read;
        }
        return request;
    }

    private static int FindHeaderEnd(byte[] data)
    {
        for (int i = 0; i + 3 < data.Length; i++)
            if (data[i] == 13 && data[i + 1] == 10 && data[i + 2] == 13 && data[i + 3] == 10) return i;
        return -1;
    }

    private static string HeaderValue(HttpRequest request, string name)
    {
        string value;
        return request.Headers.TryGetValue(name, out value) ? value : "";
    }

    private static bool OriginAllowed(string origin)
    {
        if (string.IsNullOrEmpty(origin)) return true;
        return origin == "https://acewalt.github.io" || origin.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase) || origin.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase) || origin.StartsWith("https://localhost", StringComparison.OrdinalIgnoreCase);
    }

    private static string StatusJson()
    {
        lock (StateLock)
        {
            return "{" +
                "\"bridge\":true," +
                "\"compiler\":true," +
                "\"protocol\":2," +
                "\"version\":\"" + BackendVersion + "\"," +
                "\"launcherVersion\":\"" + LauncherVersion + "\"," +
                "\"platform\":\"windows\"," +
                "\"toolchainReady\":" + (BackendReady ? "true" : "false") + "," +
                "\"selfContained\":true," +
                "\"transport\":\"zip\"," +
                "\"listen\":\"127.0.0.1:" + Port + "\"," +
                "\"stage\":\"" + JsonEscape(Stage) + "\"," +
                "\"progress\":" + Progress + "," +
                "\"message\":\"" + JsonEscape(Message) + "\"," +
                "\"missing\":[] ," +
                "\"error\":\"" + JsonEscape(LastError) + "\"" +
                "}";
        }
    }

    private static void HandleBuild(NetworkStream stream, HttpRequest request, string origin)
    {
        bool ready;
        string backend;
        lock (StateLock) { ready = BackendReady; backend = BackendPath; }
        if (!ready || string.IsNullOrEmpty(backend))
        {
            WriteJson(stream, 503, "Service Unavailable", "{\"ok\":false,\"code\":\"LOCAL_TOOLCHAIN_PREPARING\",\"message\":\"El backend todavía se está preparando.\"}", origin);
            return;
        }
        if (request.Body == null || request.Body.Length == 0)
        {
            WriteJson(stream, 400, "Bad Request", "{\"ok\":false,\"code\":\"ZIP_REQUIRED\"}", origin);
            return;
        }

        lock (BuildLock)
        {
            string temp = Path.Combine(Path.GetTempPath(), "NdlessWebCompiler", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(temp);
            try
            {
                string zip = Path.Combine(temp, "project.zip");
                string output = Path.Combine(temp, "program.tns");
                File.WriteAllBytes(zip, request.Body);
                string name = SanitizeName(HeaderValue(request, "X-TNS-Project-Name"));
                if (string.IsNullOrEmpty(name)) name = "ndless-app";

                SetState("building", 100, "Compilando " + name + "...", "");
                string details;
                int exit = RunBackendBuild(backend, zip, output, name, out details);
                if (exit != 0 || !File.Exists(output))
                {
                    SetState("ready", 100, "Backend v4 listo para compilar.", "");
                    WriteJson(stream, 422, "Unprocessable Entity", "{\"ok\":false,\"code\":\"BACKEND_BUILD_FAILED\",\"message\":\"La compilación falló.\",\"details\":\"" + JsonEscape(details) + "\"}", origin);
                    return;
                }
                byte[] bytes = File.ReadAllBytes(output);
                if (bytes.Length < 4 || bytes[0] != (byte)'Z' || bytes[1] != (byte)'e' || bytes[2] != (byte)'h' || bytes[3] != (byte)'n')
                    throw new InvalidDataException("El backend devolvió un TNS que no es Zehn.");

                SetState("ready", 100, "Backend v4 listo para compilar.", "");
                WriteBinary(stream, 200, "OK", bytes, name + ".tns", origin);
            }
            catch (Exception ex)
            {
                SetState("ready", 100, "Backend v4 listo para compilar.", "");
                WriteJson(stream, 500, "Internal Server Error", "{\"ok\":false,\"code\":\"BUILD_ERROR\",\"message\":\"" + JsonEscape(ex.Message) + "\"}", origin);
            }
            finally
            {
                try { Directory.Delete(temp, true); } catch { }
            }
        }
    }

    private static int RunBackendBuild(string backend, string zip, string output, string name, out string details)
    {
        var psi = new ProcessStartInfo();
        psi.FileName = backend;
        psi.Arguments = "--build-zip " + Quote(zip) + " " + Quote(output) + " " + Quote(name);
        psi.UseShellExecute = false;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.CreateNoWindow = true;
        using (Process p = Process.Start(psi))
        {
            if (p == null) { details = "No se pudo iniciar el backend."; return -1; }
            string stdout = p.StandardOutput.ReadToEnd();
            string stderr = p.StandardError.ReadToEnd();
            if (!p.WaitForExit(240000))
            {
                try { p.Kill(); } catch { }
                details = "Tiempo de compilación agotado.";
                return -2;
            }
            details = (stdout + "\n" + stderr).Trim();
            return p.ExitCode;
        }
    }

    private static void CompileZip(string zipPath, string backend)
    {
        if (!File.Exists(zipPath)) throw new FileNotFoundException("No existe el ZIP.", zipPath);
        string directory = Path.GetDirectoryName(zipPath) ?? Environment.CurrentDirectory;
        string name = Path.GetFileNameWithoutExtension(zipPath);
        string output = Path.Combine(directory, name + ".tns");
        if (File.Exists(output)) output = Path.Combine(directory, name + "_compiled.tns");
        string details;
        int exit = RunBackendBuild(backend, zipPath, output, name, out details);
        if (exit != 0) throw new Exception(details);
        Console.WriteLine("[OK] " + output);
    }

    private static string SanitizeName(string value)
    {
        string input = value ?? "";
        StringBuilder result = new StringBuilder();
        foreach (char c in input)
        {
            if (char.IsLetterOrDigit(c) || c == '.' || c == '_' || c == '-') result.Append(c);
            else if (result.Length == 0 || result[result.Length - 1] != '-') result.Append('-');
        }
        return result.ToString().Trim('-');
    }

    private static string Quote(string value) { return "\"" + (value ?? "").Replace("\"", "\\\"") + "\""; }

    private static string JsonEscape(string value)
    {
        return (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n");
    }

    private static void WriteJson(NetworkStream stream, int code, string reason, string json, string origin)
    {
        byte[] body = Encoding.UTF8.GetBytes(json ?? "{}");
        WriteHeaders(stream, code, reason, "application/json; charset=utf-8", body.Length, origin, null);
        if (body.Length > 0) stream.Write(body, 0, body.Length);
    }

    private static void WriteBinary(NetworkStream stream, int code, string reason, byte[] body, string filename, string origin)
    {
        WriteHeaders(stream, code, reason, "application/octet-stream", body.Length, origin, filename);
        stream.Write(body, 0, body.Length);
    }

    private static void WriteHeaders(NetworkStream stream, int code, string reason, string contentType, int length, string origin, string filename)
    {
        StringBuilder h = new StringBuilder();
        h.Append("HTTP/1.1 ").Append(code).Append(' ').Append(reason).Append("\r\n");
        h.Append("Content-Type: ").Append(contentType).Append("\r\n");
        h.Append("Content-Length: ").Append(length).Append("\r\n");
        h.Append("Cache-Control: no-store\r\n");
        h.Append("Connection: close\r\n");
        h.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
        h.Append("Access-Control-Allow-Headers: Content-Type, X-TNS-Tool-Protocol, X-TNS-Project-Name, X-TNS-Project-Target, X-TNS-Project-Language, X-TNS-Project-Template\r\n");
        h.Append("Access-Control-Expose-Headers: X-TNS-Filename, X-TNS-Platform, X-TNS-Duration-Ms\r\n");
        h.Append("Access-Control-Allow-Private-Network: true\r\n");
        if (!string.IsNullOrEmpty(origin)) h.Append("Access-Control-Allow-Origin: ").Append(origin).Append("\r\nVary: Origin\r\n");
        if (!string.IsNullOrEmpty(filename))
        {
            h.Append("X-TNS-Filename: ").Append(filename).Append("\r\n");
            h.Append("X-TNS-Platform: windows\r\n");
        }
        h.Append("\r\n");
        byte[] bytes = Encoding.ASCII.GetBytes(h.ToString());
        stream.Write(bytes, 0, bytes.Length);
    }
}