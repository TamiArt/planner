import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    cacheDir: '.vite-cache',
    plugins: [react()],
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom'],
                    pdf: ['pdf-lib'],
                    utils: ['zustand', 'zod', 'date-fns', 'nanoid', 'clsx'],
                },
            },
        },
    },
});
