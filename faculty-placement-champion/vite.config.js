import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  server: {
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        verify: resolve(__dirname, "verify.html"),
      },
    },
  },
});
