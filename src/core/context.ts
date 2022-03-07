import { Db } from "mongodb"
import { ConfidentialClientApplication } from '@azure/msal-node'

export interface Context {
  mongoDB?: Db,
  microsoftGraphClient?: ConfidentialClientApplication
}

let _context = {}


export const setContext = (context: Context) => {
  _context = Object.assign(_context, context)
}
export const context = (): Context => _context