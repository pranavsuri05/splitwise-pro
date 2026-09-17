import { Router } from 'express'
import * as categoriesController from '../controllers/categories.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const categoriesRouter = Router({ mergeParams: true })

categoriesRouter.get('/', asyncHandler(categoriesController.listCategories))
categoriesRouter.post('/', asyncHandler(categoriesController.addCategory))
categoriesRouter.delete('/:categoryId', asyncHandler(categoriesController.deleteCategory))
