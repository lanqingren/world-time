import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  clearScreen: false,
  server: { port: 1430, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  build: {
    target: ["es2021", "safari14", "chrome105"],
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        picker: resolve(__dirname, "picker.html"),
      },
    },
  },
});
