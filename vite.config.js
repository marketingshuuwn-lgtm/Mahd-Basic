import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // روابط الاستعراض المؤقتة تعمل على نطاقات فرعية تابعة للمنصة.
    allowedHosts: ['.manus.computer'],
  },
});
