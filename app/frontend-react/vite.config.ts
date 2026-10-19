import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api is proxied to the Laravel backend (dev server and preview)
const target = process.env.API_URL || 'http://localhost:8000';
const proxy = { '/api': { target, changeOrigin: true } };

export default defineConfig({ plugins: [react()], server: { proxy, allowedHosts: true }, preview: { proxy, allowedHosts: true } });
