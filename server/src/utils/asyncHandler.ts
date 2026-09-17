import type { NextFunction, Request, Response } from 'express'

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Express 4 does not forward rejected promises to error middleware on its own.
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}
