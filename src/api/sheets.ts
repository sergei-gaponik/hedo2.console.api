import { ConsoleRequestError, ConsoleResponse, CheckSheetResponse, Sheet, SheetMap } from '../types';
import * as products from '../sheets/products'
import * as brands from '../sheets/brands'
import * as series from '../sheets/series'
import * as productCategories from '../sheets/productCategories'
import * as productProperties from '../sheets/productProperties'
import * as productPropertyCategories from '../sheets/productPropertyCategories'
import * as productKeywords from '../sheets/productKeywords'

interface CheckSheetResponseMap{
  [key: string]: CheckSheetResponse
}

interface SheetAPIArgs{
  collections: string[]
}

const routes: SheetMap = {
  products,
  brands,
  series,
  productCategories,
  productProperties,
  productPropertyCategories,
  productKeywords
}

const sheetIsValid = (a: CheckSheetResponse) => 
  !a.errors?.length && 
  !a.validationErrors?.length && 
  a.overviewResponse.ok

export async function checkSheets(args: SheetAPIArgs): Promise<ConsoleResponse>{

  let data = {}

  for(const collection of args.collections){
    if(!routes[collection]?.check)
      return { errors: [ ConsoleRequestError.badRequest ]};

    data[collection] = await routes[collection].check()
    data[collection].ok = sheetIsValid(data[collection])

    if(data[collection].errors?.length){
      return { errors: data[collection].errors }
    }
  }

  return { data }
}

export async function commitSheets(args: SheetAPIArgs): Promise<ConsoleResponse>{
  
  let checks: CheckSheetResponseMap = {}

  for(const collection of args.collections){
    if(!routes[collection]?.check)
      return { errors: [ ConsoleRequestError.badRequest ]};

    checks[collection] = await routes[collection].check()
  }

  if(Object.values(checks).some(a => !sheetIsValid(a)))
    return { errors: [ ConsoleRequestError.conflict ]};

  for(const collection of args.collections){

    const { updated, inserted, deletedIds } = checks[collection].overviewResponse

    if(updated.length + inserted.length + deletedIds.length == 0)
      continue;
      
    const r = await routes[collection].commit({ updated, inserted, deletedIds })

    if(r.errors?.length)
      return { errors: [ ConsoleRequestError.internalServerError ]};
  }

  return {}
}

export async function resetSheets(args: SheetAPIArgs): Promise<ConsoleResponse>{
  for(const collection of args.collections){
    if(!routes[collection]?.reset)
      return { errors: [ ConsoleRequestError.badRequest ]};

    const r = await routes[collection].reset()

    if(r.errors?.length)
      return { errors: [ ConsoleRequestError.internalServerError ]};
  }

  return {}
}