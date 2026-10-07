import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const projectDirectory = fileURLToPath(new URL('.', import.meta.url))


function figmaAssetResolver(): Plugin {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(projectDirectory, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(projectDirectory, './src'),
    },
  },
  server: {
    fs: {
      // Retain Vite's defaults and deny local database backups over HTTP.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**',
        '**/supabase/schema/private/**', '**/supabase/.temp/**'],
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
