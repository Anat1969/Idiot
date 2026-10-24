import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // נתיבים יחסיים: האפליקציה רצה גם ב-Vercel וגם מתיקייה בגיטהאב (ענף gh-pages)
  base: './',
  plugins: [react()],
});
