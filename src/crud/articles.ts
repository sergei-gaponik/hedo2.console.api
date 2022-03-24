
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { Article, ArticleFilter } from '@sergei-gaponik/hedo2.lib.models'
import { upsertMany, deleteMany } from '../util/crud'

export async function getAllArticles(): Promise<Article[]>{
  const gql = `
    query GetArticles($limit: Float!, $page: Float!){
      articles(limit: $limit, page: $page) {
        _id
        name
        published 
        author
        handle
        image {
          src
        }
        body
        tags
      }
    }
  `

  return await queryAll(gql, 200, 'articles')
}

export async function deleteArticles(articleIds: string[]) {
  const gql = `
    mutation DeleteArticles($filter: ArticleFilter!){
      deleteArticles(filter: $filter){
        errors
        deletedCount
        nModified
      }
    }
  `

  return await deleteMany(gql, articleIds)
}

export async function upsertArticles(articles: ArticleFilter[]) {

  const gql = `
    mutation UpsertArticles($input: UpsertArticlesInput!){
      upsertArticles(input: $input){
        errors
        n
        upserted
      }
    }
  `

  return await upsertMany(gql, articles)
}