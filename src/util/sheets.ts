import microsoftGraphHandler from '../core/microsoftGraphHandler'

const getSheetPath = sheetName => `drives/${process.env.OFFICE_DRIVE_ID}/items/${process.env.OFFICE_DRIVEITEM_ID}/workbook/worksheets/${sheetName}`

export async function readFromSheet(sheetName: string){

  const r = await microsoftGraphHandler({
    path: `${getSheetPath(sheetName)}/usedRange?valuesOnly=true`
  })

  return r.data.values
}

export async function writeToSheet(sheetName: string, head: string[], values: (string | number)[][]){

  const body = {
    values: [ head, ...values ]
  }

  const address = `A1:${(head.length + 9).toString(36).toUpperCase()}${values.length + 1}`

  await microsoftGraphHandler({
    path: `${getSheetPath(sheetName)}/range(address='${address}')`,
    method: "PATCH",
    body: JSON.stringify(body)
  })
}