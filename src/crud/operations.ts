import { gqlHandler } from '@sergei-gaponik/hedo2.lib.util'

export async function upsertMany(gql: string, items: any[]){

  const input = {
    items: items.map(item => {

      const filter = item._id ? { _id: item._id } : {}

      delete item._id

      return { filter, input: item }
    })
  }

  return await gqlHandler({
    query: gql,
    variables: { input }
  }) 
}

export async function deleteMany(gql: string, ids: string[]){

  const filter = {
    _json: JSON.stringify({
      _auth: process.env.SYSTEM_API_SECRET,
      _filter: {
        _id: { $in: ids }
      }
    })
  }

  return await gqlHandler({
    query: gql,
    variables: { filter }
  })
}