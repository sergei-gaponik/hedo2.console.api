import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { Product, ProductFilter } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from '../util/crud'

export async function getAllProducts(): Promise<Product[]>{
  const gql = `
    query GetProducts($limit: Float!, $page: Float!){
      products(limit: $limit, page: $page, dereference: true) {
        _id
        name
        handle
        series{
          _id
          handle
        }
        brand{
          _id
          handle
        }
        description
        variants {
          _id
          jtlId
        }
        properties {
          property {
            _id
            handle
          }
          value
        }
      }
    }
  `

  return await queryAll(gql, 200, 'products')
}

export async function deleteProducts(productIds: string[]) {
  const gql = `
    mutation DeleteProducts($filter: ProductFilter!){
      deleteProducts(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `

  return await deleteMany(gql, productIds)
}

export async function upsertProducts(products: ProductFilter[]) {

  const gql = `
    mutation UpsertProducts($input: UpsertProductsInput!){
      upsertProducts(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, products)
}