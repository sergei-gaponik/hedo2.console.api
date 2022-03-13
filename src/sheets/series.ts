import { CheckSheetResponse, CommitSheetArgs, ConsoleRequestError, ConsoleResponse, Color } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { validateSheetValues, isValidName, isValidDescription, isValidAsset } from "../util/validation"
import { overview } from '../util/overview'
import { SeriesFilter, Series } from '@sergei-gaponik/hedo2.lib.models'
import { getAllSeries, upsertSeries, deleteSeries } from '../crud/series'
import { getAllBrands } from '../crud/brands'
import { getFillsForSheetReset, idFromHandle } from '../util/misc'

const SHEET_NAME = "Serien"
const SHEET_HEAD = ["ID", "Handle", "Name", "Marke", "Beschreibung (optional)", "Logo URL (optional)"]

const POS = {
  id: 0,
  handle: 1,
  name: 2,
  brand: 3,
  description: 4,
  logoSrc: 5,
}

export async function check(): Promise<CheckSheetResponse>{
  
  const cells = await readFromSheet(SHEET_NAME)
  const series = await getAllSeries()
  const brands = await getAllBrands()

  const overviewResponse = overview(cells, series, {
    [POS.name]: (name, item: Series) => (!item.name && !name) || name == item.name,
    [POS.brand]: (brand: string, item: Series) => brand == (item.brand as any).handle,
    [POS.description]: (description, item: Series) => (!item.description && !description) || description == item.description,
    [POS.logoSrc]: (logoSrc, item: Series) => (!item.logo?.src && !logoSrc) || logoSrc == item.logo?.src,
    [POS.handle]: () => true
  })

  const brandHandles = brands.map(a => a.handle)

  const validationErrors = validateSheetValues(cells, {
    [POS.name]: (name: string) => isValidName(name),
    [POS.brand]: (brand: string) => brandHandles.includes(brand),
    [POS.description]: (description: string) => !description || isValidDescription(description),
    [POS.logoSrc]: (logoSrc: string) => !logoSrc || isValidAsset(logoSrc),
    [POS.handle]: () => true
  })

  return { 
    overviewResponse,
    validationErrors 
  }
}

export async function commit(args: CommitSheetArgs): Promise<ConsoleResponse>{

  const { deletedIds, updated, inserted } = args

  const brands = await getAllBrands()

  const upserts = [ ...updated, ...inserted ].map(row => ({
    _id: row[POS.id] as string,
    name: row[POS.name] as string,
    brand: idFromHandle(row[POS.brand] as string, brands),
    description: row[POS.description] as string, 
    logo: {
      src: row[POS.logoSrc] as string
    }
  }))

  const r = await upsertSeries(upserts)

  if(r.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  const r2 = await deleteSeries(deletedIds)

  if(r2.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const series = await getAllSeries()

  const values = series.map(oneSeries => Object.values({
    [POS.id]: oneSeries._id,
    [POS.name]: oneSeries.name || "",
    [POS.brand]: (oneSeries.brand as any).handle || "",
    [POS.description]: oneSeries.description || "",
    [POS.logoSrc]: oneSeries.logo?.src || "",
    [POS.handle]: oneSeries.handle || ""
  }))

  const fills = getFillsForSheetReset(values.length, SHEET_HEAD.length, {
    [POS.id]: Color.immutable,
    [POS.handle]: Color.immutable,
    [POS.brand]: Color.key
  })

  const ok = await writeToSheet(SHEET_NAME, SHEET_HEAD, values, fills)

  if(!ok){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}