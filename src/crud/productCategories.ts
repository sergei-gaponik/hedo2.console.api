
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { ProductCategory, ProductCategoryFilter } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from '../util/crud'

export async function getAllProductCategories(): Promise<ProductCategory[]>{
  const gql = `
    query GetProductCategories($limit: Float!, $page: Float!){
      productCategories(limit: $limit, page: $page, dereference: true) {
        _id
        name
        handle
        title
        description
        position
        parent {
          _id
          handle
        }
        featured
        andCondition {
          properties {
            _id
            handle
          }
        }
      }
    }
  `

  return await queryAll(gql, 200, 'productCategories')
}

export async function deleteProductCategories(productCategoryIds: string[]) {
  const gql = `
    mutation DeleteProductCategories($filter: ProductCategoryFilter!){
      deleteProductCategories(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `

  return await deleteMany(gql, productCategoryIds)
}

export async function upsertProductCategories(productCategories: ProductCategoryFilter[]) {

  const gql = `
    mutation UpsertProductCategories($input: UpsertProductCategoriesInput!){
      upsertProductCategories(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, productCategories)
}