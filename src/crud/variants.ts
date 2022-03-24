import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { Variant, VariantFilter } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from '../util/crud'

export async function getAllVariants(): Promise<Variant[]>{
  const gql = `
    query GetVariants($limit: Float!, $page: Float!){
      variants(limit: $limit, page: $page) {
        _id
        jtlId
        images{
          _id
        }
      }
    }
  `

  return await queryAll(gql, 200, 'variants')
}

export async function deleteVariants(variantIds: string[]) {
  const gql = `
    mutation DeleteVariants($filter: VariantFilter!){
      deleteVariants(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `

  return await deleteMany(gql, variantIds)
}

export async function upsertVariants(variants: VariantFilter[]) {

  const gql = `
    mutation UpsertVariants($input: UpsertVariantsInput!){
      upsertVariants(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, variants)
}