import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const resolveFromRoot = (...segments: string[]) => path.resolve(currentDir, ...segments);

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": resolveFromRoot("client", "src"),
      "@shared": resolveFromRoot("shared"),
      "@assets": resolveFromRoot("attached_assets"),
    },
  },
  envDir: currentDir,
  root: resolveFromRoot("client"),
  publicDir: resolveFromRoot("client", "public"),
  build: {
    outDir: resolveFromRoot("dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
