(() => {
  "use strict";
  const registry = window.TnsContainerRegistry;
  if (!registry?.getAdapter || !registry?.register) return;
  const nzp = registry.getAdapter("nzp");
  if (nzp) registry.register({ ...nzp, editorGlobal: "TnsStructuredContentEditor" });
})();