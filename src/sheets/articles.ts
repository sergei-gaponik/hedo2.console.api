import { CheckSheetResponse, Color, CommitSheetArgs, ConsoleRequestError, ConsoleResponse } from '../types'
import { readFromSheet, writeToSheet } from '../util/sheets'
import { validateSheetValues, isValidName, isValidDescription, isValidAsset, isValidDate } from "../util/validation"
import { overview } from '../util/overview'
import { Article } from '@sergei-gaponik/hedo2.lib.models'
import { getAllArticles, upsertArticles, deleteArticles } from '../crud/articles'
import { getFillsForSheetReset, dateTimeFromString, dateTimeToString } from '../util/misc'

const SHEET_NAME = "Blogbeiträge"
const SHEET_HEAD = ["ID", "Handle", "Name", "Beitrag", "Bild URL", "Tags", "Author", "Veröffentlichung" ]

const POS = {
  id: 0,
  handle: 1,
  name: 2,
  body: 3,
  imageSrc: 4,
  tags: 5,
  author: 6,
  published: 7
}

function compareTags(tags: string[], tagsCaption: string){

  if(!tags?.length)
    return !tagsCaption;

  return tags.sort().join(",") == tagsCaption.split(",").map(a => a.trim()).sort().join(",")
}

function isValidTagsCaption(tagsCaption: string): boolean{

  const tags = [ ...tagsCaption.split(",").map(a => a.trim()) ]

  return tags.every(tag => isValidName(tag) && tags.filter(a => a == tag).length == 1)
}


export async function check(): Promise<CheckSheetResponse>{

  const cells = await readFromSheet(SHEET_NAME)
  const articles = await getAllArticles()

  const overviewResponse = overview(cells, articles, {
    [POS.name]: (name, item: Article) => (!item.name && !name) || name == item.name,
    [POS.body]: (body, item: Article) => (!item.body && !body) || body == item.body,
    [POS.imageSrc]: (imageSrc, item: Article) => (!item.image?.src && !imageSrc) || imageSrc == item.image?.src,
    [POS.tags]: (tags, item: Article) => (!item.tags?.length && !tags) || compareTags(item.tags, tags),
    [POS.published]: (published, item: Article) => (!item.published && !published) || dateTimeFromString(published) == item.published,
    [POS.author]: (author, item: Article) => (!item.author && !author) || author == item.author,
    [POS.handle]: () => true
  })

  const validationErrors = validateSheetValues(cells, {
    [POS.name]: (name: string) => isValidName(name),
    [POS.body]: (body: string) => !!body,
    [POS.imageSrc]: (imageSrc: string) => !imageSrc || isValidAsset(imageSrc),
    [POS.tags]: (tags: string) => !tags || isValidTagsCaption(tags),
    [POS.published]: (dateString: string) => !dateString || isValidDate(dateString),
    [POS.author]: (author: string) => !author || isValidName(author),
    [POS.handle]: () => true
  })

  return { 
    overviewResponse,
    validationErrors 
  }
}

export async function commit(args: CommitSheetArgs): Promise<ConsoleResponse>{

  const { deletedIds, updated, inserted } = args

  const upserts = [ ...updated, ...inserted ].map(row => ({
    _id: row[POS.id] as string,
    name: row[POS.name] as string,
    body: row[POS.body] as string, 
    image: {
      src: row[POS.imageSrc] as string
    },
    tags: row[POS.tags].split(",").map(a => a.trim()),
    author: row[POS.author],
    published: row[POS.published] ? dateTimeFromString(row[POS.published]) : null
  }))

  const r = await upsertArticles(upserts)

  if(r.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  const r2 = await deleteArticles(deletedIds)
  
  if(r2.errors?.length){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}

export async function reset(): Promise<ConsoleResponse>{

  const articles = await getAllArticles()

  const values = articles
    .sort((a, b) => a.handle > b.handle ? 1 : -1)
    .map(article => Object.values({
      [POS.id]: article._id,
      [POS.name]: article.name || "",
      [POS.body]: article.body || "",
      [POS.imageSrc]: article.image?.src || "",
      [POS.handle]: article.handle || "",
      [POS.tags]: article.tags?.join(", ") || "",
      [POS.author]: article.author || "",
      [POS.published]: article.published ? dateTimeToString(article.published) : ""
    }))

  const fills = getFillsForSheetReset(values.length, SHEET_HEAD.length, {
    [POS.id]: Color.immutable,
    [POS.handle]: Color.immutable,
  })

  const ok = await writeToSheet(SHEET_NAME, SHEET_HEAD, values, fills)

  if(!ok){
    return { errors: [ ConsoleRequestError.internalServerError ]}
  }

  return {}
}