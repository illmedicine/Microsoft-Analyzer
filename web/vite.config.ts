import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: { port: 5173, fs: { allow: [".."] }, proxy: { "/api": { target: "http://localhost:8787", changeOrigin: false } } },
  build: { chunkSizeWarningLimit: 1500 },
});
