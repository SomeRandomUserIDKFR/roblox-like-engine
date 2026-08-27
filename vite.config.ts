import { defineConfig } from "vite";

export default defineConfig({
  appType: "spa",
  server: {
    port: 5173,
    open: true,
  },
  preview: {
    port: 4173,
  },
});
