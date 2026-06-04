/**
 * Nome: postcss.config.mjs
 * Função: Configura o processamento CSS usado pelo Tailwind e pelo Next.js.
 */

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
}

export default config
