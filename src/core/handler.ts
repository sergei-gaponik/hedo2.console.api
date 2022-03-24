import { FastifyRequest, FastifyReply } from 'fastify'
import { ConsoleRequest, ConsoleRequestError, ConsoleResponse } from '../types'
import routes from './routes'
import { performance } from 'perf_hooks'

export default async function handler(req: FastifyRequest, reply: FastifyReply) {
  
  const startTime = performance.now()

  const _r = await (async (): Promise<ConsoleResponse> => {

    if(req.headers["authorization"] != `Bearer ${process.env.SECRET_KEY}`)
      return { errors: [ ConsoleRequestError.permissionDenied ] }
    
    if(!req.headers["content-type"]?.includes("application/json"))
      return { errors: [ ConsoleRequestError.wrongContentType ] };
    
    const body: ConsoleRequest = req.body;

    try{

      let args: any = body.args || {}

      if(!routes.hasOwnProperty(body.path))
        return { errors: [ ConsoleRequestError.pathNotFound ] };

      return await routes[body.path](args);
    }
    catch(e){
      console.log(e)
      return { errors: [ ConsoleRequestError.internalServerError ] };
    }

  })()

  const execTime = Math.round((performance.now() - startTime) * 100) / 100

  let _log: any = { 
    path: (req.body as any).path,
    collections: (req.body as any).args?.collections,
    execTime,
  }

  if(_r.errors)
    _log.errors = _r.errors

  console.log(_log)

  reply.code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(_r);

}