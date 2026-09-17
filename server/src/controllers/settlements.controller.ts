import type { Request, Response } from 'express'
import * as groupsService from '../services/groups.service.js'
import * as settlementsService from '../services/settlements.service.js'
import { ApiError } from '../utils/apiError.js'
import { sendSuccess } from '../utils/responses.js'
import { isUuid } from '../utils/uuid.js'
import { parseCreateSettlementBody } from '../validators/settlements.js'

async function requireGroupId(groupId: string): Promise<string> {
  if (!isUuid(groupId) || !(await groupsService.getGroupById(groupId))) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', 'Group not found.')
  }
  return groupId
}

export async function getSuggestions(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const suggestions = await settlementsService.getSettlementSuggestions(groupId)
  sendSuccess(res, { suggestions })
}

export async function listHistory(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const history = await settlementsService.listSettlementHistory(groupId)
  sendSuccess(res, history)
}

export async function createSettlement(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const input = parseCreateSettlementBody(req.body)
  const settlement = await settlementsService.createSettlement(groupId, input)
  sendSuccess(res, settlement, 201)
}
