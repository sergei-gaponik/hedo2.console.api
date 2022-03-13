import microsoftGraphHandler from '../core/microsoftGraphHandler'
import { SheetValues } from '../types'
import { toAlpha } from '../util/misc'

const getSheetPath = sheetName => `drives/${process.env.OFFICE_DRIVE_ID}/items/${process.env.OFFICE_DRIVEITEM_ID}/workbook/worksheets/${sheetName}`

export async function readFromSheet(sheetName: string){

  const rowEmpty = row => row.every(a => !a)

  const sliceY = values => {
    for(let i = values.length; i > 1; i--){
      if(!rowEmpty(values[i - 1])){
        return values.slice(1, i)
      }
    }
    return []
  }

  const r = await microsoftGraphHandler({
    path: `${getSheetPath(sheetName)}/usedRange?valuesOnly=true`
  })

  const nCols = r.data.values[0].filter(a => a).length

  return sliceY(r.data.values).map(row => row.slice(0, nCols))
}

interface SheetFillOperation {
  color: string
  address: string
}

export async function writeToSheet(sheetName: string, head: string[], values: SheetValues, fills: SheetFillOperation[]): Promise<boolean>{


  const address = `A1:${toAlpha(head.length)}${values.length + 1}`
  
  const r = await microsoftGraphHandler({
    batch: [
      {
        path: `${getSheetPath(sheetName)}/range/clear`,
        method: "POST"
      },
      {
        path: `${getSheetPath(sheetName)}/range/format`,
        method: "PATCH",
        body: {
          columnWidth: 160,
          rowHeight: 17
        }
      },
      {
        path: `${getSheetPath(sheetName)}/range(address='${address}')`,
        method: "PATCH",
        body: {
          values: [ head, ...values ]
        }
      },
      ...fills.map(fill => ({
        path: `${getSheetPath(sheetName)}/range(address='${fill.address}')/format/fill`,
        method: "PATCH",
        body: { 
          color: fill.color 
        }
      }))
    ]
  })

  return r.ok
}