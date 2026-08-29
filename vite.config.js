import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pagesのプロジェクトサイト（https://<user>.github.io/steam-wishlist-tracker/）用のbase設定。
  // リポジトリ名を変更した場合はここも合わせて変更する。
  base: '/steam-wishlist-tracker/',
  plugins: [react()],
})
