import type { Request, Response } from 'express'
import * as categoriesService from '../services/categories.service.js'
import type { CategoryRecord } from '../services/categories.service.js'
import * as groupsService from '../services/groups.service.js'
import { ApiError } from '../utils/apiError.js'
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '../utils/pgErrors.js'
import { sendSuccess } from '../utils/responses.js'
import { isUuid } from '../utils/uuid.js'
import { requireNonBlankString } from '../validators/text.js'

const CATEGORY_NAME_MAX_LENGTH = 50

function toCategoryResponse(category: CategoryRecord) {
  return {
    id: category.id,
    name: category.name,
    created_at: category.created_at,
  }
}

async function requireGroupId(groupId: string): Promise<string> {
  if (!isUuid(groupId) || !(await groupsService.getGroupById(groupId))) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', 'Group not found.')
  }
  return groupId
}

export async function listCategories(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const categories = await categoriesService.listCategories(groupId)
  sendSuccess(res, categories.map(toCategoryResponse))
}

export async function addCategory(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const name = requireNonBlankString(req.body?.name, 'name', CATEGORY_NAME_MAX_LENGTH)

  try {
    const category = await categoriesService.addCategory(groupId, name)
    sendSuccess(res, toCategoryResponse(category), 201)
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      throw new ApiError(
        409,
        'DUPLICATE_CATEGORY_NAME',
        'A category with this name already exists in the group.',
      )
    }
    throw err
  }
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)

  if (!isUuid(req.params.categoryId)) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found.')
  }

  const deleted = await categoriesService.deleteCategory(groupId, req.params.categoryId)

  if (!deleted) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found.')
  }

  res.status(204).end()
}
