import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: GitHub Pages (https://<user>.github.io/birdstrike-config/) 用。
// ローカル開発 (vite dev) はルートのまま。
export default defineConfig(({ command }) => ({
	plugins: [react()],
	base: command === 'build' ? '/birdstrike-config/' : '/',
	server: { port: 8000 },
}));
