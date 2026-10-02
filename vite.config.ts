import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 相対パスでビルドし、GitHub Pages のサブパス（/gkms-sim/）でもローカルでも動くようにする
export default defineConfig({
  base: "./",
  plugins: [react()],
});
