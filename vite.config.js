import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_DEPLOY_TARGET === "github-pages" ? "/thwebkris/" : "/",
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
