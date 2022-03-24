require("module-alias/register")
require("reflect-metadata")
require("dotenv").config()

import 'isomorphic-fetch'
import { bold, cyan, yellow } from 'colors/safe'
import * as fs from 'fs'
import * as path from 'path'
import { MongoClient } from 'mongodb'
import Fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import handler from './core/handler'
import { VERSION, PRODUCTION } from './core/const'
import { setContext } from './core/context'
import { ConfidentialClientApplication } from '@azure/msal-node'
import { initConsole } from '@sergei-gaponik/hedo2.lib.util'

async function main() {

  initConsole(console)

  console.log(`${bold(yellow('CONSOLE API'))} v${VERSION}\n`);
  console.log(`env: ${PRODUCTION ? bold(cyan("PRODUCTION")) : bold(yellow("DEVELOPMENT"))}`);

  const { PORT, HOST, MONGODB_INSTANCE } = process.env;
  
  console.log('connecting to mongo db...');

  const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
  
  const mongoDB = await MongoClient.connect(MONGODB_INSTANCE, mongoOptions)
  .then(client => client.db());
  
  console.log('initializing microsoft graph client...');
  
  const msalConfig = {
    auth: {
      clientId: process.env.AUTH_CLIENT_ID,
      authority: process.env.AUTH_AUTHORITY,
      clientSecret: process.env.AUTH_CLIENT_SECRET,
    }
  }

  const microsoftGraphClient = new ConfidentialClientApplication(msalConfig)

  setContext({ mongoDB, microsoftGraphClient })

  console.log('initializing server...');

  const app = Fastify({
    https: {
      key: fs.readFileSync(path.join(__dirname, '../.ssl/key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../.ssl/cert.pem'))
    }
  })

  app.register(fastifyCors)
  app.post('/api', (req, res) => handler(req, res));


  app.listen(PORT, () => {
    console.log(`app running on ${cyan(`https://${HOST}:${PORT}`)}`);
    console.log(`api endpoint ${cyan(`https://${HOST}:${PORT}/api`)}`);
  })

}

main()