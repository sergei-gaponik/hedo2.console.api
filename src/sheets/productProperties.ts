

import { CheckSheetResponse, CommitSheetArgs, ConsoleRequestError, ConsoleResponse, Color } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { validateSheetValues, isValidName, isValidDescription } from "../util/validation"
import { overview } from '../util/overview'
import { ProductProperty } from '@sergei-gaponik/hedo2.lib.models'
import { deleteProductProperties, getAllProductProperties, upsertProductProperties } from '../crud/productProperties'
import { getAllProductPropertyCategories } from '../crud/productPropertyCategories'
import { getFillsForSheetReset, idFromHandle } from '../util/misc'

const SHEET_NAME = "Eigenschaften"
const SHEET_HEAD = ["ID", "Handle", "Name", "Anzeigename (wenn abweichend)", "Eigenschaftskategorie", "Beschreibung (optional)"]

const POS = {
  id: 0,
  handle: 1,
  name: 2,
  title: 3,
  category: 4,
  description: 5,
}

export async function check(): Promise<CheckSheetResponse>{

  const cells = await readFromSheet(SHEET_NAME)
  const productProperties = await getAllProductProperties()
  const productPropertyCategories = await getAllProductPropertyCategories()

  const overviewResponse = overview(cells, productProperties, {
    [POS.handle]: () => true,
    [POS.name]: (name, item: ProductProperty) => name == item.name,
    [POS.title]: (title, item: ProductProperty) => (!item.title && !title) || title == item.title,
    [POS.category]: (category, item: ProductProperty) => (!category && !(item.category as any)?.handle) || (category == (item.category as any)?.handle),
    [POS.description]: (description, item: ProductProperty) => (!item.description && !description) || description == item.description,
  })

  const productPropertyCategoryHandles = productPropertyCategories.map(a => a.handle)

  const validationErrors = validateSheetValues(cells, {
    [POS.handle]: () => true,
    [POS.name]: (name: string) => isValidName(name),
    [POS.title]: (title: string, row) => !title || (isValidName(title) && title != row[POS.name]),
    [POS.category]: (category: string) => !category || productPropertyCategoryHandles.includes(category),
    [POS.description]: (description: string) => !description || isValidDescription(description),
  })

  return { 
    overviewResponse,
    validationErrors 
  }
}

export async function commit(args: CommitSheetArgs): Promise<ConsoleResponse>{

  const { deletedIds, updated, inserted } = args

  const productPropertyCategories = await getAllProductPropertyCategories()

  const upserts = [ ...updated, ...inserted ].map(row => ({
    _id: row[POS.id] as string,
    name: row[POS.name] as string,
    title: row[POS.title] as string,
    category: idFromHandle(row[POS.category] as string, productPropertyCategories),
    description: row[POS.description] as string,
  }))

  const r = await upsertProductProperties(upserts)

  if(r.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  const r2 = await deleteProductProperties(deletedIds)

  if(r2.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const productProperties = await getAllProductProperties()

  const values = productProperties.map(productProperty => Object.values({
    [POS.id]: productProperty._id,
    [POS.handle]: productProperty.handle || "",
    [POS.name]: productProperty.name || "",
    [POS.title]: productProperty.title || "",
    [POS.category]: (productProperty.category as any).handle || "",
    [POS.description]: productProperty.description || "",
  }))

  const fills = getFillsForSheetReset(values.length, SHEET_HEAD.length, {
    [POS.id]: Color.immutable,
    [POS.handle]: Color.immutable,
    [POS.category]: Color.key,
  })

  const ok = await writeToSheet(SHEET_NAME, SHEET_HEAD, values, fills)

  if(!ok){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}
