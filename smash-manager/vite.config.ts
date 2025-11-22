import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ★重要: サーバー上のフォルダ名に合わせてください (ここでは /smash/ と仮定)
  base: '/smash/', 
})