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

export interface CheckSheetResponse {
  errors?: string[]
  nUpdated?: number
  nDeleted?: number
  nInserted?: number
}

export interface Sheet{
  check: () => Promise<CheckSheetResponse>,
  reset: () => Promise<ConsoleResponse>,
  commit: () => Promise<ConsoleResponse>
}

export interface SheetMap{
  [collection: string]: Sheet
}