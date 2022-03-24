import { CheckSheetResponse, Color, CommitSheetArgs, ConsoleRequestError, ConsoleResponse } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { validateSheetValues, isValidName, isValidDescription, isValidAsset } from "../util/validation"
import { overview } from '../util/overview'
import { Brand } from '@sergei-gaponik/hedo2.lib.models'
import { getAllBrands, upsertBrands, deleteBrands } from '../crud/brands'
import { getFillsForSheetReset } from '../util/misc'

const SHEET_NAME = "Marken"
const SHEET_HEAD = ["ID", "Handle", "Name", "Beschreibung (optional)", "Logo URL (optional)", "Hervorheben" ]

const POS = {
  id: 0,
  handle: 1,
  name: 2,
  description: 3,
  logoSrc: 4,
  featured: 5,
}

export async function check(): Promise<CheckSheetResponse>{
  
  const cells = await readFromSheet(SHEET_NAME)
  const brands = await getAllBrands()

  const overviewResponse = overview(cells, brands, {
    [POS.name]: (name, item: Brand) => (!item.name && !name) || name == item.name,
    [POS.description]: (description, item: Brand) => (!item.description && !description) || description == item.description,
    [POS.logoSrc]: (logoSrc, item: Brand) => (!item.logo?.src && !logoSrc) || logoSrc == item.logo?.src,
    [POS.featured]: (featured, item: Brand) => (!item.featured && !featured) || !!featured == item.featured,
    [POS.handle]: () => true
  })

  const validationErrors = validateSheetValues(cells, {
    [POS.name]: (name: string) => isValidName(name),
    [POS.description]: (description: string) => !description || isValidDescription(description),
    [POS.logoSrc]: (logoSrc: string) => !logoSrc || isValidAsset(logoSrc),
    [POS.featured]: () => true,
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
    logo: {
      src: row[POS.logoSrc] as string
    },
    featured: !!row[POS.featured]
  }))

  const r = await upsertBrands(upserts)

  if(r.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  const r2 = await deleteBrands(deletedIds)
  
  if(r2.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const brands = await getAllBrands()

  const values = brands
    .sort((a, b) => a.handle > b.handle ? 1 : -1)
    .map(brand => Object.values({
      [POS.id]: brand._id,
      [POS.name]: brand.name || "",
      [POS.description]: brand.description || "",
      [POS.logoSrc]: brand.logo?.src || "",
      [POS.featured]: brand.featured ? "x" : "",
      [POS.handle]: brand.handle || ""
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