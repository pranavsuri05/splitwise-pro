import type { Request, Response } from 'express'
import * as balancesService from '../services/balances.service.js'
import * as groupsService from '../services/groups.service.js'
import { ApiError } from '../utils/apiError.js'
import { sendSuccess } from '../utils/responses.js'
import { isUuid } from '../utils/uuid.js'

export async function getBalances(req: Request, res: Response): Promise<void> {
  const groupId = req.params.groupId

  if (!isUuid(groupId) || !(await groupsService.getGroupById(groupId))) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', 'Group not found.')
  }

  const result = await balancesService.getGroupBalances(groupId)
  sendSuccess(res, result)
}
