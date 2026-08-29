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
    private const string Version = "2.0.0";
    private const string CompilerVersion = "0.2.1";
    private const string CompilerUrl = "https://github.com/acewalt/tns-tool-wasm/releases/download/tns-tool-compiler-v3/TNS-Tool-Compiler-Windows-x64.exe";
    private const string CompilerSha256 = "d4fcf740418abdd1f7edaa009b52b63ddae6c496306803c2fb1497b517420008";
    private const string CompilerFileName = "TNS-Tool-Compiler-Windows-x64.exe";

    private static int Main(string[] rawArgs)
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.Title = "Ndless ZIP Compiler";
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2

        var args = new List<string>();
        bool pause = true;
        foreach (string arg in rawArgs)
        {
            if (string.Equals(arg, "--no-pause", StringComparison.OrdinalIgnoreCase))
                pause = false;
            else
                args.Add(arg);
        }

        if (args.Count == 1 && string.Equals(args[0], "--self-test", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine("NdlessZipCompiler " + Version);
            Console.WriteLine("compiler=" + CompilerVersion);
            Console.WriteLine("sha256=" + CompilerSha256);
            return 0;
        }

        if (args.Count == 0)
        {
            PrintHeader();
            Console.WriteLine("Arrastra uno o varios archivos .zip de proyectos Ndless sobre este EXE.");
            Console.WriteLine();
            Console.WriteLine("No necesita una carpeta sdk.");
            Console.WriteLine("La primera vez descargará automáticamente TNS Tool Compiler v3 (~262 MB),");
            Console.WriteLine("verificará su SHA-256 y lo reutilizará en compilaciones posteriores.");
            Console.WriteLine();
            Console.WriteLine("Salida: el .tns se crea junto al ZIP.");
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
                try
                {
                    CompileOne(Path.GetFullPath(arg), compiler);
                }
                catch (Exception ex)
                {
                    failures++;
                    WriteColor(ConsoleColor.Red, "[ERROR] " + Path.GetFileName(arg));
                    Console.WriteLine(ex.Message);
                    Console.WriteLine();
                }
            }

            if (failures == 0)
                WriteColor(ConsoleColor.Green, "Todas las compilaciones terminaron correctamente.");
            else
                WriteColor(ConsoleColor.Yellow, "Terminado con " + failures + " error(es).");

            if (pause) Pause();
            return failures == 0 ? 0 : 1;
        }
        catch (Exception ex)
        {
            WriteColor(ConsoleColor.Red, "No se pudo preparar el compilador local.");
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
        Console.WriteLine("========================================");
        Console.WriteLine();
    }

    private static string ResolveCompiler()
    {
        string overridePath = Environment.GetEnvironmentVariable("TNS_TOOL_COMPILER_EXE");
        if (!string.IsNullOrWhiteSpace(overridePath) && File.Exists(overridePath))
        {
            Console.WriteLine("Usando TNS_TOOL_COMPILER_EXE.");
            return Path.GetFullPath(overridePath);
        }

        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string installed = Path.Combine(localAppData, "TNS Tool Compiler", "TNS-Tool-Compiler.exe");
        if (File.Exists(installed) && IsUsableCompiler(installed))
        {
            WriteColor(ConsoleColor.Green, "TNS Tool Compiler " + CompilerVersion + " ya está instalado.");
            return installed;
        }

        string cacheDir = Path.Combine(localAppData, "Ndless ZIP Compiler", "compiler-v3");
        Directory.CreateDirectory(cacheDir);
        string cached = Path.Combine(cacheDir, CompilerFileName);

        if (File.Exists(cached))
        {
            Console.Write("Verificando compilador almacenado... ");
            string hash = Sha256(cached);
            if (string.Equals(hash, CompilerSha256, StringComparison.OrdinalIgnoreCase))
            {
                WriteColor(ConsoleColor.Green, "OK");
                return cached;
            }

            WriteColor(ConsoleColor.Yellow, "hash incorrecto; se descargará otra vez.");
            try { File.Delete(cached); } catch { }
        }

        Console.WriteLine("No hay un compilador v3 utilizable en este equipo.");
        Console.WriteLine("Descargando una sola vez:");
        Console.WriteLine(CompilerUrl);
        Console.WriteLine();
        DownloadCompiler(cached);

        Console.Write("Verificando SHA-256... ");
        string downloadedHash = Sha256(cached);
        if (!string.Equals(downloadedHash, CompilerSha256, StringComparison.OrdinalIgnoreCase))
        {
            try { File.Delete(cached); } catch { }
            throw new InvalidDataException(
                "La descarga del compilador no coincide con la release oficial.\n" +
                "Esperado: " + CompilerSha256 + "\n" +
                "Obtenido: " + downloadedHash);
        }
        WriteColor(ConsoleColor.Green, "OK");
        return cached;
    }

    private static bool IsUsableCompiler(string path)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
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
                if (!process.WaitForExit(90000))
                {
                    try { process.Kill(); } catch { }
                    return false;
                }
                if (process.ExitCode != 0) return false;

                Match version = Regex.Match(output, "\\\"version\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
                Match ready = Regex.Match(output, "\\\"toolchainReady\\\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
                if (!version.Success || !ready.Success) return false;
                return CompareVersions(version.Groups[1].Value, CompilerVersion) >= 0
                    && string.Equals(ready.Groups[1].Value, "true", StringComparison.OrdinalIgnoreCase);
            }
        }
        catch
        {
            return false;
        }
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

    private static int SafeInt(string value)
    {
        int result;
        return int.TryParse(value, out result) ? result : 0;
    }

    private static void DownloadCompiler(string destination)
    {
        string partial = destination + ".part";
        try { File.Delete(partial); } catch { }

        var request = (HttpWebRequest)WebRequest.Create(CompilerUrl);
        request.Method = "GET";
        request.AllowAutoRedirect = true;
        request.UserAgent = "NdlessZipCompiler/" + Version;
        request.Timeout = 30000;
        request.ReadWriteTimeout = 30000;
        request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

        using (var response = (HttpWebResponse)request.GetResponse())
        using (Stream input = response.GetResponseStream())
        using (var output = new FileStream(partial, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            if (input == null) throw new IOException("GitHub no devolvió el contenido del compilador.");
            long total = response.ContentLength;
            long done = 0;
            int lastPercent = -1;
            var buffer = new byte[1024 * 1024];
            while (true)
            {
                int read = input.Read(buffer, 0, buffer.Length);
                if (read <= 0) break;
                output.Write(buffer, 0, read);
                done += read;

                if (total > 0)
                {
                    int percent = (int)(done * 100L / total);
                    if (percent != lastPercent)
                    {
                        Console.Write("\rDescargando: {0,3}%  {1,7:0.0} / {2,7:0.0} MB", percent, done / 1048576.0, total / 1048576.0);
                        lastPercent = percent;
                    }
                }
                else
                {
                    Console.Write("\rDescargando: {0:0.0} MB", done / 1048576.0);
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
        if (!File.Exists(zipPath))
            throw new FileNotFoundException("No existe el archivo.", zipPath);
        if (!zipPath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Solo se aceptan archivos .zip.");

        string directory = Path.GetDirectoryName(zipPath) ?? Environment.CurrentDirectory;
        string projectName = Path.GetFileNameWithoutExtension(zipPath);
        string output = UniqueOutput(Path.Combine(directory, projectName + ".tns"));

        WriteColor(ConsoleColor.Cyan, "=== " + Path.GetFileName(zipPath) + " ===");
        Console.WriteLine("Salida: " + output);
        Console.WriteLine("Compilando...");
        Console.WriteLine();

        string arguments = "--build-zip " + Quote(zipPath) + " " + Quote(output) + " " + Quote(projectName);
        var psi = new ProcessStartInfo
        {
            FileName = compiler,
            Arguments = arguments,
            WorkingDirectory = directory,
            UseShellExecute = false,
            CreateNoWindow = false
        };

        using (var process = Process.Start(psi))
        {
            if (process == null)
                throw new InvalidOperationException("Windows no pudo iniciar TNS Tool Compiler.");
            process.WaitForExit();
            if (process.ExitCode != 0)
            {
                try { if (File.Exists(output)) File.Delete(output); } catch { }
                throw new Exception("TNS Tool Compiler terminó con código " + process.ExitCode + ". Revisa el error mostrado arriba.");
            }
        }

        ValidateZehn(output);
        long size = new FileInfo(output).Length;
        WriteColor(ConsoleColor.Green, "[OK] " + output + " (" + size + " bytes)");
        Console.WriteLine();
    }

    private static void ValidateZehn(string path)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException("El compilador terminó sin crear el .tns esperado.", path);

        using (var stream = File.OpenRead(path))
        {
            if (stream.Length < 4)
                throw new InvalidDataException("El .tns generado está vacío o truncado.");
            var magic = new byte[4];
            if (stream.Read(magic, 0, 4) != 4 || Encoding.ASCII.GetString(magic) != "Zehn")
                throw new InvalidDataException("El archivo generado no es un TNS Modern Zehn válido (falta la firma Zehn).");
        }
    }

    private static string UniqueOutput(string preferred)
    {
        if (!File.Exists(preferred)) return preferred;
        string dir = Path.GetDirectoryName(preferred) ?? Environment.CurrentDirectory;
        string name = Path.GetFileNameWithoutExtension(preferred);
        string ext = Path.GetExtension(preferred);
        string first = Path.Combine(dir, name + "_compiled" + ext);
        if (!File.Exists(first)) return first;
        for (int i = 2; i < 10000; i++)
        {
            string candidate = Path.Combine(dir, name + "_compiled_" + i + ext);
            if (!File.Exists(candidate)) return candidate;
        }
        return Path.Combine(dir, name + "_" + Guid.NewGuid().ToString("N") + ext);
    }

    private static string Sha256(string path)
    {
        using (var stream = File.OpenRead(path))
        using (SHA256 sha = SHA256.Create())
        {
            byte[] hash = sha.ComputeHash(stream);
            var builder = new StringBuilder(hash.Length * 2);
            foreach (byte b in hash) builder.Append(b.ToString("x2"));
            return builder.ToString();
        }
    }

    private static string Quote(string value)
    {
        if (value == null) return "\"\"";
        var builder = new StringBuilder();
        builder.Append('"');
        int slashes = 0;
        foreach (char c in value)
        {
            if (c == '\\')
            {
                slashes++;
                continue;
            }
            if (c == '"')
            {
                builder.Append('\\', slashes * 2 + 1);
                builder.Append('"');
                slashes = 0;
                continue;
            }
            if (slashes != 0)
            {
                builder.Append('\\', slashes);
                slashes = 0;
            }
            builder.Append(c);
        }
        if (slashes != 0) builder.Append('\\', slashes * 2);
        builder.Append('"');
        return builder.ToString();
    }

    private static void WriteColor(ConsoleColor color, string text)
    {
        ConsoleColor old = Console.ForegroundColor;
        try
        {
            Console.ForegroundColor = color;
            Console.WriteLine(text);
        }
        finally
        {
            Console.ForegroundColor = old;
        }
    }

    private static void Pause()
    {
        Console.WriteLine();
        Console.Write("Pulsa Enter para cerrar...");
        Console.ReadLine();
    }
}
