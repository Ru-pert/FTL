import { defineConfig } from 'vitest/config';

// Relativer Basispfad: Das Spiel läuft unter jeder Adresse, auch wenn das Repo umbenannt wird.
export default defineConfig({
  base: './',
  test: { environment: 'node' },
});
