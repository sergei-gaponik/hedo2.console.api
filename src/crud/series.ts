import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { SeriesFilter, Series } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from '../util/crud'

export async function getAllSeries(): Promise<Series[]>{
  
  const gql = `
    query GetSeries($limit: Float!, $page: Float!){
      series(limit: $limit, page: $page, dereference: true) {
        _id
        name
        description
        handle
        brand {
          _id
          handle
        }
        logo {
          src
        }
      }
    }
  `

  return await queryAll(gql, 200, 'series')
}

export async function deleteSeries(seriesIds: string[]) {
  const gql = `
    mutation DeleteSeries($filter: SeriesFilter!){
      deleteSeries(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `
  return await deleteMany(gql, seriesIds)
}

export async function upsertSeries(series: SeriesFilter[]) {

  const gql = `
    mutation UpsertSeries($input: UpsertSeriesInput!){
      upsertSeries(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, series)
}