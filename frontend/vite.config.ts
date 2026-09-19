import { createHash } from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Each checkout or worktree gets its own stable port, so parallel agents never
// end up looking at each other's server. strictPort turns a clash into an error
// rather than a silent move to the next port.
const portOffset =
  createHash("sha1").update(process.cwd()).digest().readUInt16BE(0) % 1000;

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.pdf", "**/*.docx"],
  plugins: [react()],
  server: { port: 5200 + portOffset, strictPort: true },
  preview: { port: 6200 + portOffset, strictPort: true },
});
