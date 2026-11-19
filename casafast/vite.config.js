import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CASAFAST - Sistema Inmobiliario',
        short_name: 'CASAFAST',
        description: 'Plataforma Inmobiliaria PWA',
        theme_color: '#00769D',
        background_color: '#060D1D',
        display: 'standalone'
      }
    })
  ]
});