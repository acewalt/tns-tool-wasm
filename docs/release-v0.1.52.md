# TNS Tool Portable 0.1.52 — Lua Visual Builder V6

- Logic starts in Advanced mode; Simple remains synchronized.
- Typed contextual creation from inputs and outputs, fixed wire endpoints, placement preview and atomic undo.
- Navigation destination picker, including off-screen pages and create-and-connect, with safe reconnection and keyboard search.
- Fixed socket geometry, measured navigation spacing, balanced disconnected-page layout, nested inline text positioning and bounded debug values.
- Progressive native reconstruction of original TNS Tool Lua templates without Visual Builder metadata. Forms expose editable input bindings and math nodes; the original and pending behaviors remain available for comparison.
- Shared browser/portable assets and refreshed module URLs.

Conversion is partial for custom callbacks, dynamic navigation, menu interaction and popups. Pending behavior must be reviewed before replacing the original. The original source is preserved. This release does not claim equivalent conversion of arbitrary Lua or full hardware emulation.

Validated with the Visual Builder regression suite, real Electron pointer/keyboard tests, original-versus-converted form execution and a build/extract/execute TNS round trip. Local portable verification includes offline resources and ZIP integrity.
