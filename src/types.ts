export enum ConsoleRequestError {
  "pathNotFound" = "pathNotFound",
  "missingArgs" = "missingArgs",
  "permissionDenied" = "permissionDenied",
  "internalServerError" = "internalServerError",
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