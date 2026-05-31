from __future__ import annotations

import shutil
import tempfile
import tkinter as tk
import re
import time
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from app_i18n import severity_label, tr, translate_problem
from app_settings import load_settings
from ti_parser import ti_serialized_to_multiline
from ti_syntax import SyntaxReport, analyze_ti_code, autofix_ti_code, format_ti_code
from xml_scanner import XMLCandidate, XMLScanner
from xml_updater import XMLUpdater


BASE_DIR = Path(getattr(__import__("sys"), "_MEIPASS", Path(__file__).resolve().parent.parent))
SOURCE_DIR = Path(__file__).resolve().parent.parent
ICON_DIRS = [SOURCE_DIR / "icon", BASE_DIR / "icon"]


@dataclass
class ProgramEntry:
    name: str
    symbol: XMLCandidate
    candidates: list[XMLCandidate]


class LineNumberText(tk.Frame):
    def __init__(self, master: tk.Misc):
        super().__init__(master)
        self.issue_lines: dict[int, str] = {}
        self.line_numbers = tk.Canvas(self, width=52, bg="#f8fafc", highlightthickness=0)
        self.text = tk.Text(
            self,
            wrap="none",
            undo=True,
            font=("Consolas", 11),
            padx=8,
            pady=8,
            borderwidth=0,
            highlightthickness=1,
            highlightbackground="#dce3ee",
            bg="#ffffff",
            fg="#172033",
            insertbackground="#4f46e5",
            selectbackground="#dbeafe",
        )
        self.text.tag_configure("keyword", foreground="#2563eb", font=("Consolas", 11, "bold"))
        self.text.tag_configure("command", foreground="#0f766e", font=("Consolas", 11, "bold"))
        self.text.tag_configure("string", foreground="#b45309")
        self.text.tag_configure("error_line", background="#fee2e2")
        self.text.tag_configure("warning_line", background="#fef3c7")
        self.y_scroll = ttk.Scrollbar(self, orient="vertical", command=self._yview)
        self.x_scroll = ttk.Scrollbar(self, orient="horizontal", command=self.text.xview)
        self.text.configure(yscrollcommand=self._yscroll, xscrollcommand=self.x_scroll.set)

        self.line_numbers.grid(row=0, column=0, sticky="ns")
        self.text.grid(row=0, column=1, sticky="nsew")
        self.y_scroll.grid(row=0, column=2, sticky="ns")
        self.x_scroll.grid(row=1, column=1, sticky="ew")
        self.columnconfigure(1, weight=1)
        self.rowconfigure(0, weight=1)

        self.text.bind("<KeyRelease>", self._on_change)
        self.text.bind("<ButtonRelease-1>", self._on_change)
        self.text.bind("<MouseWheel>", self._on_change)
        self.text.bind("<<Modified>>", self._on_modified)
        self.after_idle(self.redraw_line_numbers)

    def _yview(self, *args: str) -> None:
        self.text.yview(*args)
        self.redraw_line_numbers()

    def _yscroll(self, first: str, last: str) -> None:
        self.y_scroll.set(first, last)
        self.redraw_line_numbers()

    def _on_change(self, _event: tk.Event | None = None) -> None:
        self.after_idle(self.redraw_line_numbers)

    def _on_modified(self, _event: tk.Event | None = None) -> None:
        if self.text.edit_modified():
            self.text.edit_modified(False)
            self.after_idle(self.redraw_line_numbers)

    def redraw_line_numbers(self) -> None:
        self.line_numbers.delete("all")
        index = self.text.index("@0,0")
        while True:
            dline = self.text.dlineinfo(index)
            if dline is None:
                break
            y = dline[1]
            line = int(str(index).split(".", 1)[0])
            issue = self.issue_lines.get(line)
            if issue:
                color = "#ef4444" if issue == "ERROR" else "#f59e0b"
                self.line_numbers.create_oval(8, y + 4, 16, y + 12, fill=color, outline=color)
            self.line_numbers.create_text(44, y, anchor="ne", text=str(line), fill="#64748b", font=("Consolas", 10))
            index = self.text.index(f"{index}+1line")

    def get_text(self) -> str:
        return self.text.get("1.0", "end-1c")

    def set_text(self, value: str) -> None:
        self.text.delete("1.0", "end")
        self.text.insert("1.0", value)
        self.text.edit_modified(False)
        self.apply_code_highlighting()
        self.redraw_line_numbers()

    def set_issues(self, diagnostics: list) -> None:
        self.issue_lines.clear()
        self.text.tag_remove("error_line", "1.0", "end")
        self.text.tag_remove("warning_line", "1.0", "end")
        for diagnostic in diagnostics:
            if not getattr(diagnostic, "line", 0):
                continue
            line = diagnostic.line
            if diagnostic.severity == "ERROR":
                self.issue_lines[line] = "ERROR"
                self.text.tag_add("error_line", f"{line}.0", f"{line}.end")
            elif self.issue_lines.get(line) != "ERROR":
                self.issue_lines[line] = "WARNING"
                self.text.tag_add("warning_line", f"{line}.0", f"{line}.end")
        self.redraw_line_numbers()

    def apply_code_highlighting(self) -> None:
        for tag in ("keyword", "command", "string"):
            self.text.tag_remove(tag, "1.0", "end")
        content = self.get_text()
        for match in re.finditer(r'"[^"\n]*"', content):
            self.text.tag_add("string", f"1.0+{match.start()}c", f"1.0+{match.end()}c")
        for match in re.finditer(r"\b(Prgm|EndPrgm|If|Then|Else|EndIf|Local)\b", content, flags=re.IGNORECASE):
            self.text.tag_add("keyword", f"1.0+{match.start()}c", f"1.0+{match.end()}c")
        for match in re.finditer(r"\b(Disp|Request|Prompt|approx|sqrt|log|clrio)\b", content, flags=re.IGNORECASE):
            self.text.tag_add("command", f"1.0+{match.start()}c", f"1.0+{match.end()}c")


class TIXMLEditorApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Syntax Doctor XML")
        self.geometry("1280x780")
        self.minsize(1040, 640)
        self.configure(bg="#f8fafc")

        self.source_path: Path | None = None
        self.stage_dir: Path | None = None
        self.programs: list[ProgramEntry] = []
        self.current_program: ProgramEntry | None = None
        self.embedded = False
        self.syntax_report: SyntaxReport | None = None
        self.syntax_text_snapshot = ""
        self.last_fix_diff = ""
        self.problem_filter = tk.StringVar()
        self.language = load_settings()["language"]
        self.icons: dict[str, tk.PhotoImage] = {}
        self.translatable: dict[str, tuple[tk.Widget, str]] = {}

        self._load_icons()
        self._configure_style()
        self._build_ui()
        self._apply_language()
        self._set_status("Abra un XML o una carpeta .tns.xml para empezar.")

    def _load_icons(self) -> None:
        names = {
            "error": "error.png",
            "warning": "advertencia.png",
            "ok": "perfecto.png",
            "folder": "folder.png",
            "tns": "tns_icon.png",
        }
        for key, filename in names.items():
            for directory in ICON_DIRS:
                path = directory / filename
                if path.exists():
                    image = tk.PhotoImage(file=str(path))
                    if image.width() > 28 or image.height() > 28:
                        image = image.subsample(max(1, image.width() // 24), max(1, image.height() // 24))
                    self.icons[key] = image
                    break

    def _configure_style(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TFrame", background="#f8fafc")
        style.configure("Toolbar.TFrame", background="#ffffff")
        style.configure("Panel.TFrame", background="#ffffff", relief="solid", borderwidth=1)
        style.configure("TLabel", background="#f8fafc", foreground="#172033")
        style.configure("Panel.TLabel", background="#ffffff", foreground="#172033")
        style.configure("Muted.TLabel", background="#ffffff", foreground="#64748b")
        style.configure("TButton", padding=(10, 6), background="#ffffff", foreground="#111827")
        style.map("TButton", background=[("active", "#f1f5f9")])
        style.configure("Accent.TButton", background="#4f46e5", foreground="#ffffff")
        style.map("Accent.TButton", background=[("active", "#4338ca")], foreground=[("active", "#ffffff")])
        style.configure("TCombobox", fieldbackground="#ffffff", background="#ffffff")
        style.configure("Treeview", background="#ffffff", fieldbackground="#ffffff", rowheight=25, borderwidth=0)
        style.configure("Treeview.Heading", background="#f8fafc", foreground="#334155", relief="flat")

    def _build_ui(self) -> None:
        top = ttk.Frame(self, padding=(12, 10), style="Toolbar.TFrame")
        top.pack(side="top", fill="x")

        open_button = ttk.Button(top, image=self.icons.get("folder"), compound="left", command=self.open_xml)
        open_button.pack(side="left", padx=(0, 6))
        self.translatable["open_xml"] = (open_button, "open_xml")
        save_button = ttk.Button(top, command=self.save_xml)
        save_button.pack(side="left", padx=6)
        self.translatable["save_xml"] = (save_button, "save_xml")
        embed_button = ttk.Button(top, command=self.embed_in_xml)
        embed_button.pack(side="left", padx=6)
        self.translatable["embed_xml"] = (embed_button, "embed_xml")
        syntax_button = ttk.Button(top, command=self.run_syntax)
        syntax_button.pack(side="left", padx=(18, 6))
        self.translatable["run_syntax"] = (syntax_button, "run_syntax")
        autofix_button = ttk.Button(top, command=self.auto_fix)
        autofix_button.pack(side="left", padx=6)
        self.translatable["auto_fix"] = (autofix_button, "auto_fix")
        format_button = ttk.Button(top, command=self.format_code)
        format_button.pack(side="left", padx=6)
        self.translatable["format"] = (format_button, "format")
        resolve_button = ttk.Button(top, style="Accent.TButton", command=self.resolve_problems)
        resolve_button.pack(side="left", padx=6)
        self.translatable["resolve"] = (resolve_button, "resolve")
        changes_button = ttk.Button(top, command=self.show_changes)
        changes_button.pack(side="left", padx=6)
        self.translatable["show_changes"] = (changes_button, "show_changes")

        program_label = ttk.Label(top, background="#ffffff")
        program_label.pack(side="left", padx=(20, 4))
        self.translatable["program"] = (program_label, "program")
        self.program_var = tk.StringVar()
        self.program_combo = ttk.Combobox(top, textvariable=self.program_var, state="readonly", width=26)
        self.program_combo.pack(side="left")
        self.program_combo.bind("<<ComboboxSelected>>", self._on_program_selected)

        self.line_label = ttk.Label(top, text="Linea: 1   Col: 1", background="#ffffff")
        self.line_label.pack(side="right")

        main = ttk.PanedWindow(self, orient="horizontal")
        main.pack(fill="both", expand=True, padx=12, pady=(12, 8))

        left = ttk.Frame(main, style="Panel.TFrame", padding=(0, 0))
        right = ttk.Frame(main, style="TFrame")
        main.add(left, weight=4)
        main.add(right, weight=2)

        self.editor_tab = ttk.Frame(left, style="Toolbar.TFrame", padding=(10, 7))
        self.editor_tab.pack(fill="x")
        self.file_label = ttk.Label(self.editor_tab, text=tr(self.language, "no_file"), background="#ffffff", foreground="#334155")
        self.file_label.pack(side="left")

        self.editor = LineNumberText(left)
        self.editor.pack(fill="both", expand=True)
        self.editor.text.bind("<KeyRelease>", self._update_line_label, add=True)
        self.editor.text.bind("<KeyRelease>", self._mark_syntax_dirty, add=True)
        self.editor.text.bind("<ButtonRelease-1>", self._update_line_label, add=True)

        self._build_analysis_panel(right)

        bottom = ttk.Frame(self, padding=(14, 6), style="Toolbar.TFrame")
        bottom.pack(side="bottom", fill="x")
        self.status = ttk.Label(bottom, anchor="w", text="", background="#ffffff")
        self.status.pack(side="left")
        self.status_counts = ttk.Label(bottom, anchor="e", text="", background="#ffffff")
        self.status_counts.pack(side="right")

    def _build_analysis_panel(self, parent: ttk.Frame) -> None:
        summary = ttk.Frame(parent, style="Panel.TFrame", padding=10)
        summary.pack(fill="x", pady=(0, 10))
        summary_label = ttk.Label(summary, style="Panel.TLabel")
        summary_label.pack(anchor="w")
        self.translatable["analysis_summary"] = (summary_label, "analysis_summary")
        cards = ttk.Frame(summary, style="Panel.TFrame")
        cards.pack(fill="x", pady=(8, 0))
        self.error_card = self._summary_card(cards, "0", "errors", "#ef4444", "error")
        self.warning_card = self._summary_card(cards, "0", "warnings", "#f59e0b", "warning")
        self.info_card = self._summary_card(cards, "0", "info", "#3b82f6", "ok")

        problems = ttk.Frame(parent, style="Panel.TFrame", padding=10)
        problems.pack(fill="both", expand=True, pady=(0, 10))
        header = ttk.Frame(problems, style="Panel.TFrame")
        header.pack(fill="x")
        problem_label = ttk.Label(header, style="Panel.TLabel")
        problem_label.pack(side="left")
        self.translatable["problem_list"] = (problem_label, "problem_list")
        search = ttk.Entry(header, textvariable=self.problem_filter, width=26)
        search.pack(side="right")
        search.insert(0, "")
        self.problem_filter.trace_add("write", lambda *_args: self._populate_problem_list())

        self.problem_tree = ttk.Treeview(
            problems,
            columns=("tipo", "linea", "descripcion"),
            show="headings",
            height=9,
        )
        self.problem_tree.heading("tipo", text="Tipo")
        self.problem_tree.heading("linea", text="Linea")
        self.problem_tree.heading("descripcion", text="Descripcion")
        self.problem_tree.column("tipo", width=70, anchor="center")
        self.problem_tree.column("linea", width=55, anchor="center")
        self.problem_tree.column("descripcion", width=360)
        self.problem_tree.tag_configure("ERROR", foreground="#dc2626", font=("Segoe UI", 9, "bold"))
        self.problem_tree.tag_configure("WARNING", foreground="#ca8a04", font=("Segoe UI", 9, "bold"))
        self.problem_tree.tag_configure("INFO", foreground="#2563eb")
        self.problem_tree.pack(fill="both", expand=True, pady=(8, 0))
        self.problem_tree.bind("<Double-1>", self._jump_to_problem)

        log_panel = ttk.Frame(parent, style="Panel.TFrame", padding=10)
        log_panel.pack(fill="both", expand=True)
        log_header = ttk.Frame(log_panel, style="Panel.TFrame")
        log_header.pack(fill="x")
        log_title = ttk.Label(log_header, style="Panel.TLabel")
        log_title.pack(side="left")
        self.translatable["log"] = (log_title, "log")
        clear_log = ttk.Button(log_header, command=self._clear_log)
        clear_log.pack(side="right")
        self.translatable["clear_log"] = (clear_log, "clear_log")
        self.log = tk.Text(
            log_panel,
            height=9,
            wrap="word",
            state="disabled",
            font=("Consolas", 9),
            bg="#ffffff",
            fg="#334155",
            relief="flat",
        )
        self.log.pack(fill="both", expand=True, pady=(8, 0))

        self.info = tk.Text(parent, height=1, state="disabled")
        self.info.pack_forget()

    def _summary_card(self, parent: ttk.Frame, value: str, label_key: str, color: str, icon_key: str) -> ttk.Frame:
        card = ttk.Frame(parent, style="Panel.TFrame", padding=(12, 10))
        card.pack(side="left", fill="x", expand=True, padx=(0, 8))
        icon = ttk.Label(card, image=self.icons.get(icon_key), style="Panel.TLabel")
        icon.pack(anchor="center")
        number = ttk.Label(card, text=value, style="Panel.TLabel", font=("Segoe UI", 18, "bold"), foreground=color)
        number.pack(anchor="center")
        text = ttk.Label(card, style="Muted.TLabel", font=("Segoe UI", 8))
        text.pack(anchor="center")
        card.value_label = number  # type: ignore[attr-defined]
        self.translatable[f"summary_{label_key}_{id(text)}"] = (text, label_key)
        return card

    def _apply_language(self) -> None:
        self.title(tr(self.language, "syntax_title"))
        for widget, key in self.translatable.values():
            try:
                widget.configure(text=tr(self.language, key))
            except tk.TclError:
                pass
        self.problem_tree.heading("tipo", text=tr(self.language, "type"))
        self.problem_tree.heading("linea", text=tr(self.language, "line"))
        self.problem_tree.heading("descripcion", text=tr(self.language, "description"))
        if self.current_program is None:
            self.file_label.configure(text=tr(self.language, "no_file"))
        self._update_line_label()
        self._update_analysis_widgets(self.syntax_report)

    def open_xml(self) -> None:
        choice = messagebox.askyesnocancel(
            "Abrir XML",
            "Seleccione 'Si' para abrir una carpeta .tns.xml.\nSeleccione 'No' para abrir un archivo XML individual.",
        )
        if choice is None:
            return
        if choice:
            selected = filedialog.askdirectory(title="Abrir carpeta .tns.xml")
            if not selected:
                return
            path = Path(selected)
        else:
            selected = filedialog.askopenfilename(title=tr(self.language, "open_xml"), filetypes=[("XML", "*.xml"), (tr(self.language, "all_files"), "*.*")])
            if not selected:
                return
            path = Path(selected)

        self._load_source(path)

    def _load_source(self, path: Path) -> None:
        try:
            candidates = XMLScanner(path).scan()
        except Exception as exc:
            messagebox.showerror("Error al abrir XML", str(exc))
            return

        programs = self._build_program_entries(candidates)
        if not programs:
            messagebox.showwarning("Sin programas", "No se encontro ningun programa TI en <v>.")
            return

        self._cleanup_stage()
        self.source_path = path.resolve()
        self.stage_dir = None
        self.programs = programs
        self.embedded = False

        labels = [self._program_label(program) for program in programs]
        self.program_combo.configure(values=labels)
        self.program_combo.current(0)
        self._select_program(0)
        self._log(f"Abierto: {self.source_path}")

    @staticmethod
    def _build_program_entries(candidates: list[XMLCandidate]) -> list[ProgramEntry]:
        grouped: dict[tuple[Path, str], list[XMLCandidate]] = defaultdict(list)
        symbols: list[XMLCandidate] = []
        for candidate in candidates:
            if candidate.program_name:
                grouped[(candidate.file, candidate.program_name)].append(candidate)
            if candidate.kind == "symbol_value" and candidate.code_text:
                symbols.append(candidate)

        entries: list[ProgramEntry] = []
        for symbol in symbols:
            name = symbol.program_name or "(sin nombre)"
            entries.append(ProgramEntry(name=name, symbol=symbol, candidates=grouped[(symbol.file, symbol.program_name)]))
        return entries

    @staticmethod
    def _program_label(program: ProgramEntry) -> str:
        return f"{program.name}  ({program.symbol.file.name})"

    def _on_program_selected(self, _event: tk.Event | None = None) -> None:
        index = self.program_combo.current()
        if index >= 0:
            self._select_program(index)

    def _select_program(self, index: int) -> None:
        self.current_program = self.programs[index]
        self.editor.set_text(ti_serialized_to_multiline(self.current_program.symbol.code_text or ""))
        self._render_info()
        self._update_line_label()
        self.embedded = False
        self.syntax_report = None
        self.syntax_text_snapshot = ""
        self.last_fix_diff = ""
        self.file_label.configure(text=self._program_label(self.current_program))
        self.editor.set_issues([])
        self._update_analysis_widgets(None)
        self._set_status(f"Programa cargado: {self.current_program.name}")

    def _render_info(self) -> None:
        program = self.current_program
        if program is None:
            return

        lines = [f"Programa: {program.name}", f"Archivo: {program.symbol.file}", ""]
        code_candidates = [c for c in program.candidates if c.code_text is not None]
        hashes = {c.code_hash for c in code_candidates}
        if len(hashes) > 1:
            lines.append("Aviso: <v> y laststoredexpr difieren.")
        else:
            lines.append("Copias de codigo: hashes equivalentes.")
        lines.append("")

        for candidate in program.candidates:
            lines.append(f"- {candidate.kind}")
            lines.append(f"  path: {candidate.path}")
            lines.append(f"  length: {len(candidate.text)}")
            if candidate.code_text is not None:
                lines.append(f"  code_length: {len(candidate.code_text)}")
                lines.append(f"  code_hash: {candidate.code_hash}")
            if candidate.widget_type:
                lines.append(f"  widget: {candidate.widget_type}")
            lines.append("")

        self._set_text_widget(self.info, "\n".join(lines))

    def embed_in_xml(self) -> None:
        if self.source_path is None or self.current_program is None:
            messagebox.showwarning("Sin XML", "Primero abra un XML o carpeta .tns.xml.")
            return
        if not self._syntax_allows_write():
            return

        try:
            self._prepare_stage()
            assert self.stage_dir is not None
            written = XMLUpdater(self.stage_dir).update_program(
                self.current_program.name,
                self.editor.get_text(),
                in_place=True,
            )
        except Exception as exc:
            messagebox.showerror("Error al incrustar", str(exc))
            return

        if not written:
            messagebox.showwarning("Sin cambios", "No se actualizo ninguna ubicacion XML.")
            return

        self.embedded = True
        self._log("Incrustado en staging:")
        for path in written:
            self._log(f"  {path}")
        self._set_status("Codigo incrustado en copia temporal. Use Guardar XML para escribirlo.")

    def _prepare_stage(self) -> None:
        self._cleanup_stage()
        self.stage_dir = Path(tempfile.mkdtemp(prefix="ti_xml_editor_stage_"))
        assert self.source_path is not None
        if self.source_path.is_file():
            shutil.copy2(self.source_path, self.stage_dir / self.source_path.name)
            return
        for src in self.source_path.rglob("*"):
            rel = src.relative_to(self.source_path)
            dst = self.stage_dir / rel
            if src.is_dir():
                dst.mkdir(parents=True, exist_ok=True)
            elif src.suffix.lower() == ".xml":
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)

    def save_xml(self) -> None:
        if self.source_path is None:
            messagebox.showwarning("Sin XML", "Primero abra un XML o carpeta .tns.xml.")
            return
        if not self._syntax_allows_write():
            return
        if not self.embedded:
            if not messagebox.askyesno("Incrustar antes de guardar", "El codigo aun no fue incrustado. Incrustar ahora?"):
                return
            self.embed_in_xml()
            if not self.embedded:
                return

        assert self.stage_dir is not None
        overwrite = messagebox.askyesno("Guardar XML", "Seleccione 'Si' para sobrescribir el XML original.\nSeleccione 'No' para guardar una copia.")
        try:
            if overwrite:
                self._copy_stage_to_original()
                self._set_status("XML original actualizado.")
                self._log("Guardado sobrescribiendo el original.")
            else:
                self._save_copy()
        except Exception as exc:
            messagebox.showerror("Error al guardar", str(exc))

    def _copy_stage_to_original(self) -> None:
        assert self.source_path is not None and self.stage_dir is not None
        if self.source_path.is_file():
            shutil.copy2(self.stage_dir / self.source_path.name, self.source_path)
            return
        for src in self.stage_dir.rglob("*.xml"):
            dst = self.source_path / src.relative_to(self.stage_dir)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    def _save_copy(self) -> None:
        assert self.source_path is not None and self.stage_dir is not None
        if self.source_path.is_file():
            selected = filedialog.asksaveasfilename(
                title="Guardar copia XML",
                defaultextension=".xml",
                initialfile=self.source_path.stem + "_editado.xml",
                filetypes=[("XML", "*.xml"), (tr(self.language, "all_files"), "*.*")],
            )
            if not selected:
                return
            shutil.copy2(self.stage_dir / self.source_path.name, Path(selected))
            self._set_status(f"Copia guardada: {selected}")
            self._log(f"Copia guardada: {selected}")
            return

        selected_dir = filedialog.askdirectory(title="Guardar copia de carpeta XML")
        if not selected_dir:
            return
        target = Path(selected_dir)
        for src in self.stage_dir.rglob("*.xml"):
            dst = target / src.relative_to(self.stage_dir)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
        self._set_status(f"Copia guardada en: {target}")
        self._log(f"Copia guardada en: {target}")

    def _update_line_label(self, _event: tk.Event | None = None) -> None:
        line, col = self.editor.text.index("insert").split(".", 1)
        self.line_label.configure(text=f"{tr(self.language, 'line')}: {line}   {tr(self.language, 'col')}: {int(col) + 1}")

    def _mark_syntax_dirty(self, _event: tk.Event | None = None) -> None:
        self.editor.apply_code_highlighting()
        if self.syntax_text_snapshot != self.editor.get_text():
            self.syntax_report = None
            self.embedded = False

    def run_syntax(self, *, clear_changes: bool = True) -> SyntaxReport:
        text = self.editor.get_text()
        report = analyze_ti_code(text)
        self.syntax_report = report
        self.syntax_text_snapshot = text
        if clear_changes:
            self.last_fix_diff = ""
        self._set_text_widget(self.info, report.format())
        self._update_analysis_widgets(report)
        if report.has_errors:
            self._set_status(f"Sintaxis: {len(report.errors)} errores, {len(report.warnings)} advertencias.")
            self._log(f"Analisis completado: {len(report.errors)} errores, {len(report.warnings)} advertencias")
        else:
            self._set_status(f"Sintaxis OK. Advertencias: {len(report.warnings)}.")
            self._log(f"Analisis completado: 0 errores, {len(report.warnings)} advertencias")
        return report

    def auto_fix(self) -> None:
        fixed, diff = autofix_ti_code(self.editor.get_text())
        self.last_fix_diff = diff
        if fixed == self.editor.get_text():
            self._log("Auto Fix: no se aplicaron cambios.")
            self._set_text_widget(self.info, diff)
            return
        self.editor.set_text(fixed)
        self.embedded = False
        self._log("Auto Fix aplicado. Use Mostrar cambios para revisar.")
        self._set_text_widget(self.info, diff)
        self.run_syntax(clear_changes=False)

    def format_code(self) -> None:
        formatted, diff = format_ti_code(self.editor.get_text())
        self.last_fix_diff = diff
        if formatted == self.editor.get_text():
            self._log("Format: no se aplicaron cambios.")
            self._set_text_widget(self.info, "No se aplicaron cambios de formato.")
            return
        self.editor.set_text(formatted)
        self.embedded = False
        self._log("Format aplicado. Use Mostrar cambios para revisar.")
        self._set_text_widget(self.info, diff or "Formato aplicado.")
        self.run_syntax(clear_changes=False)

    def show_changes(self) -> None:
        if not self.last_fix_diff:
            messagebox.showinfo(tr(self.language, "show_changes"), tr(self.language, "no_autofix_changes"))
            return
        window = tk.Toplevel(self)
        window.title(tr(self.language, "changes_title"))
        window.geometry("900x520")
        text = tk.Text(window, wrap="none", font=("Consolas", 10))
        text.pack(side="left", fill="both", expand=True)
        scroll_y = ttk.Scrollbar(window, orient="vertical", command=text.yview)
        scroll_y.pack(side="right", fill="y")
        text.configure(yscrollcommand=scroll_y.set)
        text.insert("1.0", self.last_fix_diff)
        text.configure(state="disabled")

    def resolve_problems(self) -> None:
        report = self.run_syntax()
        problems = self._variable_resolution_items(report)
        if not problems:
            messagebox.showinfo(tr(self.language, "resolve"), tr(self.language, "no_pending_problems"))
            return

        window = tk.Toplevel(self)
        window.title(tr(self.language, "resolve"))
        window.geometry("640x520")
        window.transient(self)
        window.grab_set()

        container = ttk.Frame(window, padding=12)
        container.pack(fill="both", expand=True)
        ttk.Label(container, text=tr(self.language, "pending_problems")).pack(anchor="w")

        canvas = tk.Canvas(container, highlightthickness=0)
        scroll = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        body = ttk.Frame(canvas)
        body.bind("<Configure>", lambda _event: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=body, anchor="nw")
        canvas.configure(yscrollcommand=scroll.set)
        canvas.pack(side="left", fill="both", expand=True, pady=(8, 8))
        scroll.pack(side="right", fill="y", pady=(8, 8))

        selections: dict[str, tk.StringVar] = {}
        for name, suggestions in problems.items():
            frame = ttk.LabelFrame(body, text=f"Variable: {name}", padding=8)
            frame.pack(fill="x", pady=(0, 8))
            declare_label = tr(self.language, "declare_new_variable")
            ignore_label = tr(self.language, "ignore")
            options = suggestions + [declare_label, ignore_label]
            var = tk.StringVar(value=options[0] if suggestions else declare_label)
            selections[name] = var
            for option in options:
                ttk.Radiobutton(frame, text=option, value=option, variable=var).pack(anchor="w")

        actions = ttk.Frame(container)
        actions.pack(fill="x")
        ttk.Button(actions, text=tr(self.language, "cancel"), command=window.destroy).pack(side="right")
        ttk.Button(
            actions,
            text=tr(self.language, "apply"),
            command=lambda: self._apply_resolutions(window, selections),
        ).pack(side="right", padx=(0, 8))

    def _variable_resolution_items(self, report: SyntaxReport) -> dict[str, list[str]]:
        items: dict[str, list[str]] = {}
        for diag in report.errors:
            match = re.match(r"Variable no declarada: ([A-Za-z_][A-Za-z0-9_]*)", diag.message)
            if not match:
                continue
            name = match.group(1)
            suggestions: list[str] = []
            if diag.detail.startswith("Sugerencias: "):
                suggestions = [item.strip() for item in diag.detail.removeprefix("Sugerencias: ").split(",") if item.strip()]
            items[name] = suggestions
        return items

    def _apply_resolutions(self, window: tk.Toplevel, selections: dict[str, tk.StringVar]) -> None:
        text = self.editor.get_text()
        declared: list[str] = []
        log_lines: list[str] = []
        for name, var in selections.items():
            choice = var.get()
            if choice == tr(self.language, "ignore"):
                log_lines.append(f"[INFO] Variable {name} ignorada")
                continue
            if choice == tr(self.language, "declare_new_variable"):
                declared.append(name)
                log_lines.append(f"[INFO] Variable {name} declarada")
                continue
            text = re.sub(rf"\b{re.escape(name)}\b", choice, text)
            log_lines.append(f"[INFO] Variable {name} reemplazada por {choice}")

        if declared:
            text = self._append_to_last_local(text, declared)
        self.editor.set_text(text)
        self.embedded = False
        self.last_fix_diff = ""
        for line in log_lines:
            self._log(line)
        window.destroy()
        self.run_syntax()

    @staticmethod
    def _append_to_last_local(text: str, names: list[str]) -> str:
        lines = text.splitlines()
        last_local = None
        for index, line in enumerate(lines):
            if re.match(r"^\s*Local\s+", line, flags=re.IGNORECASE):
                last_local = index
        if last_local is None:
            insert_at = 1 if lines and lines[0].strip().lower() == "prgm" else 0
            lines.insert(insert_at, "Local " + ",".join(names))
            return "\n".join(lines)
        suffix = "," + ",".join(names)
        lines[last_local] = lines[last_local].rstrip() + suffix
        return "\n".join(lines)

    def _syntax_allows_write(self) -> bool:
        current_text = self.editor.get_text()
        if self.syntax_report is None or self.syntax_text_snapshot != current_text:
            report = self.run_syntax()
        else:
            report = self.syntax_report
        if report.has_errors:
            messagebox.showerror(
                tr(self.language, "syntax_errors_title"),
                tr(self.language, "fix_errors_before_xml_write"),
            )
            return False
        return True

    def _update_analysis_widgets(self, report: SyntaxReport | None) -> None:
        errors = len(report.errors) if report else 0
        warnings = len(report.warnings) if report else 0
        infos = len(report.infos) if report else 0
        self.error_card.value_label.configure(text=str(errors))  # type: ignore[attr-defined]
        self.warning_card.value_label.configure(text=str(warnings))  # type: ignore[attr-defined]
        self.info_card.value_label.configure(text=str(infos))  # type: ignore[attr-defined]
        self.status_counts.configure(text=f"{tr(self.language, 'errors')}: {errors}    {tr(self.language, 'warnings')}: {warnings}")
        self.editor.set_issues(report.diagnostics if report else [])
        self._populate_problem_list()

    def _populate_problem_list(self) -> None:
        for item in self.problem_tree.get_children():
            self.problem_tree.delete(item)
        if not self.syntax_report:
            return
        needle = self.problem_filter.get().strip().lower()
        rows = []
        for diagnostic in self.syntax_report.diagnostics:
            code = getattr(diagnostic, "code_label", "")
            description = translate_problem(self.language, diagnostic.message, diagnostic.detail, code)
            haystack = f"{diagnostic.severity} {diagnostic.line} {description}".lower()
            if needle and needle not in haystack:
                continue
            rows.append((diagnostic.severity, diagnostic.line or "-", description))
        for severity, line, description in rows:
            label = severity_label(self.language, severity)
            self.problem_tree.insert("", "end", values=(label, line, description), tags=(severity,))

    def _jump_to_problem(self, _event: tk.Event | None = None) -> None:
        selected = self.problem_tree.selection()
        if not selected:
            return
        line = self.problem_tree.item(selected[0], "values")[1]
        if str(line).isdigit():
            self.editor.text.mark_set("insert", f"{line}.0")
            self.editor.text.see(f"{line}.0")
            self.editor.text.focus_set()

    def _set_status(self, value: str) -> None:
        self.status.configure(text=f"{tr(self.language, 'status')}: {value}")

    def _log(self, value: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", f"[{time.strftime('%H:%M:%S')}] {value}\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _clear_log(self) -> None:
        self.log.configure(state="normal")
        self.log.delete("1.0", "end")
        self.log.configure(state="disabled")

    @staticmethod
    def _set_text_widget(widget: tk.Text, value: str) -> None:
        widget.configure(state="normal")
        widget.delete("1.0", "end")
        widget.insert("1.0", value)
        widget.configure(state="disabled")

    def _cleanup_stage(self) -> None:
        if self.stage_dir and self.stage_dir.exists():
            shutil.rmtree(self.stage_dir, ignore_errors=True)
        self.stage_dir = None

    def destroy(self) -> None:
        self._cleanup_stage()
        super().destroy()


def main() -> None:
    app = TIXMLEditorApp()
    app.mainloop()


if __name__ == "__main__":
    main()
