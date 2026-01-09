import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { checker } from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/cogulator-autofill-combos-generator/', // <-- replace <REPO> with your GitHub repo name exactly
  plugins: [checker({ typescript: true }), react(), svgr(), tailwindcss()],
});
