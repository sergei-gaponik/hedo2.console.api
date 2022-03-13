
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { ProductKeyword, ProductKeywordFilter } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from './operations'

export async function getAllProductKeywords(): Promise<ProductKeyword[]>{
  const gql = `
    query GetProductKeywords($limit: Float!, $page: Float!){
      productKeywords(limit: $limit, page: $page, dereference: true) {
        _id
        name
        conditions {
          property {
            _id
            handle
          }
          operator
          value
        }
        aliases
        conditionLogic
    }
  `

  return await queryAll(gql, 200, 'productKeywords')
}

export async function deleteProductKeywords(productKeywordIds: string[]) {
  const gql = `
    mutation DeleteProductKeywords($filter: ProductKeywordFilter!){
      deleteProductKeywords(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `

  return await deleteMany(gql, productKeywordIds)
}

export async function upsertProductKeywords(productKeywords: ProductKeywordFilter[]) {

  const gql = `
    mutation UpsertProductKeywords($input: UpsertProductKeywordsInput!){
      upsertProductKeywords(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, productKeywords)
}