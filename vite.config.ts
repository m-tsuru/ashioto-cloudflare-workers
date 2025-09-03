import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin(), svelte()]
})
