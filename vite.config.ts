import { defineConfig, loadEnv, type Plugin } from 'vite'
import { assertPublicEnvironment } from './src/app/lib/publicConfigSecurity'
import { fileURLToPath } from 'node:url'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { seoPlugin } from './scripts/seoPlugin'

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

export default defineConfig(({ mode }) => {
  assertPublicEnvironment(loadEnv(mode, projectDirectory, 'VITE_'))
  const mobile = mode === 'mobile'
  return {
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Native bundles start locally and must not prerender/download the public catalog.
    ...(mobile ? [{ name: 'mobile-document', transformIndexHtml: (html: string) =>
      html.replace('<!-- pinwi:seo -->', '<title>Pinwi</title><meta name="robots" content="noindex, nofollow" />'),
    }] : [seoPlugin()]),
  ],
  build: { outDir: mobile ? 'dist-mobile' : 'dist' },
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(projectDirectory, './src'),
    },
  },
  // Local reports and browser profiles are not application entry points.
  optimizeDeps: { entries: ['index.html'] },
  server: {
    watch: { ignored: ['**/docs-local/**', '**/supabase/schema/**', '**/supabase/migrations/**'] },
    fs: {
      // Retain Vite's defaults and deny local database backups over HTTP.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**',
        '**/docs-local/**', '**/supabase/schema/**', '**/supabase/migrations/**', '**/*.sql',
        '**/supabase/.temp/**', '**/.agents/**', '**/.codex/**', '**/.aws/**'],
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
