import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.loadEnvFile(path.resolve(__dirname, '../../../../.env'))
