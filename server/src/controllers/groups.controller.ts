import type { Request, Response } from 'express'
import * as groupsService from '../services/groups.service.js'
import type { GroupRecord } from '../services/groups.service.js'
import { ApiError } from '../utils/apiError.js'
import { sendSuccess } from '../utils/responses.js'
import { isUuid } from '../utils/uuid.js'
import { requireNonBlankString } from '../validators/text.js'

const GROUP_NAME_MAX_LENGTH = 100

function toGroupResponse(group: GroupRecord) {
  return {
    id: group.id,
    name: group.name,
    created_at: group.created_at,
  }
}

async function requireGroup(groupId: string): Promise<GroupRecord> {
  if (!isUuid(groupId)) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', 'Group not found.')
  }

  const group = await groupsService.getGroupById(groupId)

  if (!group) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', 'Group not found.')
  }

  return group
}

export async function listGroups(_req: Request, res: Response): Promise<void> {
  const groups = await groupsService.listGroups()
  sendSuccess(res, groups.map(toGroupResponse))
}

export async function createGroup(req: Request, res: Response): Promise<void> {
  const name = requireNonBlankString(req.body?.name, 'name', GROUP_NAME_MAX_LENGTH)
  const group = await groupsService.createGroup(name)
  sendSuccess(res, toGroupResponse(group), 201)
}

export async function getGroup(req: Request, res: Response): Promise<void> {
  const group = await requireGroup(req.params.groupId)
  sendSuccess(res, toGroupResponse(group))
}

export async function renameGroup(req: Request, res: Response): Promise<void> {
  await requireGroup(req.params.groupId)
  const name = requireNonBlankString(req.body?.name, 'name', GROUP_NAME_MAX_LENGTH)
  const group = await groupsService.renameGroup(req.params.groupId, name)
  sendSuccess(res, toGroupResponse(group as GroupRecord))
}

export async function deleteGroup(req: Request, res: Response): Promise<void> {
  await requireGroup(req.params.groupId)
  await groupsService.deleteGroup(req.params.groupId)
  res.status(204).end()
}
