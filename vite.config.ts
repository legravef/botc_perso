/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// Déployée sur GitHub Pages en tant que "project page" (github.com/legravef/botc_perso), donc
// servie sous /botc_perso/ et non à la racine du domaine — toutes les URLs générées (assets,
// manifest PWA, service worker) doivent tenir compte de ce sous-chemin.
const BASE_PATH = '/botc_perso/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      base: BASE_PATH,
      // Cette app est pensée pour être utilisée hors-ligne à table (voir CLAUDE.md) : tout
      // l'état de jeu vit déjà dans localStorage, il ne manquait que l'installabilité et le
      // cache de l'app shell pour un vrai fonctionnement sans réseau.
      manifest: {
        name: 'Assistant Conteur — Blood on the Clocktower',
        short_name: 'Assistant Conteur',
        description: "Assistant hors-ligne pour le Conteur de Blood on the Clocktower (Trouble Brewing).",
        theme_color: '#0d0e13',
        background_color: '#0d0e13',
        display: 'standalone',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: 'favicon-logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'favicon-logo.png', sizes: '434x434', type: 'image/png' },
          { src: 'favicon-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // Les fiches imprimables (plusieurs Mo chacune) sont des documents optionnels : les
        // précacher gonflerait l'installation initiale de l'app pour un contenu que beaucoup
        // de Conteurs n'ouvriront jamais — et dépasse de toute façon la limite de 2 Mo par
        // fichier de Workbox. Elles sont donc mises en cache à la première consultation, ce
        // qui suffit à les garder disponibles hors-ligne une fois vues.
        globIgnores: ['guides/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/guides/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fiches-imprimables',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
