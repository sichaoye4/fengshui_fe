import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendApiBaseUrl = env.FENGSHUI_API_BASE_URL ?? "http://127.0.0.1:8000";
  const apiProxy = {
    target: backendApiBaseUrl,
    changeOrigin: true,
    secure: false
  };

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": apiProxy
      }
    },
    preview: {
      proxy: {
        "/api": apiProxy
      }
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/testSetup.ts",
      css: true
    }
  };
});
