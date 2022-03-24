import { CheckSheetResponse, Color, CommitSheetArgs, ConsoleRequestError, ConsoleResponse } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { validateSheetValues, isValidName, isValidDescription, isValidAsset } from "../util/validation"
import { overview } from '../util/overview'
import { Brand, Product, ProductProperty, ProductPropertyWithValue, ProductPropertyWithValueInput, Series, Variant } from '@sergei-gaponik/hedo2.lib.models'
import { getFillsForSheetReset, idFromHandle } from '../util/misc'
import { getAllProducts, upsertProducts, deleteProducts } from '../crud/products'
import { getAllVariants } from '../crud/variants'
import { getAllBrands } from '../crud/brands'
import { getAllSeries } from '../crud/series'
import { getAllProductProperties } from '../crud/productProperties'

const SHEET_NAME = "Produkte"
const SHEET_HEAD = ["ID", "Handle", "JTL IDs", "Marke", "Serie (optional)", "Name", "Beschreibung (optional)", "Produktattribute" ]

const POS = {
  id: 0,
  handle: 1,
  jtlIds: 2,
  brand: 3,
  series: 4,
  name: 5,
  description: 6,
  properties: 7
}

function compareJtlIds(variants: Variant[], jtlIdsCaption: string): boolean {

  if(!variants?.length)
    return !jtlIdsCaption;

  return variants.map(a => a.jtlId).sort().join(",") == jtlIdsCaption.split(",").map(a => a.trim()).sort().join(",")
}

function compareProperties(properties: ProductPropertyWithValue[], propertiesCaption: string): boolean {

  if(!properties?.length)
    return !propertiesCaption;

  const propertyHandles = properties.filter(a => a.value == "true").map(a => (a.property as any).handle)

  return propertyHandles.sort().join(",") == propertiesCaption.split(",").map(a => a.trim()).sort().join(",")
}

function variantFromJtlId(jtlId: string, variants: Variant[]){

  const variant = variants.find(item => item.jtlId == parseInt(jtlId))

  if(!variant){
    throw new Error()
  }

  return variant
}

function getPropertiesFromCaption(propertiesCaption: string, productProperties: ProductProperty[]): ProductPropertyWithValueInput[] {

  if(!propertiesCaption)
    return [];

  return propertiesCaption.split(",").map(propertyCaption => ({
    value: "true",
    property: idFromHandle(propertyCaption.trim(), productProperties)
  }))
}

function getVariantsFromCaption(jtlIds: string, variants: Variant[]){

  if(!jtlIds)
    return [];

  return jtlIds.split(",").map(jtlId => variantFromJtlId(jtlId, variants))
}

export async function check(): Promise<CheckSheetResponse>{
  
  const cells = await readFromSheet(SHEET_NAME)
  const products = await getAllProducts()
  const variants = await getAllVariants()
  const brands = await getAllBrands()
  const series = await getAllSeries()
  const productProperties = await getAllProductProperties()

  const overviewResponse = overview(cells, products, {
    [POS.handle]: () => true,
    [POS.jtlIds]: (jtlIds, item: Product) => compareJtlIds(item.variants as Variant[], jtlIds),
    [POS.name]: (name, item: Product) => name == item.name,
    [POS.description]: (description, item: Product) => (!item.description && !description) || description == item.description,
    [POS.brand]: (brand: string, item: Product) => brand == (item.brand as any).handle,
    [POS.series]: (series: string, item: Product) => (!(item.series as any)?.handle && !series) || series == (item.series as any).handle,
    [POS.properties]: (properties: string, item: Product) => compareProperties(item.properties, properties),
  })

  const jtlIds = variants.map(a => a.jtlId)
  const brandHandles = brands.map(a => a.handle)
  const seriesHandles = series.map(a => a.handle)
  const propertyHandles = productProperties.map(a => a.handle)

  const validationErrors = validateSheetValues(cells, {
    [POS.handle]: () => true,
    [POS.jtlIds]: (jtlIdsCaption: string) => !jtlIdsCaption || jtlIdsCaption.split(",").every(a => !isNaN(a as any) && jtlIds.includes(parseInt(a))),
    [POS.name]: (name: string) => isValidName(name),
    [POS.description]: (description: string) => !description || isValidDescription(description),
    [POS.brand]: (brand: string) => brand && brandHandles.includes(brand),
    [POS.series]: (series: string) => !series || seriesHandles.includes(series),
    [POS.properties]: (properties: string) => !properties || properties.split(",").every(a => propertyHandles.includes(a.trim()))
  })

  return { 
    overviewResponse,
    validationErrors
  }
}

export async function commit(args: CommitSheetArgs): Promise<ConsoleResponse>{

  const { deletedIds, updated, inserted } = args

  const productProperties = await getAllProductProperties()
  const variants = await getAllVariants()
  const brands = await getAllBrands()
  const series = await getAllSeries()

  const upserts = [ ...updated, ...inserted ].map(row => {

    const _variants = getVariantsFromCaption(row[POS.jtlIds], variants)
    const variantImages = _variants.flatMap(a => a.images?.map(a => a._id) || [])

    return {
      _id: row[POS.id],
      name: row[POS.name],
      variants: _variants.map(a => a._id),
      series: row[POS.series] ? idFromHandle(row[POS.series], series) : null,
      brand: idFromHandle(row[POS.brand], brands),
      description: row[POS.description],
      properties: getPropertiesFromCaption(row[POS.properties], productProperties),
      images: variantImages
    }
  })


  const r = await upsertProducts(upserts)

  if(r.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  const r2 = await deleteProducts(deletedIds)
  
  if(r2.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const products = await getAllProducts()

  const values = products
    .sort((a, b) => a.handle > b.handle ? 1 : -1)
    .map(product => Object.values({
      [POS.id]: product._id,
      [POS.handle]: product.handle,
      [POS.jtlIds]: (product.variants as Variant[]).map(a => a.jtlId).join(", "),
      [POS.name]: product.name || "",
      [POS.brand]: (product.brand as Brand)?.handle || "",
      [POS.series]: (product.series as Series)?.handle  || "",
      [POS.description]: product.description || "",
      [POS.properties]: (product.properties as any[]).map(a => a.property.handle).join(", ")
    }))

  const fills = getFillsForSheetReset(values.length, SHEET_HEAD.length, {
    [POS.id]: Color.immutable,
    [POS.handle]: Color.immutable,
    [POS.jtlIds]: Color.key,
    [POS.brand]: Color.key,
    [POS.series]: Color.key,
    [POS.properties]: Color.key
  })

  const ok = await writeToSheet(SHEET_NAME, SHEET_HEAD, values, fills)

  if(!ok){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

