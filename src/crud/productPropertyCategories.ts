
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { ProductPropertyCategory, ProductPropertyCategoryFilter } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from './operations'

export async function getAllProductPropertyCategories(): Promise<ProductPropertyCategory[]>{
  const gql = `
    query GetProductPropertyCategories($limit: Float!, $page: Float!){
      productPropertyCategories(limit: $limit, page: $page, dereference: true) {
        _id
        name
        handle
        description
      }
    }
  `

  return await queryAll(gql, 200, 'productPropertyCategories')
}

export async function deleteProductPropertyCategories(productPropertyCategoryIds: string[]) {
  const gql = `
    mutation DeleteProductPropertyCategories($filter: ProductPropertyCategoryFilter!){
      deleteProductPropertyCategories(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `

  return await deleteMany(gql, productPropertyCategoryIds)
}

export async function upsertProductPropertyCategories(productPropertyCategories: ProductPropertyCategoryFilter[]) {

  const gql = `
    mutation UpsertProductPropertyCategories($input: UpsertProductPropertyCategoriesInput!){
      upsertProductPropertyCategories(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, productPropertyCategories)
}