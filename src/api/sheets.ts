import { ConsoleRequestError, ConsoleResponse, CheckSheetResponse, Sheet, SheetMap } from '../types';
import * as products from '../sheets/products'
import * as brands from '../sheets/brands'

interface CheckSheetResponseMap{
  [key: string]: CheckSheetResponse
}

const routes: SheetMap = {
  products,
  brands
}

async function checkSheets(args): Promise<ConsoleResponse>{

  let data = {}

  for(const collection of args.collections){
    if(!routes[collection]?.check)
      return { errors: [ ConsoleRequestError.badRequest ]};

    data[collection] = await routes[collection].check()
  }

  return { data }
}

async function commitSheets(args): Promise<ConsoleResponse>{
  
  let checks: CheckSheetResponseMap = {}

  for(const collection of args.collections){
    if(!routes[collection]?.check)
      return { errors: [ ConsoleRequestError.badRequest ]};

    checks[collection] = await routes[collection].check()
  }

  if(Object.values(checks).some(a => a.errors?.length))
    return { errors: [ ConsoleRequestError.conflict ]};

  for(const collection of args.collections){
    const r = await routes[collection].commit()

    if(r.errors?.length)
      return { errors: [ ConsoleRequestError.internalServerError ]};
  }

  return {}
}

async function resetSheets(args): Promise<ConsoleResponse>{
  for(const collection of args.collections){
    if(!routes[collection]?.reset)
      return { errors: [ ConsoleRequestError.badRequest ]};

    const r = await routes[collection].reset()

    if(r.errors?.length)
      return { errors: [ ConsoleRequestError.internalServerError ]};
  }

  return {}
}

export {
  checkSheets,
  commitSheets,
  resetSheets,
}