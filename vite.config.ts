import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages는 https://<아이디>.github.io/<저장소명>/ 처럼 하위 경로에 올라가므로
  // 파일 경로를 상대 경로('./')로 만들어 어느 경로에 올려도 동작하게 한다.
  base: './',
})
