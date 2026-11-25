import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Khi chạy `npm run dev`, mọi request /api sẽ được chuyển sang backend Django (cổng 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
