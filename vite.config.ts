import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption, loadEnv } from "vite";
import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env vars
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      // DO NOT REMOVE
      createIconImportProxy() as PluginOption,
      sparkPlugin() as PluginOption,
    ],
    resolve: {
      alias: {
        '@': resolve(projectRoot, 'src')
      }
    },
    build: {
      // Production optimizations
      minify: isProduction ? 'terser' : false,
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          // Code splitting for better caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-button'],
            charts: ['recharts', 'd3'],
            icons: ['@phosphor-icons/react'],
            ml: ['./src/services/mlServiceOptimized', './src/services/machineLearning']
          }
        }
      },
      // Warn about large chunks
      chunkSizeWarningLimit: parseInt(env.VITE_BUNDLE_SIZE_LIMIT || '2048'),
      // Optimize dependencies
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@phosphor-icons/react',
        'clsx',
        'tailwind-merge'
      ]
    },
    // Development server config
    server: {
      port: 5173,
      host: true,
      // Hot reload optimizations
      hmr: {
        overlay: true
      }
    },
    // Preview server config
    preview: {
      port: 5173,
      host: true
    },
    // Environment variable handling
    define: {
      // Replace env vars at build time for tree-shaking
      __DEV__: !isProduction,
      __VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
    }
  }
});
