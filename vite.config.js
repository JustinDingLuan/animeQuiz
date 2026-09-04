import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // 暫定用 port 3000
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  // vite 7 使用 rollupOptions 來設定多頁面入口
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, './index.html'),
        gameEntry: resolve(import.meta.dirname, './gameEntry.html'),
        quiz: resolve(import.meta.dirname, './quiz.html'),
        gameResult: resolve(import.meta.dirname, './gameResult.html'),
      },
    },
  }
});
