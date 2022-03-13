
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { ProductProperty, ProductPropertyFilter } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from './operations'

export async function getAllProductProperties(): Promise<ProductProperty[]>{
  const gql = `
    query GetProductProperties($limit: Float!, $page: Float!){
      productProperties(limit: $limit, page: $page, dereference: true) {
        _id
        category {
          _id
          handle
        }
        dataType
        name
        handle
        title
        description
      }
    }
  `

  return await queryAll(gql, 200, 'productProperties')
}

export async function deleteProductProperties(productPropertyIds: string[]) {
  const gql = `
    mutation DeleteProductProperties($filter: ProductPropertyFilter!){
      deleteProductProperties(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `

  return await deleteMany(gql, productPropertyIds)
}

export async function upsertProductProperties(productProperties: ProductPropertyFilter[]) {

  const gql = `
    mutation UpsertProductProperties($input: UpsertProductPropertiesInput!){
      upsertProductProperties(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, productProperties)
}