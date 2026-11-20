import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://linv.dev',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
  devToolbar: { enabled: false },
});
