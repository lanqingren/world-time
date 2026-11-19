import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: { port: 1430, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  build: {
    target: ["es2021", "safari14", "chrome105"],
    rollupOptions: {
      // relative to the project root, where builds run; no Node path helpers, so no @types/node needed
      input: { main: "index.html", picker: "picker.html" },
    },
  },
});
