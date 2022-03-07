import { CheckSheetResponse, ConsoleRequestError, ConsoleResponse } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { Brand } from '@sergei-gaponik/hedo2.lib.models'


const SHEET_NAME = "Marken"
const SHEET_HEAD = ["ID", "Name", "Beschreibung (optional)", "Logo URL (optional)", "Hervorheben"]

export async function check(): Promise<CheckSheetResponse>{
  
  const cells = await readFromSheet(SHEET_NAME)

  console.log(cells)

  // https://graph.microsoft.com/v1.0/drives/OFFICE_DRIVE_ID/items/OFFICE_DRIVEITEM_ID
  
  return {}
}

export async function commit(): Promise<ConsoleResponse>{

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const gql = `
    query GetBrands($limit: Float!, $page: Float!){
      brands(limit: $limit, page: $page) {
        _id
        name
        handle
        logo {
          src
        }
        featured
      }
    }
  `

  try{
    const brands: Brand[] = await queryAll(gql, 200, 'brands')

    const values = brands.map(brand => [
      brand._id,
      brand.name,
      brand.description,
    ])
    

    await writeToSheet(SHEET_NAME, SHEET_HEAD, values)

    return {}
  }
  catch(e){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }
}