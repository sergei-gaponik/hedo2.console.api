import { ItemWithId, OverviewResponse, SheetValues } from "../types";
import { isDeleteMark } from './validation'

type ComparisonFunction = (sheetValue: string | number, item: ItemWithId) => boolean

interface ComparisonFunctionMap {
 [pos: number]: ComparisonFunction
}

export function overview(values: SheetValues, items: ItemWithId[], comparisonFunctions: ComparisonFunctionMap): OverviewResponse{

  const _comparisonFunctions = Object.values(comparisonFunctions)

  const findDuplicates = arr => [ ...new Set(arr.filter((a, i) => arr.indexOf(a) !== i)) ]

  const existing = values.slice(0, items.length)
  const inserted = values.slice(items.length)

  const itemIds = items.map(a => a._id)
  const sheetIds = existing.map(a => a[0]).filter(a => a && !isDeleteMark(a as string)) as string[]

  const duplicateIds = findDuplicates(sheetIds) as string[]
  const deletedIds = itemIds.filter(a => !sheetIds.includes(a))
  const unknownIds = sheetIds.filter(a => !itemIds.includes(a))
  
  const updated = existing.filter((row, i) => {
    
    if(isDeleteMark(row[0] as string))
      return false
    else
      return row.slice(1).some((cell, j) => !_comparisonFunctions[j](cell, items[i]))
  })

  const deleteMarksLength = values.map(a => a[0]).filter(a => isDeleteMark(a as string)).length
  const rowsMissing = deletedIds.length != deleteMarksLength || inserted.some(a => a[0])

  const ok = !duplicateIds?.length && !rowsMissing && !unknownIds?.length

  return { inserted, duplicateIds, deletedIds, unknownIds, updated, rowsMissing, ok }
}