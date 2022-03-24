

import { CheckSheetResponse, CommitSheetArgs, ConsoleRequestError, ConsoleResponse, Color } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { validateSheetValues, isValidName, isValidDescription, isValidAsset } from "../util/validation"
import { overview } from '../util/overview'
import { ProductKeyword, ProductPropertyConditionOperator, ProductPropertyConditionLogic, ProductProperty, ProductPropertyCondition, ProductPropertyConditionInput } from '@sergei-gaponik/hedo2.lib.models'
import { deleteProductKeywords, getAllProductKeywords, upsertProductKeywords } from '../crud/productKeywords'
import { getAllProductProperties } from '../crud/productProperties'
import { getFillsForSheetReset, handleFromId, idFromHandle } from '../util/misc'

const SHEET_NAME = "Keywords"
const SHEET_HEAD = [ "ID", "Name", "Synonyme (optional)", "Bedingung" ]

const POS = {
  id: 0,
  name: 1,
  aliases: 2,
  condition: 3,
}

function normalizeConditionCaption(conditionCaption: string): string{

  return conditionCaption.replace(/[\|\\]/g, "/").replace(/[ \(\)]/g, "") 
}

function getConditionCaption(keyword: ProductKeyword): string{

  const conditionLogicMap = {
    [ProductPropertyConditionLogic.and]: "&",
    [ProductPropertyConditionLogic.or]: "/"
  }

  const logicOperator = ` ${conditionLogicMap[keyword.conditionLogic]} `

  return keyword.conditions.map(condition => {

    if((condition.operator == ProductPropertyConditionOperator.eq && condition.value == "true") 
      || (condition.operator == ProductPropertyConditionOperator.ne && condition.value == "false")
    ){
      return (condition.property as ProductProperty).handle
    }
    else if((condition.operator == ProductPropertyConditionOperator.ne && condition.value == "true") 
      || (condition.operator == ProductPropertyConditionOperator.eq && condition.value == "false")
    ){
      return "!" + (condition.property as ProductProperty).handle
    }
    else{
      return "INVALID_OP"
    }

  }).join(logicOperator)
}

function compareConditions(item: ProductKeyword, conditionCaption){
  return normalizeConditionCaption(getConditionCaption(item)) == normalizeConditionCaption(conditionCaption)
}

function compareAliases(aliases: string[], aliasesCaption: string){

  if(!aliases?.length)
    return !aliasesCaption;

  return aliases.sort().join(",") == aliasesCaption.split(",").map(a => a.trim()).sort().join(",")
}

function isValidConditionCaption(productPopertyHandles: string[], conditionCaption: string): boolean {

  const caption = normalizeConditionCaption(conditionCaption)

  if(!/^[a-z1-9\-\/\&\!]*$/.test(caption))
    return false;

  const p = a => productPopertyHandles.includes(a[0] == "!" ? a.slice(1) : a) 

  if(caption.split('&').every(a => p(a)) || caption.split('/').every(a => p(a)))
    return true;

  return false;
}

function isValidAliasesCaption(aliasesCaption: string, name: string): boolean{

  const aliases = [ ...aliasesCaption.split(",").map(a => a.trim()), name ]

  return aliases.every(alias => isValidName(alias) && aliases.filter(a => a == alias).length == 1)
}

interface GetConditionFromCaptionResponse{
  conditions: ProductPropertyConditionInput[],
  conditionLogic: ProductPropertyConditionLogic
}

function getConditionFromCaption(conditionCaption: string, productProperties: ProductProperty[]): GetConditionFromCaptionResponse{

  const caption = normalizeConditionCaption(conditionCaption)

  const or = caption.split("/")
  const and = caption.split("&")

  if(or.length > 1 && and.length > 1)
    throw new Error();

  const getConditions = (conditions: string[]): ProductPropertyConditionInput[] => {

    return conditions.map(condition => {

      const value = condition[0] == "!" ? "false" : "true"
      const propertyHandle = condition[0] == "!" ? condition.slice(1) : condition
      const operator = ProductPropertyConditionOperator.eq
      const property = idFromHandle(propertyHandle, productProperties)

      return { property, operator, value }
    })
  }

  if(or.length > 1){
    return {
      conditions: getConditions(or),
      conditionLogic: ProductPropertyConditionLogic.or
    }
  }
  else{
    return {
      conditions: getConditions(and),
      conditionLogic: ProductPropertyConditionLogic.and
    }
  }
}

function getAliasesFromCaption(aliasesCaption: string): string[]{

  return aliasesCaption.split(",").map(a => a.trim())
}

export async function check(): Promise<CheckSheetResponse>{

  const cells = await readFromSheet(SHEET_NAME)
  const productKeywords = await getAllProductKeywords()
  const productProperties = await getAllProductProperties()

  const overviewResponse = overview(cells, productKeywords, {
    [POS.name]: (name, item: ProductKeyword) => name == item.name,
    [POS.aliases]: (aliases: string, item: ProductKeyword) => compareAliases(item.aliases, aliases),
    [POS.condition]: (condition, item: ProductKeyword) => compareConditions(item, condition),
  })

  const productPopertyHandles = productProperties.map(a => a.handle)

  const validationErrors = validateSheetValues(cells, {
    [POS.name]: (name: string) => isValidName(name),
    [POS.condition]: (condition: string) => isValidConditionCaption(productPopertyHandles, condition),
    [POS.aliases]: (aliases: string, row) => !aliases || isValidAliasesCaption(aliases, row[POS.name] as string)
  })

  return { 
    overviewResponse,
    validationErrors 
  }
}

export async function commit(args: CommitSheetArgs): Promise<ConsoleResponse>{

  const { deletedIds, updated, inserted } = args

  const productProperties = await getAllProductProperties()

  const upserts = [ ...updated, ...inserted ].map(row => {

    const { conditions, conditionLogic } = getConditionFromCaption(row[POS.condition] as string, productProperties)

    return {
      _id: row[POS.id] as string,
      name: row[POS.name] as string,
      aliases: getAliasesFromCaption(row[POS.aliases] as string),
      conditions, 
      conditionLogic
    }
  })

  const r = await upsertProductKeywords(upserts)

  if(r.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  const r2 = await deleteProductKeywords(deletedIds)

  if(r2.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const productKeywords = await getAllProductKeywords()

  const values = productKeywords
  .sort((a, b) => a.name > b.name ? 1 : -1)
  .map(productKeyword => Object.values({
    [POS.id]: productKeyword._id,
    [POS.name]: productKeyword.name || "",
    [POS.aliases]: productKeyword.aliases?.join(", ") || "",
    [POS.condition]: getConditionCaption(productKeyword),
  }))

  const fills = getFillsForSheetReset(values.length, SHEET_HEAD.length, {
    [POS.id]: Color.immutable,
    [POS.condition]: Color.key,
  })

  const ok = await writeToSheet(SHEET_NAME, SHEET_HEAD, values, fills)

  if(!ok){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}