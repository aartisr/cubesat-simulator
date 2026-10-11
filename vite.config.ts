import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const asOrigin = (value?: string) => {
  if (!value) return 'https://github.com/aartisr/cubesat-simulator';
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/$/, '');
};

const siteOrigin = asOrigin(
  process.env.VITE_SITE_URL
  ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
  ?? process.env.VERCEL_URL,
);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'astroneer-site-identity',
        transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteOrigin),
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
