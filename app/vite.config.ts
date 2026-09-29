import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // .env lives at the repo root, one level above this package.
  envDir: "..",
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
