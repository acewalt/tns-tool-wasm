using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

internal static class Program
{
    private const string Version = "2.1.0";
    private const string CompilerVersion = "0.2.2";
    private const string CompilerTag = "tns-tool-compiler-v4";
    private const string CompilerUrl = "https://github.com/acewalt/tns-tool-wasm/releases/download/tns-tool-compiler-v4/TNS-Tool-Compiler-Windows-x64.exe";
    private const string CompilerSha256 = "b7de803d2fbd9799689cf7cdf1f7c8575d712dd57f6755ba36b16c04c07fdb2f";
    private const string CompilerFileName = "TNS-Tool-Compiler-Windows-x64.exe";

    private static int Main(string[] rawArgs)
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.Title = "Ndless ZIP Compiler v4";
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;

        var args = new List<string>();
        bool pause = true;
        foreach (string arg in rawArgs)
        {
            if (string.Equals(arg, "--no-pause", StringComparison.OrdinalIgnoreCase)) pause = false;
            else args.Add(arg);
        }

        if (args.Count == 1 && string.Equals(args[0], "--self-test", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine("NdlessZipCompiler " + Version);
            Console.WriteLine("compiler=" + CompilerVersion);
            Console.WriteLine("tag=" + CompilerTag);
            Console.WriteLine("sha256=" + CompilerSha256);
            return 0;
        }

        if (args.Count == 0)
        {
            PrintHeader();
            Console.WriteLine("Arrastra uno o varios ZIP de proyectos Ndless sobre este EXE.");
            Console.WriteLine("No necesita carpeta sdk ni configurar variables.");
            Console.WriteLine();
            Console.WriteLine("La primera vez descarga TNS Tool Compiler v4 (~262 MB),");
            Console.WriteLine("verifica SHA-256 y lo reutiliza después.");
            Console.WriteLine();
            Console.WriteLine("La salida actual es Modern Zehn .tns.");
            if (pause) Pause();
            return 0;
        }

        try
        {
            PrintHeader();
            string compiler = ResolveCompiler();
            Console.WriteLine();
            Console.WriteLine("Compilador: " + compiler);
            Console.WriteLine();

            int failures = 0;
            foreach (string arg in args)
            {
                try { CompileOne(Path.GetFullPath(arg), compiler); }
                catch (Exception ex)
                {
                    failures++;
                    WriteColor(ConsoleColor.Red, "[ERROR] " + Path.GetFileName(arg));
                    Console.WriteLine(ex.Message);
                    Console.WriteLine();
                }
            }

            if (failures == 0) WriteColor(ConsoleColor.Green, "Todas las compilaciones terminaron correctamente.");
            else WriteColor(ConsoleColor.Yellow, "Terminado con " + failures + " error(es).");
            if (pause) Pause();
            return failures == 0 ? 0 : 1;
        }
        catch (Exception ex)
        {
            WriteColor(ConsoleColor.Red, "No se pudo preparar TNS Tool Compiler v4.");
            Console.WriteLine(ex.Message);
            if (pause) Pause();
            return 2;
        }
    }

    private static void PrintHeader()
    {
        Console.WriteLine("========================================");
        Console.WriteLine(" Ndless ZIP Compiler " + Version);
        Console.WriteLine(" ZIP -> Modern Zehn .tns");
        Console.WriteLine(" backend Windows corregido: " + CompilerVersion);
        Console.WriteLine("========================================");
        Console.WriteLine();
    }

    private static string ResolveCompiler()
    {
        string overridePath = Environment.GetEnvironmentVariable("TNS_TOOL_COMPILER_EXE");
        if (!string.IsNullOrWhiteSpace(overridePath) && File.Exists(overridePath))
        {
            if (!IsUsableCompiler(overridePath)) throw new InvalidDataException("TNS_TOOL_COMPILER_EXE no es un compilador 0.2.2+ listo para usar.");
            Console.WriteLine("Usando TNS_TOOL_COMPILER_EXE.");
            return Path.GetFullPath(overridePath);
        }

        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string installed = Path.Combine(localAppData, "TNS Tool Compiler", "TNS-Tool-Compiler.exe");
        if (File.Exists(installed) && IsUsableCompiler(installed))
        {
            WriteColor(ConsoleColor.Green, "TNS Tool Compiler " + CompilerVersion + "+ ya está instalado.");
            return installed;
        }

        if (File.Exists(installed))
            WriteColor(ConsoleColor.Yellow, "El compilador instalado es anterior a 0.2.2 o no está listo; se usará v4 corregido.");

        string cacheDir = Path.Combine(localAppData, "Ndless ZIP Compiler", "compiler-v4");
        Directory.CreateDirectory(cacheDir);
        string cached = Path.Combine(cacheDir, CompilerFileName);

        if (File.Exists(cached))
        {
            Console.Write("Verificando compilador v4 almacenado... ");
            if (string.Equals(Sha256(cached), CompilerSha256, StringComparison.OrdinalIgnoreCase) && IsUsableCompiler(cached))
            {
                WriteColor(ConsoleColor.Green, "OK");
                return cached;
            }
            WriteColor(ConsoleColor.Yellow, "no válido; se descargará otra vez.");
            try { File.Delete(cached); } catch { }
        }

        Console.WriteLine("Descargando TNS Tool Compiler v4 corregido:");
        Console.WriteLine(CompilerUrl);
        Console.WriteLine();
        DownloadCompiler(cached);

        Console.Write("Verificando SHA-256... ");
        string hash = Sha256(cached);
        if (!string.Equals(hash, CompilerSha256, StringComparison.OrdinalIgnoreCase))
        {
            try { File.Delete(cached); } catch { }
            throw new InvalidDataException("SHA-256 incorrecto.\nEsperado: " + CompilerSha256 + "\nObtenido: " + hash);
        }
        WriteColor(ConsoleColor.Green, "OK");

        if (!IsUsableCompiler(cached))
            throw new InvalidDataException("La release v4 se descargó correctamente, pero su runtime no quedó listo.");
        return cached;
    }

    private static bool IsUsableCompiler(string path)
    {
        try
        {
            var psi = new ProcessStartInfo {
                FileName = path,
                Arguments = "--status-json",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            using (var process = Process.Start(psi))
            {
                if (process == null) return false;
                string output = process.StandardOutput.ReadToEnd();
                process.StandardError.ReadToEnd();
                if (!process.WaitForExit(120000)) { try { process.Kill(); } catch { } return false; }
                if (process.ExitCode != 0) return false;
                Match version = Regex.Match(output, "\\\"version\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
                Match ready = Regex.Match(output, "\\\"toolchainReady\\\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
                return version.Success && ready.Success
                    && CompareVersions(version.Groups[1].Value, CompilerVersion) >= 0
                    && string.Equals(ready.Groups[1].Value, "true", StringComparison.OrdinalIgnoreCase);
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
            int av = i < a.Length && a[i].Length != 0 ? SafeInt(a[i]) : 0;
            int bv = i < b.Length && b[i].Length != 0 ? SafeInt(b[i]) : 0;
            if (av != bv) return av < bv ? -1 : 1;
        }
        return 0;
    }

    private static int SafeInt(string value) { int result; return int.TryParse(value, out result) ? result : 0; }

    private static void DownloadCompiler(string destination)
    {
        string partial = destination + ".part";
        try { File.Delete(partial); } catch { }
        var request = (HttpWebRequest)WebRequest.Create(CompilerUrl);
        request.Method = "GET";
        request.AllowAutoRedirect = true;
        request.UserAgent = "NdlessZipCompiler/" + Version;
        request.Timeout = 60000;
        request.ReadWriteTimeout = 60000;

        using (var response = (HttpWebResponse)request.GetResponse())
        using (Stream input = response.GetResponseStream())
        using (var output = new FileStream(partial, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            if (input == null) throw new IOException("GitHub no devolvió el compilador.");
            long total = response.ContentLength, done = 0;
            int lastPercent = -1;
            var buffer = new byte[1024 * 1024];
            while (true)
            {
                int read = input.Read(buffer, 0, buffer.Length);
                if (read <= 0) break;
                output.Write(buffer, 0, read); done += read;
                if (total > 0)
                {
                    int percent = (int)(done * 100L / total);
                    if (percent != lastPercent)
                    {
                        Console.Write("\rDescargando: {0,3}%  {1,7:0.0} / {2,7:0.0} MB", percent, done / 1048576.0, total / 1048576.0);
                        lastPercent = percent;
                    }
                }
            }
            output.Flush(true);
            Console.WriteLine();
        }
        if (File.Exists(destination)) File.Delete(destination);
        File.Move(partial, destination);
    }

    private static void CompileOne(string zipPath, string compiler)
    {
        if (!File.Exists(zipPath)) throw new FileNotFoundException("No existe el archivo.", zipPath);
        if (!zipPath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Solo se aceptan archivos .zip.");

        string directory = Path.GetDirectoryName(zipPath) ?? Environment.CurrentDirectory;
        string projectName = Path.GetFileNameWithoutExtension(zipPath);
        string output = UniqueOutput(Path.Combine(directory, projectName + ".tns"));
        WriteColor(ConsoleColor.Cyan, "=== " + Path.GetFileName(zipPath) + " ===");
        Console.WriteLine("Salida: " + output);
        Console.WriteLine("Compilando con backend Zehn canónico...");
        Console.WriteLine();

        var psi = new ProcessStartInfo {
            FileName = compiler,
            Arguments = "--build-zip " + Quote(zipPath) + " " + Quote(output) + " " + Quote(projectName),
            WorkingDirectory = directory,
            UseShellExecute = false,
            CreateNoWindow = false
        };
        using (var process = Process.Start(psi))
        {
            if (process == null) throw new InvalidOperationException("Windows no pudo iniciar TNS Tool Compiler.");
            process.WaitForExit();
            if (process.ExitCode != 0)
            {
                try { if (File.Exists(output)) File.Delete(output); } catch { }
                throw new Exception("TNS Tool Compiler terminó con código " + process.ExitCode + ".");
            }
        }

        ValidateCanonicalZehn(output);
        WriteColor(ConsoleColor.Green, "[OK] Zehn canónico validado: " + output + " (" + new FileInfo(output).Length + " bytes)");
        Console.WriteLine();
    }

    private static void ValidateCanonicalZehn(string path)
    {
        byte[] b = File.ReadAllBytes(path);
        if (b.Length < 38) throw new InvalidDataException("El .tns generado está vacío o truncado.");
        if (Encoding.ASCII.GetString(b, 0, 4) != "Zehn") throw new InvalidDataException("Falta la firma Zehn.");
        uint version = U32(b, 4), fileSize = U32(b, 8), relocCount = U32(b, 12), flagCount = U32(b, 16), extraSize = U32(b, 20), entry = U32(b, 28);
        if (version != 1) throw new InvalidDataException("Versión Zehn inesperada: " + version + ".");
        if (fileSize != b.Length) throw new InvalidDataException("Zehn file_size no coincide con el tamaño real: " + fileSize + " vs " + b.Length + ".");
        if (relocCount == 0) throw new InvalidDataException("El Zehn comprimido no contiene FILE_COMPRESSED.");
        ulong payloadOffset64 = 32UL + 4UL * ((ulong)relocCount + (ulong)flagCount) + (ulong)extraSize;
        if (payloadOffset64 + 2UL > (ulong)b.Length) throw new InvalidDataException("Las tablas Zehn apuntan fuera del archivo.");
        int payloadOffset = (int)payloadOffset64;
        uint firstReloc = U32(b, 32);
        if ((firstReloc & 0xFFU) != 3U || (firstReloc >> 8) != 0U) throw new InvalidDataException("El primer relocation no es FILE_COMPRESSED/ZLIB.");

        byte cmf = b[payloadOffset], flg = b[payloadOffset + 1];
        bool zlibHeader = (cmf & 0x0F) == 8 && (cmf >> 4) <= 7 && ((((int)cmf << 8) | flg) % 31) == 0;
        if (!zlibHeader)
        {
            throw new InvalidDataException(
                "El payload calculado no empieza con una cabecera zlib válida. " +
                "Esto suele indicar un genzehn Windows antiguo con tablas de 5 bytes. " +
                "payloadOffset=0x" + payloadOffset.ToString("X") + ", head=" + cmf.ToString("X2") + " " + flg.ToString("X2") + ".");
        }
        if (entry >= fileSize) throw new InvalidDataException("Entry Zehn inválido.");
        Console.WriteLine("Validación: reloc=" + relocCount + ", flags=" + flagCount + ", payload=0x" + payloadOffset.ToString("X") + ", zlib=" + cmf.ToString("X2") + " " + flg.ToString("X2"));
    }

    private static uint U32(byte[] b, int o)
    {
        if (o < 0 || o + 4 > b.Length) throw new InvalidDataException("Lectura Zehn fuera de rango.");
        return (uint)(b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24));
    }

    private static string UniqueOutput(string preferred)
    {
        if (!File.Exists(preferred)) return preferred;
        string dir = Path.GetDirectoryName(preferred) ?? Environment.CurrentDirectory;
        string name = Path.GetFileNameWithoutExtension(preferred), ext = Path.GetExtension(preferred);
        string first = Path.Combine(dir, name + "_compiled" + ext);
        if (!File.Exists(first)) return first;
        for (int i = 2; i < 10000; i++) { string c = Path.Combine(dir, name + "_compiled_" + i + ext); if (!File.Exists(c)) return c; }
        return Path.Combine(dir, name + "_" + Guid.NewGuid().ToString("N") + ext);
    }

    private static string Sha256(string path)
    {
        using (var stream = File.OpenRead(path))
        using (SHA256 sha = SHA256.Create())
        {
            byte[] hash = sha.ComputeHash(stream); var sb = new StringBuilder(hash.Length * 2);
            foreach (byte x in hash) sb.Append(x.ToString("x2")); return sb.ToString();
        }
    }

    private static string Quote(string value)
    {
        if (value == null) return "\"\"";
        var sb = new StringBuilder(); sb.Append('"'); int slashes = 0;
        foreach (char c in value)
        {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') { sb.Append('\\', slashes * 2 + 1); sb.Append('"'); slashes = 0; continue; }
            if (slashes != 0) { sb.Append('\\', slashes); slashes = 0; }
            sb.Append(c);
        }
        if (slashes != 0) sb.Append('\\', slashes * 2); sb.Append('"'); return sb.ToString();
    }

    private static void WriteColor(ConsoleColor color, string text)
    {
        ConsoleColor old = Console.ForegroundColor;
        try { Console.ForegroundColor = color; Console.WriteLine(text); }
        finally { Console.ForegroundColor = old; }
    }

    private static void Pause() { Console.WriteLine(); Console.Write("Pulsa Enter para cerrar..."); Console.ReadLine(); }
}
