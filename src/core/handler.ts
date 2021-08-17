import { FastifyRequest, FastifyReply } from 'fastify'
import { ConsoleRequest, ConsoleRequestError, ConsoleResponse } from '../types'
import routes from './routes'


export default async function handler(req: FastifyRequest, reply: FastifyReply) {
  
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

  reply.code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(_r);

}