/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { checkMessages } from './scripts/check-messages.mjs';

await checkMessages();

export default defineConfig({
  plugins: [
    react(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['globalVariable', 'baseLocale'],
      emitTsDeclarations: true,
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // UI-03-web R28 (D19): con un worker por núcleo, la contención de CPU (jsdom + user-event)
    // llevaba pruebas largas de ~2 s a más de 5 s. La mitad de los núcleos es más rápido en total
    // y estable; el `testTimeout` global no se toca.
    maxWorkers: '50%',
  },
});
