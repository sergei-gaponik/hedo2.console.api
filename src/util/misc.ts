import { Color } from "../types"

interface ItemWithHandle{
  _id: string
  handle: string
}

export const toAlpha = n => (n + 9).toString(36).toUpperCase()

export function idFromHandle(handle: string, items: ItemWithHandle[]){
  const id = items.find(item => item.handle == handle.trim())._id

  if(!id){
    throw new Error()
  }

  return id
}

export function handleFromId(_id: string, items: ItemWithHandle[]){

  const handle = items.find(item => item._id == _id.trim()).handle

  if(!handle){
    throw new Error()
  }

  return handle
}

interface ColumnFillMap{
  [col: number]: Color
}

export function getFillsForSheetReset(valuesLength: number, nCols: number, colFills: ColumnFillMap){

  const _colFills = Object.entries(colFills).map(([ colNumber, color ]) => ([ toAlpha(parseInt(colNumber) + 1), color ]))

  return [
    ..._colFills.map(([ colName, color ]) => ({
      color,
      address: `${colName}:${colName}`
    })),
    {
      color: Color.new,
      address: `A${valuesLength + 2}:${toAlpha(nCols)}${valuesLength + 2}`
    },
    {
      color: Color.white,
      address: "1:1"
    },
  ]
}