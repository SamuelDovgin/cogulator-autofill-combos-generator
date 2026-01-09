import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { checker } from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [checker({ typescript: true }), react(), svgr(), tailwindcss()],
});
