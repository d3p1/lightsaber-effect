import tailwindcss from '@tailwindcss/vite'

export default {
  root: 'src/',
  base: '/lightsaber-effect/',
  server: {
    host: true,
  },
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [
    tailwindcss(),
  ]
}
