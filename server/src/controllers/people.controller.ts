import type { Request, Response } from 'express'
import * as groupsService from '../services/groups.service.js'
import * as peopleService from '../services/people.service.js'
import type { PersonRecord } from '../services/people.service.js'
import { ApiError } from '../utils/apiError.js'
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '../utils/pgErrors.js'
import { sendSuccess } from '../utils/responses.js'
import { isUuid } from '../utils/uuid.js'
import { requireNonBlankString } from '../validators/text.js'

const PERSON_NAME_MAX_LENGTH = 100

function toPersonResponse(person: PersonRecord) {
  return {
    id: person.id,
    name: person.name,
    is_active: person.is_active,
    created_at: person.created_at,
  }
}

async function requireGroupId(groupId: string): Promise<string> {
  if (!isUuid(groupId) || !(await groupsService.getGroupById(groupId))) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', 'Group not found.')
  }
  return groupId
}

async function requirePerson(groupId: string, personId: string): Promise<PersonRecord> {
  if (!isUuid(personId)) {
    throw new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found.')
  }

  const person = await peopleService.getPersonById(groupId, personId)

  if (!person) {
    throw new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found.')
  }

  return person
}

export async function listPeople(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const includeInactive = req.query.includeInactive === 'true'
  const people = await peopleService.listPeople(groupId, includeInactive)
  sendSuccess(res, people.map(toPersonResponse))
}

export async function addPerson(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const name = requireNonBlankString(req.body?.name, 'name', PERSON_NAME_MAX_LENGTH)

  try {
    const person = await peopleService.addPerson(groupId, name)
    sendSuccess(res, toPersonResponse(person), 201)
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      throw new ApiError(
        409,
        'DUPLICATE_PERSON_NAME',
        'A person with this name already exists in the group.',
      )
    }
    throw err
  }
}

export async function removePerson(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  await requirePerson(groupId, req.params.personId)

  if (req.body?.is_active !== false) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', {
      is_active: 'is_active must be false.',
    })
  }

  const person = await peopleService.setPersonActive(groupId, req.params.personId, false)
  sendSuccess(res, toPersonResponse(person as PersonRecord))
}
