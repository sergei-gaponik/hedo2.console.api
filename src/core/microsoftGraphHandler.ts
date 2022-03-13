
import { context } from '../core/context'
import fetch, { RequestInit } from 'node-fetch'


interface MicrosoftGraphHandlerArgs{
  path?: string,
  method?: string,
  body?: any,
  batch?: MicrosoftGraphHandlerArgs[]
}

interface MicrosoftGraphHandlerResponse{
  data: any,
  ok: boolean
}

const getBatchBody = batch => ({
  requests: batch.map((_request, i) => ({
    id: (i + 1).toString(),
    dependsOn: i > 0 ? [ i.toString() ] : undefined,
    method: _request.method || "GET",
    url: "/" + _request.path,
    headers: { 
      "Content-Type": "application/json"
    },
    body: _request.body || {}
  })),
  headers: {
    "Content-Type": "application/json"
  }
})

export default async function microsoftGraphHandler(args: MicrosoftGraphHandlerArgs): Promise<MicrosoftGraphHandlerResponse>{

  const tokenRequest = {
    scopes: [process.env.GRAPH_ENDPOINT + '/.default'],
  }

  const authResponse = await context().microsoftGraphClient.acquireTokenByClientCredential(tokenRequest)

  const method = args.batch ? 'POST' : args.method || 'GET'

  let fetchArgs: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${authResponse.accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
  }

  if(method != "GET"){
    fetchArgs.body = JSON.stringify(args.batch ? getBatchBody(args.batch) : args.body || {})
  }

  const r = await fetch(`${process.env.GRAPH_ENDPOINT}/${process.env.GRAPH_VERSION}/${args.batch ? "$batch" : args.path}`, fetchArgs)

  if(r.ok){
    try{

      const data = await r.json()
  
      return { data, ok: true }
    }
    catch(e){
      return { data: null, ok: true }
    }
    
  }
  console.log(await r.json())
  
  return { data: null, ok: false }
}