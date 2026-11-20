import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  build: {
    // Sourcemaps non publiées en production (évite d'exposer le code source)
    sourcemap: mode === "development",
  },

  // En production, les console.log/info/debug sont retirés : ils affichaient
  // des données personnelles dans la console du navigateur.
  esbuild: mode === "production" ? { pure: ["console.log", "console.info", "console.debug"] } : undefined,

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
