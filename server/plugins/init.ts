import { initDatabase } from '../database/client'
import { loadConfig } from '../config'
import { initializePool } from '../services/pool/manager'

export default defineNitroPlugin(async () => {
  loadConfig()
  console.log('[plugin] Config loaded')

  initDatabase()
  console.log('[plugin] Database initialized')

  // Delayed pool init to allow server to start first
  setTimeout(() => {
    initializePool().catch(err => {
      console.error('[plugin] Pool initialization error:', err.message)
    })
  }, 500)
})
