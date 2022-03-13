

import { CheckSheetResponse, CommitSheetArgs, ConsoleRequestError, ConsoleResponse, Color } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { validateSheetValues, isValidName, isValidDescription, isValidAsset } from "../util/validation"
import { overview } from '../util/overview'
import { ProductCategory, ProductProperty, ProductCategoryOrConditionInput, ProductCategoryOrCondition } from '@sergei-gaponik/hedo2.lib.models'
import { handleize } from '@sergei-gaponik/hedo2.lib.util'
import { deleteProductCategories, getAllProductCategories, upsertProductCategories } from '../crud/productCategories'
import { getAllProductProperties } from '../crud/productProperties'
import { getFillsForSheetReset, handleFromId, idFromHandle } from '../util/misc'

const SHEET_NAME = "Kategorien"
const SHEET_HEAD = ["ID", "Handle", "Name", "Anzeigename (wenn abweichend)", "Überkategorie (optional)", "Beschreibung (optional)", "Bedingung", "Hervorheben"]

const POS = {
  id: 0,
  handle: 1,
  name: 2,
  title: 3,
  parent: 4,
  description: 5,
  condition: 6,
  featured: 7,
}

function getConditionCaption(condition: ProductCategoryOrCondition[]): string{

  if(condition.length > 1)
    return condition.map(or => {
      if(or.properties.length > 1)
        return `(${or.properties.map(a => a.handle).join(" / ")})`
      else
        return (or.properties[0] as any).handle

    }).join(" & ")
  else
    return condition[0].properties.map(a => a.handle).join(" / ")
}

function normalizeConditionCaption(_caption: string): string{
  return _caption.replace(/[\|\\]/g, "/").replace(/[ \(\)]/g, "") 
}  

function compareConditionCaptions(condition: ProductCategoryOrCondition[], caption): boolean{

  return normalizeConditionCaption(getConditionCaption(condition)) == normalizeConditionCaption(caption)
}

function getConditionFromCaption(conditionCaption: string, productProperties: ProductProperty[]): ProductCategoryOrConditionInput[]{

  const orConditions = normalizeConditionCaption(conditionCaption).split("&")

  if(orConditions.length > 10) throw new Error();

  return orConditions.map(orCondition => {

    const properties = orCondition.split("/")

    if(properties.length > 10) throw new Error();

    return {
      properties: properties.map(a => idFromHandle(a, productProperties))
    }
  })
}

function isValidCondition(productPropertyHandles: string[], conditionCaption: string): boolean{

  const orConditions = normalizeConditionCaption(conditionCaption).split("&")

  if(orConditions.length > 10) return false;

  return orConditions.every(orCondition => {

    const properties = orCondition.split("/")

    if(properties.length > 10) return false;

    return properties.every(property => productPropertyHandles.includes(property))
  })
}

export async function check(): Promise<CheckSheetResponse>{

  const cells = await readFromSheet(SHEET_NAME)
  const productCategories = await getAllProductCategories()
  const productProperties = await getAllProductProperties()

  const overviewResponse = overview(cells, productCategories, {
    [POS.name]: (name, item: ProductCategory) => name == item.name,
    [POS.title]: (title, item: ProductCategory) => (!item.title && !title) || title == item.title,
    [POS.parent]: (parent: string, item: ProductCategory) => (!parent && !(item.parent as any)?.handle) || (parent == (item.parent as any)?.handle),
    [POS.description]: (description, item: ProductCategory) => (!item.description && !description) || description == item.description,
    [POS.condition]: (condition, item: ProductCategory) => compareConditionCaptions(item.andCondition, condition),
    [POS.featured]: (featured, item: ProductCategory) => (!item.featured && !featured) || !!featured == item.featured,
    [POS.handle]: () => true
  })

  const productPopertyHandles = productProperties.map(a => a.handle)
  const productCategoryHandles = productCategories.map(a => a.handle)

  const validationErrors = validateSheetValues(cells, {
    [POS.name]: (name: string) => isValidName(name),
    [POS.title]: (title: string, row) => !title || (isValidName(title) && title != row[POS.name]),
    [POS.parent]: (parent: string, row) => !parent || (productCategoryHandles.includes(parent) && parent != handleize(row[POS.name] as string)),
    [POS.description]: (description: string) => !description || isValidDescription(description),
    [POS.condition]: (condition: string) => isValidCondition(productPopertyHandles, condition),
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


  const productCategories = await getAllProductCategories()
  const productProperties = await getAllProductProperties()

  const upserts = [ ...updated, ...inserted ].map(row => ({
    _id: row[POS.id] as string,
    name: row[POS.name] as string,
    title: row[POS.title] as string,
    parent: row[POS.parent] ? idFromHandle(row[POS.parent] as string, productCategories) : null,
    description: row[POS.description] as string,
    andCondition: getConditionFromCaption(row[POS.condition] as string, productProperties),
    featured: !!row[POS.featured]
  }))

  const r = await upsertProductCategories(upserts)

  if(r.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  const r2 = await deleteProductCategories(deletedIds)

  if(r2.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const productCategories = await getAllProductCategories()

  const values = productCategories.map(productCategory => Object.values({
    [POS.id]: productCategory._id,
    [POS.name]: productCategory.name || "",
    [POS.title]: productCategory.title || "",
    [POS.parent]: (productCategory.parent as any)?.handle || "",
    [POS.description]: productCategory.description || "",
    [POS.condition]: getConditionCaption(productCategory.andCondition),
    [POS.handle]: productCategory.handle || "",
    [POS.featured]: productCategory.featured ? "x" : ""
  }))

  const fills = getFillsForSheetReset(values.length, SHEET_HEAD.length, {
    [POS.id]: Color.immutable,
    [POS.handle]: Color.immutable,
    [POS.condition]: Color.key,
    [POS.parent]: Color.key
  })

  const ok = await writeToSheet(SHEET_NAME, SHEET_HEAD, values, fills)

  if(!ok){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}
