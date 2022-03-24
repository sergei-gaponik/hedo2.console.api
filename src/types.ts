export type SheetValues = string[][]

export interface Sheet{
  check: () => Promise<CheckSheetResponse>,
  reset: () => Promise<ConsoleResponse>,
  commit: (args: CommitSheetArgs) => Promise<ConsoleResponse>
}

export interface SheetMap{
  [collection: string]: Sheet
}

export interface ItemWithId {
  _id: string
}


export enum ConsoleRequestError {
  "pathNotFound" = "pathNotFound",
  "missingArgs" = "missingArgs",
  "permissionDenied" = "permissionDenied",
  "internalServerError" = "internalServerError",
  "conflict" = "conflict",
  "badRequest" = "badRequest",
  "notFound" = "notFound",
  "wrongContentType" = "wrongContentType"
}

export interface ConsoleRequest {
  path?: string
  args?: any
}

export interface ConsoleResponse {
  errors?: ConsoleRequestError[]
  data?: any
}

export interface OverviewResponse {
  inserted: SheetValues, 
  updated: SheetValues, 
  deletedIds: string[]
  unknownIds: string[]
  duplicateIds: string[]
  rowsMissing: boolean
  ok: boolean
}


export interface CheckSheetResponse {
  errors?: ConsoleRequestError[]
  validationErrors?: string[]
  overviewResponse?: OverviewResponse
}

export interface CommitSheetArgs{
  updated?: SheetValues
  deletedIds?: string[]
  inserted?: SheetValues
}

export enum Color {
  "immutable" = "#f7f7df",
  "new" = "#c4f7c3",
  "key" = "#d5eaed",
  "white" = "#ffffff"
}