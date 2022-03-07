
import { context } from '../core/context'
import fetch from 'node-fetch'


interface MicrosoftGraphHandlerArgs{
  path: string,
  method?: string,
  body?: any
}

interface MicrosoftGraphHandlerResponse{
  data: any,
  ok: boolean
}

export default async function microsoftGraphHandler(args: MicrosoftGraphHandlerArgs): Promise<MicrosoftGraphHandlerResponse>{


  const tokenRequest = {
    scopes: [process.env.GRAPH_ENDPOINT + '/.default'],
  }

  const authResponse = await context().microsoftGraphClient.acquireTokenByClientCredential(tokenRequest)

  const r = await fetch(`${process.env.GRAPH_ENDPOINT}/${process.env.GRAPH_VERSION}/${args.path}`, {
    method: args.method || "GET",
    headers: {
      "Authorization": `Bearer ${authResponse.accessToken}`
    },
    body: args.body
  })

  if(r.ok){
    
    const data = await r.json()

    return { data, ok: true }
  }

  return { data: null, ok: false }
}