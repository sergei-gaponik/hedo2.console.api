require("module-alias/register")
require("reflect-metadata")
require("dotenv").config()

import 'isomorphic-fetch'
import { bold, cyan, yellow } from 'colors/safe'
import * as fs from 'fs'
import * as path from 'path'
import { MongoClient } from 'mongodb'
import * as urql from 'urql/core'
import Fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import handler from './core/handler'
import { VERSION, PRODUCTION } from './core/const'
import { setContext } from './core/context'

async function main() {

  console.log(`${bold(yellow('CONSOLE API'))} v${VERSION}\n`);
  console.log(`env: ${PRODUCTION ? bold(cyan("PRODUCTION")) : bold(yellow("DEVELOPMENT"))}`);

  const { PORT, HOST, MONGODB_INSTANCE, SYSTEM_API_ENDPOINT } = process.env;
  
  console.log('connecting to mongo db...');

  const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }

  const mongoDB = await MongoClient.connect(MONGODB_INSTANCE, mongoOptions)
    .then(client => client.db());

  console.log('initializing graphql client');

  const urqlClient = urql.createClient({ 
    url: SYSTEM_API_ENDPOINT, 
    requestPolicy: "network-only"
  });
  
  setContext({ urqlClient, mongoDB })

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
    console.log(`\napp running on ${cyan(`https://${HOST}:${PORT}`)}`);
    console.log(`api endpoint ${cyan(`https://${HOST}:${PORT}/api`)}`);
  })

}

main()