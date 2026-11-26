# TNS Tool Portable 0.1.48 — Lua Visual Builder V2

- One canonical event graph shared by Design, properties, Navigation and Lua code. Existing V1 projects migrate with an archive of conflicting old representations.
- Fix stale drag/focus and queued actions after page changes, including the Menu back-button mouseMove error. Preview reports runtime failures instead of a successful Ready state.
- Double-click labels/buttons to edit text; Enter saves and Esc cancels. Widget Tree, hierarchy/locks, multiselection, eight resize handles, keyboard moves, fit/zoom/pan and adjustable panels.
- Contextual node search, drag-to-connect typed sockets, empty-space creation, minimap, auto layout, comments/group labels, property selectors, undo/redo and reusable flows.
- Navigation map with shared-renderer thumbnails, drag-to-configure destinations, conditional links and history-aware Back.
- Twelve template choices and formula-to-operator nodes. Debug preview adds action traces, target values, breakpoints, Step and Resume. Normal exported TNS does not enable this instrumentation.
- Spanish, English and French controls; local web and Windows operation using the existing Lua preview and TNS exporter.

Validation: 25 builder unit/regression tests, the full repository test command, offline browser integration and TNS roundtrip. Packaged Windows checks are recorded during release preparation. Physical calculator testing remains required; see the [builder guide](lua-visual-builder.md).
