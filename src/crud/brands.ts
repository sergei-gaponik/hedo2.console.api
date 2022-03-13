import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { Brand, BrandFilter } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from './operations'

export async function getAllBrands(): Promise<Brand[]>{
  const gql = `
    query GetBrands($limit: Float!, $page: Float!){
      brands(limit: $limit, page: $page) {
        _id
        name
        handle
        description
        logo {
          src
        }
        featured
      }
    }
  `

  return await queryAll(gql, 200, 'brands')
}

export async function deleteBrands(brandIds: string[]) {
  const gql = `
    mutation DeleteBrands($filter: BrandFilter!){
      deleteBrands(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `

  return await deleteMany(gql, brandIds)
}

export async function upsertBrands(brands: BrandFilter[]) {

  const gql = `
    mutation UpsertBrands($input: UpsertBrandsInput!){
      upsertBrands(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, brands)
}