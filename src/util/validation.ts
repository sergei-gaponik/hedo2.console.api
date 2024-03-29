import { SheetValues } from '../types'
import { DELETE_MARK } from '../core/const'
import { toAlpha, dateTimeFromString } from './misc'

type ValidationFunction = (value: string | number, row: (string | number)[]) => boolean

interface ValidationFunctionMap {
 [pos: number]: ValidationFunction
}
  
export const isValidName = (name: string) => name && name.length < 100

export const isValidDescription = (description: string) => !!description

export const isValidAsset = (src: string) => src && /^[a-zA-Z0-9\/.\-\_]*$/.test(src)

export const isValidDate = (dateString: string) => !!dateTimeFromString(dateString)

export const isDeleteMark = (id: string) => id && id.trim().toLowerCase() == DELETE_MARK

export function validateSheetValues(values: SheetValues, validationFunctions: ValidationFunctionMap){
  
  const _validationFunctions = Object.values(validationFunctions)

  return values.flatMap((row, i) => {
    
    if(isDeleteMark(row[0] as string))
      return []
    
    return row
      .slice(1)
      .map((cell, j) => _validationFunctions[j](cell, row) ? null : `${toAlpha(j + 2)}${i + 2}`)
      .filter(a => a)
  })
}