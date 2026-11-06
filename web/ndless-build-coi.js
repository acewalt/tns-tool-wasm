(() => {
  "use strict";

  // The dedicated LLVM/Clang ARM toolchain is built with LLVM_ENABLE_THREADS=OFF,
  // so Build TNS no longer needs SharedArrayBuffer or cross-origin isolation.
  // Clean up the temporary isolation shim used by the discarded Wasmer provider.
  const keys = [
    "tns-tool-ndless-coi-attempt-v1",
    "tns-tool-ndless-coi-resume-v1",
    "tns-tool-ndless-coi-autobuild-v1",
  ];
  for (const key of keys) {
    try { sessionStorage.removeItem(key); } catch (_) {}
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations?.().then(registrations => {
      for (const registration of registrations || []) {
        const url = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || "";
        if (/\/ndless-coi-sw\.js(?:\?|$)/.test(url)) registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
})();
