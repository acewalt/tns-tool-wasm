import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        "monaco-lua-editor": "src/ui/monaco-lua-editor.js",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] || assetInfo.name || "";
          return name.endsWith(".css") ? "monaco-lua-editor.css" : "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
