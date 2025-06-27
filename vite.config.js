import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Check if certificates exist, otherwise use regular HTTP
const certsDir = path.resolve('./certs')
const useHttps = fs.existsSync(path.join(certsDir, 'localhost-key.pem')) && 
                 fs.existsSync(path.join(certsDir, 'localhost.pem'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    ...(useHttps ? {
      https: {
        key: fs.readFileSync(path.join(certsDir, 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(certsDir, 'localhost.pem')),
      }
    } : {}),
  }
})