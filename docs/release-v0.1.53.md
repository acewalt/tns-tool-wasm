# TNS Tool Portable 0.1.53 — Lua source reconstruction and document context

- Visual Capture can recover source-linked labels and rectangles drawn through helpers or class fields. Safe edits update the original Lua; ambiguous or shared drawing coordinates remain protected.
- Added an **Edit running screen** action to reconstruct the current preview without replacing the original program. Existing callbacks and custom logic remain in the source.
- Visual Builder previews receive the document's stored TI-BASIC functions and variables. ProbasMaster's four Func symbols are available in that context.
- Calculator restores and saves the pending input separately from its history. SuperEspace opens with its stored `supergeo()` call ready to submit, without executing it automatically.
- Improved symbolic matrix output, `Text` confirmation dialogs and finite numeric definite integrals used by stored functions such as `erf` and `erfc`.
- XML ZIP downloads use the document's filename. Visual Builder menus close on another menu, an action, an outside click or Escape.
- Browser and portable resources are synchronized, with refreshed cache URLs.

Validated with ProbasMaster, SuperEspace and ABA Logique fixtures: real Lua drawing capture, source edits followed by execution, document function calls, SuperEspace's six-coordinate procedure, pending-input save/clear and TNS build/extract checks. Regression tests cover exact output and preserved native history.

Conversion remains partial: this release preserves arbitrary Lua behavior in the original source rather than claiming to translate every callback into editable nodes. Runtime capture only reveals screens that have been visited. Definite integration supports finite numeric bounds; symbolic calculus still uses the CAS. Physical-calculator execution has not been verified for this release.
