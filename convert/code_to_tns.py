import argparse
import binascii
import os
import sys
import struct
import zlib
from pathlib import Path

import tns_reader


LOCAL_SIG = b"PK\x03\x04"
CENTRAL_SIG = b"PK\x01\x02"
TNS_MAGIC = b"*TIMLP0900"
TNS_EOCD_SIG = b"TIPD"


LANGUAGE_LABELS = {
    "es": {
        "title": "TI-Nspire TNS Tool - Python Program",
        "menu_build_file": "1. Generar TNS desde archivo .py",
        "menu_build_paste": "2. Generar TNS pegando codigo",
        "menu_extract": "3. Extraer contenido soportado TNS to PY",
        "menu_language": "4. Language / Idioma / Langue",
        "menu_about": "5. Acerca de",
        "prompt_option": "Selecciona una opcion: ",
        "prompt_source": "Archivo .py: ",
        "prompt_output": "Salida [.tns]: ",
        "prompt_extract_target": "Archivo .tns a extraer: ",
        "prompt_extract_dir": "Directorio de salida: ",
        "build_ok": "TNS generado correctamente.",
        "language_title": "Selecciona idioma:",
        "language_es": "1. Espanol",
        "language_en": "2. English",
        "language_fr": "3. Francais",
        "language_changed": "Idioma cambiado a espanol.",
        "invalid_option": "Opcion invalida.",
        "paste_help": "Pega tu codigo Python. Finaliza con una linea que contenga solo EOF.",
        "about_title": "Acerca de:",
        "about_body": (
            "Esta herramienta sirve para crear y extraer documentos TNS orientados a Python. "
            "Funciona con plantillas que contienen q.py, como la opcion 'Agregar Python' de TI-Nspire. "
            "No sirve para generar programas normales de la calculadora. "
            "Esos otros documentos usan entradas con Compression Method 13 y por ahora no se pueden leer o reconstruir bien con esta herramienta."
        ),
        "exit_prompt": "Presiona Enter para salir...",
    },
    "en": {
        "title": "TI-Nspire TNS Tool - Python Program",
        "menu_build_file": "1. Generate TNS from .py file",
        "menu_build_paste": "2. Generate TNS by pasting code",
        "menu_extract": "3. Extract supported content TNS to PY",
        "menu_language": "4. Language / Idioma / Langue",
        "menu_about": "5. About",
        "prompt_option": "Select an option: ",
        "prompt_source": "Python file [.py]: ",
        "prompt_output": "Output [.tns]: ",
        "prompt_extract_target": "TNS file to extract: ",
        "prompt_extract_dir": "Output directory: ",
        "build_ok": "TNS generated successfully.",
        "language_title": "Select language:",
        "language_es": "1. Espanol",
        "language_en": "2. English",
        "language_fr": "3. Francais",
        "language_changed": "Language changed to English.",
        "invalid_option": "Invalid option.",
        "paste_help": "Paste your Python code. Finish with a line containing only EOF.",
        "about_title": "About:",
        "about_body": (
            "This tool is for creating and extracting Python-oriented TNS documents. "
            "It works with templates that contain q.py, like the TI-Nspire 'Add Python' option. "
            "It does not generate normal calculator programs. "
            "Those other documents use entries with Compression Method 13, and this tool cannot reliably read or rebuild them yet."
        ),
        "exit_prompt": "Press Enter to exit...",
    },
    "fr": {
        "title": "TI-Nspire TNS Tool - Python Program",
        "menu_build_file": "1. Generer TNS depuis un fichier .py",
        "menu_build_paste": "2. Generer TNS en collant du code",
        "menu_extract": "3. Extraire le contenu pris en charge TNS vers PY",
        "menu_language": "4. Language / Idioma / Langue",
        "menu_about": "5. A propos",
        "prompt_option": "Selectionnez une option : ",
        "prompt_source": "Fichier Python [.py] : ",
        "prompt_output": "Sortie [.tns] : ",
        "prompt_extract_target": "Fichier .tns a extraire : ",
        "prompt_extract_dir": "Dossier de sortie : ",
        "build_ok": "TNS genere avec succes.",
        "language_title": "Choisissez la langue :",
        "language_es": "1. Espanol",
        "language_en": "2. English",
        "language_fr": "3. Francais",
        "language_changed": "Langue changee en francais.",
        "invalid_option": "Option invalide.",
        "paste_help": "Collez votre code Python. Terminez avec une ligne contenant seulement EOF.",
        "about_title": "A propos :",
        "about_body": (
            "Cet outil sert a creer et extraire des documents TNS orientes Python. "
            "Il fonctionne avec des modeles contenant q.py, comme l'option TI-Nspire 'Ajouter Python'. "
            "Il ne sert pas a generer des programmes classiques de la calculatrice. "
            "Ces autres documents utilisent des entrees avec la methode de compression 13, et cet outil ne peut pas encore les lire ou les reconstruire correctement."
        ),
        "exit_prompt": "Appuyez sur Entree pour quitter...",
    },
}


def raw_deflate(data: bytes, level: int = 9) -> bytes:
    compressor = zlib.compressobj(level=level, wbits=-15)
    return compressor.compress(data) + compressor.flush()


def build_local_header(entry, crc32: int, compressed_size: int, uncompressed_size: int, first: bool) -> bytes:
    name_bytes = entry.name.encode("utf-8")
    if first:
        header = TNS_MAGIC + struct.pack(
            "<5H3L2H",
            20,
            entry.flags,
            entry.method,
            0,
            0,
            crc32,
            compressed_size,
            uncompressed_size,
            len(name_bytes),
            entry.extra_length,
        )
    else:
        header = struct.pack(
            "<4s5H3L2H",
            LOCAL_SIG,
            20,
            entry.flags,
            entry.method,
            0,
            0,
            crc32,
            compressed_size,
            uncompressed_size,
            len(name_bytes),
            entry.extra_length,
        )
    return header + name_bytes


def build_central_header(entry, crc32: int, compressed_size: int, uncompressed_size: int, local_offset: int) -> bytes:
    name_bytes = entry.name.encode("utf-8")
    return struct.pack(
        "<4s6H3L5H2L",
        CENTRAL_SIG,
        20,
        20,
        entry.flags,
        entry.method,
        0,
        0,
        crc32,
        compressed_size,
        uncompressed_size,
        len(name_bytes),
        entry.extra_length,
        0,
        0,
        1,
        32,
        local_offset,
    ) + name_bytes


def build_tipd(entry_count: int, central_size: int, central_offset: int) -> bytes:
    return struct.pack(
        "<4s4H2LH",
        TNS_EOCD_SIG,
        0,
        0,
        entry_count,
        entry_count,
        central_size,
        central_offset,
        0,
    )


def read_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def resolve_template_path(template: str | Path | None = None) -> Path:
    candidate_name = str(template or "plantilla.tns")
    candidate_path = Path(candidate_name)
    search_paths: list[Path] = []

    if candidate_path.is_absolute():
        search_paths.append(candidate_path)
    else:
        search_paths.append(Path.cwd() / candidate_path)
        search_paths.append(get_base_dir() / candidate_path)
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            search_paths.append(Path(meipass) / candidate_path)

    for path in search_paths:
        if path.exists():
            return path

    return candidate_path if candidate_path.is_absolute() else search_paths[0]


def get_output_dir() -> Path:
    output_dir = get_base_dir() / "extracted"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def open_in_explorer(path: Path) -> None:
    os.startfile(str(path))


def resolve_output_in_extracted(user_value: str | None, default_name: str) -> Path:
    output_dir = get_output_dir()
    if not user_value:
        return output_dir / default_name

    candidate = Path(user_value)
    if candidate.is_absolute():
        return candidate
    return output_dir / candidate


def tr(lang: str, key: str) -> str:
    return LANGUAGE_LABELS.get(lang, LANGUAGE_LABELS["es"])[key]


def prompt_multiline_code(lang: str) -> str:
    print(tr(lang, "paste_help"))
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line == "EOF":
            break
        lines.append(line)
    return "\n".join(lines)


def choose_output_path(output: str | None, source_name: str, suffix: str = ".tns") -> Path:
    if output:
        return Path(output)
    base = Path(source_name).stem or "salida"
    return Path(f"{base}{suffix}")


def load_code(args: argparse.Namespace) -> str:
    sources = [bool(args.input), bool(args.code), args.interactive]
    if sum(sources) > 1:
        raise ValueError("Usa solo una fuente de codigo: --input, --code o --interactive.")
    if args.input:
        return read_text_file(Path(args.input))
    if args.code:
        return args.code
    if args.interactive:
        return prompt_multiline_code(getattr(args, "lang", "es"))
    raise ValueError("Debes indicar --input, --code o --interactive.")


def build_tns(template_path: Path, code_text: str, output_path: Path) -> None:
    data = template_path.read_bytes()
    entries = tns_reader.parse_central_directory(data)

    if not any(entry.name == "q.py" for entry in entries):
        raise ValueError("La plantilla no contiene q.py.")

    rebuilt = bytearray()
    central_entries = []

    for entry in entries:
        local_offset = len(rebuilt)

        if entry.name == "q.py":
            payload = code_text.encode("utf-8")
            compressed = raw_deflate(payload)
            crc32 = binascii.crc32(payload) & 0xFFFFFFFF
            csize = len(compressed)
            usize = len(payload)
        else:
            compressed = data[entry.data_offset:entry.data_offset + entry.compressed_size]
            crc32 = entry.crc32
            csize = entry.compressed_size
            usize = entry.uncompressed_size

        rebuilt.extend(
            build_local_header(
                entry,
                crc32,
                csize,
                usize,
                first=(entry.local_offset == 0),
            )
        )
        rebuilt.extend(compressed)
        central_entries.append((entry, crc32, csize, usize, local_offset))

    central_offset = len(rebuilt)
    central_blob = bytearray()
    for entry, crc32, csize, usize, local_offset in central_entries:
        central_blob.extend(build_central_header(entry, crc32, csize, usize, local_offset))

    rebuilt.extend(central_blob)
    rebuilt.extend(build_tipd(len(central_entries), len(central_blob), central_offset))
    output_path.write_bytes(rebuilt)


def cmd_build(args: argparse.Namespace) -> int:
    code_text = load_code(args)
    template = resolve_template_path(args.template)
    source_name = args.input or "codigo_inline"
    output = choose_output_path(args.output, source_name)
    build_tns(template, code_text, output)
    print(f"tns generado: {output}")
    return 0


def cmd_quick(args: argparse.Namespace) -> int:
    source = Path(args.source)
    if source.suffix.lower() != ".py":
        raise ValueError("quick espera un archivo .py.")
    output = choose_output_path(args.output, source.name)
    build_tns(resolve_template_path(args.template), read_text_file(source), output)
    print(f"tns generado: {output}")
    return 0


def cmd_menu(args: argparse.Namespace) -> int:
    lang = getattr(args, "lang", "es")

    while True:
        print(tr(lang, "title"))
        print(tr(lang, "menu_build_file"))
        print(tr(lang, "menu_build_paste"))
        print(tr(lang, "menu_extract"))
        print(tr(lang, "menu_language"))
        print(tr(lang, "menu_about"))
        option = input(tr(lang, "prompt_option")).strip()

        if option == "1":
            source = input(tr(lang, "prompt_source")).strip()
            output_dir = get_output_dir()
            final_output = output_dir / choose_output_path(None, source).name
            build_tns(
                resolve_template_path(),
                read_text_file(Path(source)),
                final_output,
            )
            print(tr(lang, "build_ok"))
            open_in_explorer(output_dir)
            return 0

        if option == "2":
            output_dir = get_output_dir()
            final_output = output_dir / "salida.tns"
            code_text = prompt_multiline_code(lang)
            build_tns(resolve_template_path(), code_text, final_output)
            print(tr(lang, "build_ok"))
            open_in_explorer(output_dir)
            return 0

        if option == "3":
            target = input(tr(lang, "prompt_extract_target")).strip() or str(resolve_template_path())
            out_dir = str(get_output_dir())
            args_ns = argparse.Namespace(file=target, out=out_dir, open_dir=True)
            return tns_reader.cmd_extract(args_ns)

        if option == "4":
            print(tr(lang, "language_title"))
            print(tr(lang, "language_es"))
            print(tr(lang, "language_en"))
            print(tr(lang, "language_fr"))
            language_option = input("> ").strip()
            mapping = {"1": "es", "2": "en", "3": "fr"}
            if language_option not in mapping:
                raise ValueError(tr(lang, "invalid_option"))
            lang = mapping[language_option]
            args.lang = lang
            print(tr(lang, "language_changed"))
            continue

        if option == "5":
            print(tr(lang, "about_title"))
            print(tr(lang, "about_body"))
            continue

        raise ValueError(tr(lang, "invalid_option"))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Herramienta para leer, extraer y generar archivos TNS de TI-Nspire."
    )
    sub = parser.add_subparsers(dest="command")

    build = sub.add_parser("build", help="Genera un TNS usando una plantilla")
    build.add_argument("--template", default="plantilla.tns", help="Ruta al .tns base")
    build.add_argument("--input", help="Archivo .py de entrada")
    build.add_argument("--code", help="Codigo Python inline")
    build.add_argument("--interactive", action="store_true", help="Pega codigo multilinea por consola")
    build.add_argument("--output", help="Archivo .tns de salida")
    build.set_defaults(func=cmd_build)

    quick = sub.add_parser("quick", help="Modo simple para convertir un .py a .tns")
    quick.add_argument("source", help="Archivo .py")
    quick.add_argument("--template", default="plantilla.tns", help="Ruta al .tns base")
    quick.add_argument("--output", help="Archivo .tns de salida")
    quick.set_defaults(func=cmd_quick)

    analyze = sub.add_parser("analyze", help="Analiza un archivo .tns")
    analyze.add_argument("file", help="Archivo .tns")
    analyze.add_argument("--hex", action="store_true", help="Incluye volcado hexadecimal inicial")
    analyze.set_defaults(func=tns_reader.cmd_analyze)

    extract = sub.add_parser("extract", help="Extrae contenido soportado de un .tns")
    extract.add_argument("file", help="Archivo .tns")
    extract.add_argument("-o", "--out", default="tns_out", help="Directorio de salida")
    extract.set_defaults(func=tns_reader.cmd_extract)

    tozip = sub.add_parser("tozip", help="Convierte un .tns a .zip canonico")
    tozip.add_argument("file", help="Archivo .tns")
    tozip.add_argument("-o", "--out", default="converted.zip", help="Archivo ZIP de salida")
    tozip.set_defaults(func=tns_reader.cmd_tozip)

    strings_cmd = sub.add_parser("strings", help="Lista strings ASCII en un .tns")
    strings_cmd.add_argument("file", help="Archivo .tns")
    strings_cmd.add_argument("--min-len", type=int, default=4, help="Longitud minima")
    strings_cmd.set_defaults(func=tns_reader.cmd_strings)

    menu = sub.add_parser("menu", help="Abre un menu interactivo")
    menu.add_argument("--lang", choices=sorted(LANGUAGE_LABELS), default="es", help="Idioma inicial del menu")
    menu.set_defaults(func=cmd_menu)

    return parser


def main() -> int:
    parser = build_parser()
    launched_without_args = len(sys.argv) == 1
    frozen = getattr(sys, "frozen", False)

    if launched_without_args:
        args = parser.parse_args(["menu"])
    else:
        args = parser.parse_args()

    try:
        rc = args.func(args)
        prompt_lang = getattr(args, "lang", "es")
        if frozen and launched_without_args:
            input(tr(prompt_lang, "exit_prompt"))
        return rc
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        if frozen:
            input(tr(getattr(args, "lang", "es"), "exit_prompt"))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
