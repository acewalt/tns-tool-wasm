/*
 * Cross-origin isolation shim for static hosting (GitHub Pages).
 * Registered lazily by ndless-build-coi.js only when Build TNS is used.
 * It adds the COOP/COEP headers required by SharedArrayBuffer/WASIX.
 */
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  event.respondWith((async () => {
    const response = await fetch(request);
    let url;
    try { url = new URL(request.url); } catch (_) { return response; }

    // Only rewrite our own GitHub Pages responses. Cross-origin CORS requests
    // (for example unpkg modules) keep their original response semantics.
    if (url.origin !== self.location.origin || response.type === "opaque") return response;

    const headers = new Headers(response.headers);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  })());
});
