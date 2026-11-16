import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base relativa: funciona igual en https://usuario.github.io/repo/ que en la raíz
export default defineConfig({
  base: './',
  server: { host: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Taller Turbo',
        short_name: 'Taller Turbo',
        description: 'Arma tu coche pieza por pieza y sal a pasear.',
        lang: 'es',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#151833',
        theme_color: '#151833',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2,woff}'],
      },
    }),
  ],
});
