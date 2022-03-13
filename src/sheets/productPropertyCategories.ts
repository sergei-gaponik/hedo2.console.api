import { CheckSheetResponse, Color, CommitSheetArgs, ConsoleRequestError, ConsoleResponse } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { validateSheetValues, isValidName, isValidDescription } from "../util/validation"
import { overview } from '../util/overview'
import { ProductPropertyCategory } from '@sergei-gaponik/hedo2.lib.models'
import { getFillsForSheetReset } from '../util/misc'
import { deleteProductPropertyCategories, getAllProductPropertyCategories, upsertProductPropertyCategories } from '../crud/productPropertyCategories'

const SHEET_NAME = "Eigenschaftskategorien"
const SHEET_HEAD = ["ID", "Handle", "Name", "Beschreibung (optional)"]

const POS = {
  id: 0,
  handle: 1,
  name: 2,
  description: 3,
}

export async function check(): Promise<CheckSheetResponse>{
  
  const cells = await readFromSheet(SHEET_NAME)
  const productPropertyCategories = await getAllProductPropertyCategories()

  const overviewResponse = overview(cells, productPropertyCategories, {
    [POS.name]: (name, item: ProductPropertyCategory) => (!item.name && !name) || name == item.name,
    [POS.description]: (description, item: ProductPropertyCategory) => (!item.description && !description) || description == item.description,
    [POS.handle]: () => true
  })

  const validationErrors = validateSheetValues(cells, {
    [POS.name]: (name: string) => isValidName(name),
    [POS.description]: (description: string) => !description || isValidDescription(description),
    [POS.handle]: () => true
  })

  return { 
    overviewResponse,
    validationErrors 
  }
}

export async function commit(args: CommitSheetArgs): Promise<ConsoleResponse>{

  const { deletedIds, updated, inserted } = args

  const upserts = [ ...updated, ...inserted ].map(row => ({
    _id: row[POS.id] as string,
    name: row[POS.name] as string,
    description: row[POS.description] as string, 
  }))

  const r = await upsertProductPropertyCategories(upserts)

  if(r.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  const r2 = await deleteProductPropertyCategories(deletedIds)
  
  if(r2.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const productPropertyCategories = await getAllProductPropertyCategories()

  const values = productPropertyCategories.map(productPropertyCategory => Object.values({
    [POS.id]: productPropertyCategory._id,
    [POS.name]: productPropertyCategory.name || "",
    [POS.description]: productPropertyCategory.description || "",
    [POS.handle]: productPropertyCategory.handle || ""
  }))

  const fills = getFillsForSheetReset(values.length, SHEET_HEAD.length, {
    [POS.id]: Color.immutable,
    [POS.handle]: Color.immutable,
  })

  const ok = await writeToSheet(SHEET_NAME, SHEET_HEAD, values, fills)

  if(!ok){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}