export const VERSION = require("../../package.json").version
export const PRODUCTION = process.env.NODE_ENV == "production"
export const DELETE_MARK = "x"