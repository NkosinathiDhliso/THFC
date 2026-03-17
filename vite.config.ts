import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Only generate bundle visualizer in development mode
    ...(mode === 'development' ? [
      visualizer({
        filename: 'bundle-stats.html', // Outside dist folder
        open: false, // Don't auto-open
        gzipSize: true,
        brotliSize: true,
      })
    ] : []),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          
          // External services
          supabase: ['@supabase/supabase-js'],
          
          // UI libraries
          icons: ['lucide-react'],
          
          // State management
          state: ['zustand'],
          
          // Utilities
          utils: ['jszip'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging in production
    sourcemap: false,
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      port: 5174,
    },
    force: true, // Force dependency pre-bundling
  },
}));