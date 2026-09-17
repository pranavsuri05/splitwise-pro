# API Design Document — Splitwise Pro

**Version:** 1.0  
**Status:** MVP API Contract  
**Backend:** Node.js + Express  
**Database:** PostgreSQL via Supabase  
**API Style:** REST  
**Transport:** HTTPS / JSON

---

## 1. Purpose

This document defines the API contract between the Splitwise Pro React/PWA frontend and the backend.

It specifies:

- Endpoints
- HTTP methods
- Request formats
- Response formats
- Validation
- Authorization requirements
- Error handling
- Balance calculation
- Smart settlement generation
- Mutation behavior

The API is the authoritative interface for financial operations.

---

# 2. API Principles

1. RESTful resource-oriented endpoints.
2. JSON request and response bodies.
3. HTTPS in all deployed environments.
4. No normal user authentication.
5. Admin password required for protected operations.
6. All financial validation happens server-side.
7. The frontend is untrusted.
8. Balances are calculated from persisted expenses and settlements.
9. Smart settlements are calculated dynamically.
10. Settlement records are immutable.
11. Multi-record mutations are atomic.
12. Successful expense submissions must persist even when multiple clients submit concurrently.

---

# 3. Base URL

Development:

```text
http://localhost:<PORT>/api
```

Production:

```text
https://<production-domain>/api
```

The frontend must obtain the production API base URL from environment configuration.

---

# 4. Content Type

Requests containing JSON:

```http
Content-Type: application/json
```

Responses:

```http
Content-Type: application/json
```

---

# 5. Standard Response Format

## Success

```json
{
  "success": true,
  "data": {}
}
```

For list endpoints:

```json
{
  "success": true,
  "data": []
}
```

## Error

```json
{
  "success": false,
  "error": {
    "code": "INVALID_EXPENSE",
    "message": "Expense shares must equal the total amount."
  }
}
```

Optional structured validation details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "fields": {
      "description": "Description is required."
    }
  }
}
```

Do not expose stack traces, SQL errors, service credentials, or internal implementation details.

---

# 6. HTTP Status Codes

| Status | Meaning |
|---|---|
| `200` | Successful request |
| `201` | Resource created |
| `204` | Successful deletion with no response body |
| `400` | Invalid request |
| `401` | Missing/invalid admin authorization |
| `404` | Resource not found |
| `409` | Resource/state conflict |
| `422` | Valid request structure but invalid business data |
| `500` | Unexpected server error |
| `503` | Backend/database temporarily unavailable |

---

# 7. Authentication Model

There are no user accounts.

Normal operations do not require authentication.

Protected operations require the shared admin password.

Protected operations:

- Edit expense
- Delete expense
- Remove person
- Log settlement
- Clear transactions
- Delete group

The admin password must be sent only over HTTPS.

The backend must verify it server-side.

Never perform the password check only in React.

---

# 8. Admin Authorization

For protected requests, use a consistent mechanism.

Recommended header:

```http
X-Admin-Password: <password>
```

Example:

```http
PATCH /api/groups/:groupId/expenses/:expenseId
X-Admin-Password: <password>
```

The server should:

1. Read the header.
2. Reject if missing.
3. Verify against the server-side secret/hash.
4. Continue only if valid.

Error:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ADMIN_PASSWORD",
    "message": "Admin authorization failed."
  }
}
```

Use `401 Unauthorized`.

The server must never return whether a partial password was correct.

---

# 9. Groups API

## 9.1 List Groups

```http
GET /api/groups
```

Returns all groups.

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Goa Trip",
      "created_at": "2026-09-17T05:30:00Z"
    }
  ]
}
```

No password required.

---

## 9.2 Create Group

```http
POST /api/groups
```

### Request

```json
{
  "name": "Goa Trip"
}
```

### Validation

- Name required.
- Must not be whitespace-only.
- Maximum 100 characters.
- Duplicate group names are allowed.

### Response

`201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Goa Trip",
    "created_at": "2026-09-17T05:30:00Z"
  }
}
```

No password required.

---

## 9.3 Get Group

```http
GET /api/groups/:groupId
```

Returns basic group information.

### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Goa Trip",
    "created_at": "2026-09-17T05:30:00Z"
  }
}
```

---

## 9.4 Delete Group

```http
DELETE /api/groups/:groupId
```

Requires admin password.

Deletes:

- Group
- People
- Categories
- Expenses
- Expense shares
- Settlements

The operation must be atomic.

### Response

`204 No Content`

---

# 10. People API

## 10.1 List People

```http
GET /api/groups/:groupId/people
```

### Optional query

```text?includeInactive=true
```

Default behavior should return active people for normal expense selection.

The settings screen may request inactive people as well.

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Sidhant",
      "is_active": true,
      "created_at": "2026-09-17T05:35:00Z"
    }
  ]
}
```

---

## 10.2 Add Person

```http
POST /api/groups/:groupId/people
```

No password.

### Request

```json
{
  "name": "Rahul"
}
```

### Validation

- Required.
- Not whitespace-only.
- Maximum 100 characters.
- Name must be unique within the group.

### Response

`201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Rahul",
    "is_active": true,
    "created_at": "2026-09-17T05:40:00Z"
  }
}
```

Adding a person does not modify historical expenses.

---

## 10.3 Remove Person

```http
PATCH /api/groups/:groupId/people/:personId
```

Requires admin password.

### Request

```json
{
  "is_active": false
}
```

The backend must verify that the person belongs to the group.

### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Rahul",
    "is_active": false,
    "created_at": "2026-09-17T05:40:00Z"
  }
}
```

Historical records remain.

The person cannot participate in new expenses.

The balance engine applies the PRD's person-removal behavior.

---

# 11. Categories API

## 11.1 List Categories

```http
GET /api/groups/:groupId/categories
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Food",
      "created_at": "2026-09-17T05:45:00Z"
    }
  ]
}
```

---

## 11.2 Add Category

```http
POST /api/groups/:groupId/categories
```

No password.

### Request

```json
{
  "name": "Food"
}
```

### Validation

- Required.
- Not whitespace-only.
- Maximum 50 characters.
- Unique within the group.

### Response

`201 Created`

---

## 11.3 Remove Category

```http
DELETE /api/groups/:groupId/categories/:categoryId
```

No password.

Before/deleting category references, existing expenses using it must be converted to Uncategorized.

Preferred behavior:

```text
category_id → NULL
```

Then delete category.

The operation should be atomic.

---

# 12. Expenses API

## 12.1 List Expenses

```http
GET /api/groups/:groupId/expenses
```

Default order:

```text
created_at DESC
```

### Optional query parameters

```text
categoryId=<uuid>
personId=<uuid>
from=<ISO timestamp>
to=<ISO timestamp>
sort=newest
```

Supported sort values:

```text
newest
oldest
amount_desc
amount_asc
```

Filtering/sorting is primarily a presentation feature, but the API should support server-side filtering where useful.

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "description": "Dinner",
      "amount": 2400,
      "paid_by": {
        "id": "uuid",
        "name": "Sidhant"
      },
      "category": {
        "id": "uuid",
        "name": "Food"
      },
      "shares": [
        {
          "person_id": "uuid",
          "person_name": "Sidhant",
          "amount": 800
        },
        {
          "person_id": "uuid",
          "person_name": "Rahul",
          "amount": 800
        },
        {
          "person_id": "uuid",
          "person_name": "Arjun",
          "amount": 800
        }
      ],
      "created_at": "2026-09-17T06:00:00Z"
    }
  ]
}
```

---

# 13. Create Expense

```http
POST /api/groups/:groupId/expenses
```

No admin password.

### Request

```json
{
  "description": "Dinner",
  "amount": 2400,
  "paid_by": "payer-uuid",
  "category_id": "category-uuid",
  "shares": [
    {
      "person_id": "person-a-uuid",
      "amount": 800
    },
    {
      "person_id": "person-b-uuid",
      "amount": 800
    },
    {
      "person_id": "person-c-uuid",
      "amount": 800
    }
  ]
}
```

`category_id` is optional and may be `null`.

### Validation

- Group exists.
- Amount is an integer.
- Amount is between ₹1 and ₹99,999 inclusive.
- Description is required and non-empty.
- Payer exists.
- Payer belongs to group.
- Payer is active.
- At least one share exists.
- Each participant exists.
- Each participant belongs to group.
- Each participant is active.
- No duplicate participant.
- Share amounts are whole integers.
- Shares are non-negative.
- Sum of shares equals expense amount exactly.
- Category belongs to group if provided.

### Atomicity

Creating an expense and its shares must occur in one database transaction.

### Response

`201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "description": "Dinner",
    "amount": 2400,
    "paid_by": {
      "id": "uuid",
      "name": "Sidhant"
    },
    "category": {
      "id": "uuid",
      "name": "Food"
    },
    "shares": [],
    "created_at": "2026-09-17T06:00:00Z"
  }
}
```

The timestamp is server-generated.

---

# 14. Update Expense

```http
PATCH /api/groups/:groupId/expenses/:expenseId
```

Requires admin password.

### Request

The request may contain any editable fields, but validation should be performed against the resulting complete expense state.

Example:

```json
{
  "description": "Dinner at Cafe",
  "amount": 2700,
  "paid_by": "payer-uuid",
  "category_id": "category-uuid",
  "shares": [
    {
      "person_id": "person-a-uuid",
      "amount": 900
    },
    {
      "person_id": "person-b-uuid",
      "amount": 900
    },
    {
      "person_id": "person-c-uuid",
      "amount": 900
    }
  ]
}
```

### Rules

- Keep same expense ID.
- Keep original `created_at`.
- Validate all resulting fields.
- Update expense and shares transactionally.
- Recalculated balances must reflect the new expense.

---

# 15. Delete Expense

```http
DELETE /api/groups/:groupId/expenses/:expenseId
```

Requires admin password.

Deletes:

- Expense
- Associated expense shares

Settlement records remain unchanged.

### Response

`204 No Content`

---

# 16. Balance API

## Get Current Balances

```http
GET /api/groups/:groupId/balances
```

No password.

Balances are calculated dynamically.

### Response

```json
{
  "success": true,
  "data": {
    "total_outstanding": 920,
    "balances": [
      {
        "person_id": "uuid",
        "person_name": "Sidhant",
        "balance": 670
      },
      {
        "person_id": "uuid",
        "person_name": "Rahul",
        "balance": -420
      },
      {
        "person_id": "uuid",
        "person_name": "Arjun",
        "balance": -250
      }
    ]
  }
}
```

The balance sum must equal zero.

Positive values mean the person should receive money.

Negative values mean the person should pay money.

---

# 17. Smart Settlement API

## Get Smart Settlement Suggestions

```http
GET /api/groups/:groupId/settlements/suggestions
```

No password.

The backend:

1. Calculates current balances.
2. Separates creditors and debtors.
3. Matches them deterministically.
4. Produces recommended payments.
5. Does not persist the recommendations.

### Response

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "from_person": {
          "id": "uuid",
          "name": "Rahul"
        },
        "to_person": {
          "id": "uuid",
          "name": "Sidhant"
        },
        "amount": 400
      },
      {
        "from_person": {
          "id": "uuid",
          "name": "Arjun"
        },
        "to_person": {
          "id": "uuid",
          "name": "Sidhant"
        },
        "amount": 800
      }
    ]
  }
}
```

Rules:

- No zero-value suggestions.
- No negative amounts.
- No self-payments.
- All amounts are whole rupees.
- Suggestions must reconcile with current balances.

---

# 18. Settlement API

## List Settlement History

```http
GET /api/groups/:groupId/settlements
```

No password.

Default:

```text
created_at DESC
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "from_person": {
        "id": "uuid",
        "name": "Rahul"
      },
      "to_person": {
        "id": "uuid",
        "name": "Sidhant"
      },
      "amount": 400,
      "created_at": "2026-09-17T06:15:00Z"
    }
  ]
}
```

---

# 19. Log Settlement

```http
POST /api/groups/:groupId/settlements
```

Requires admin password.

### Request

```json
{
  "from_person": "rahul-uuid",
  "to_person": "sidhant-uuid",
  "amount": 400
}
```

### Validation

- Group exists.
- Both people exist.
- Both belong to group.
- Sender ≠ receiver.
- Amount is a positive integer.
- Settlement is valid against current outstanding state according to the business rules.
- Admin password is correct.

### Atomicity

Settlement insertion is transactional.

### Response

`201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "from_person": {
      "id": "uuid",
      "name": "Rahul"
    },
    "to_person": {
      "id": "uuid",
      "name": "Sidhant"
    },
    "amount": 400,
    "created_at": "2026-09-17T06:15:00Z"
  }
}
```

There is no settlement edit, delete, or undo endpoint.

---

# 20. Clear All Transactions

```http
DELETE /api/groups/:groupId/expenses
```

Requires admin password.

Deletes all expenses and associated shares for the group.

Settlement history behavior must follow the product rule chosen during implementation; because settlements are immutable historical events, do not silently delete settlement records unless the product explicitly defines "clear all" as a full financial reset.

**Recommended MVP interpretation:** "Clear All Transactions" should clear expenses/shares and also clear the group's settlement history as part of a complete reset, with the entire operation protected by the admin password and executed atomically.

If this behavior is changed, update the PRD, schema, and API documents together.

---

# 21. Group Data Retrieval

The frontend may load each resource independently or use an aggregate endpoint.

Optional optimization:

```http
GET /api/groups/:groupId/dashboard
```

Possible response:

```json
{
  "success": true,
  "data": {
    "group": {},
    "people": [],
    "categories": [],
    "expenses": [],
    "balances": {}
  }
}
```

This is optional.

The initial implementation should prefer simple resource endpoints unless a dashboard aggregate materially improves performance or code simplicity.

---

# 22. Error Codes

Recommended codes:

```text
INVALID_REQUEST
VALIDATION_ERROR
GROUP_NOT_FOUND
PERSON_NOT_FOUND
CATEGORY_NOT_FOUND
EXPENSE_NOT_FOUND
SETTLEMENT_NOT_FOUND
DUPLICATE_PERSON_NAME
DUPLICATE_CATEGORY_NAME
INVALID_EXPENSE
INVALID_EXPENSE_AMOUNT
INVALID_EXPENSE_SHARES
INACTIVE_PERSON
INVALID_CATEGORY
INVALID_SETTLEMENT
INVALID_ADMIN_PASSWORD
ADMIN_PASSWORD_REQUIRED
DATABASE_ERROR
INTERNAL_ERROR
```

Errors should be stable enough for the frontend to handle programmatically.

---

# 23. Important Business Rules

The backend must enforce these rules regardless of frontend behavior:

### Expense

```text
1 ≤ amount ≤ 99,999
```

```text
sum(shares) = expense.amount
```

### Person

```text
unique name within group
```

Inactive people cannot participate in new expenses.

### Category

```text
unique name within group
```

Category is optional.

### Settlement

```text
amount > 0
from_person != to_person
```

### Balances

```text
sum(all current balances) = 0
```

---

# 24. Concurrency

The API must support simultaneous expense creation.

Example:

```text
Client A ── POST expense A ──┐
                             ├── PostgreSQL
Client B ── POST expense B ──┘
```

Both requests should succeed when individually valid.

Do not use a global application lock around expense creation.

Use database transactions for each individual mutation.

UUIDs prevent ID collisions.

---

# 25. Timestamp Handling

The backend/database generates timestamps.

The client should not be trusted to define the authoritative transaction creation time.

The API returns ISO-8601 timestamps.

Example:

```text
2026-09-17T06:15:00Z
```

The frontend converts them to local display time.

---

# 26. Idempotency Consideration

MVP does not require a full idempotency-key system.

However, the implementation should avoid accidental duplicate submissions caused by button double-clicks.

Frontend:
- Disable the submit button while the request is in progress.

Backend:
- Remain safe under retries where practical.

If the app later supports unreliable networks or higher-stakes usage, introduce an idempotency key for financial mutations.

---

# 27. Security Requirements

1. HTTPS in production.
2. Admin password verification only on backend.
3. Never expose password/hash to frontend source.
4. Never expose Supabase service-role key to browser.
5. Validate every mutation server-side.
6. Verify all resource/group relationships.
7. Rate-limit admin-password attempts where practical.
8. Return generic authorization errors.
9. Do not log passwords or privileged secrets.
10. Do not trust client-provided balances.
11. Do not trust client-provided settlement calculations.

---

# 28. Frontend/API Interaction

### Dashboard load

```text
GET group
GET people
GET categories
GET expenses
GET balances
```

### Add expense

```text
User fills form
       ↓
POST /expenses
       ↓
Success
       ↓
Refresh expenses + balances
```

### Edit expense

```text
User opens expense
       ↓
Admin password
       ↓
PATCH /expenses/:id
       ↓
Refresh expenses + balances
```

### Delete expense

```text
Admin password
       ↓
DELETE /expenses/:id
       ↓
Refresh expenses + balances
```

### Settlement

```text
GET /balances
       ↓
GET /settlements/suggestions
       ↓
Display recommendations
       ↓
Log Settlement
       ↓
POST /settlements
       ↓
Refresh balances + history
```

---

# 29. API Testing Requirements

Every endpoint should have automated tests covering:

- Success
- Missing fields
- Invalid fields
- Wrong group IDs
- Wrong person/category relationships
- Inactive people
- Authorization failures
- Database failures
- Boundary amounts
- Concurrent requests where applicable

Financial business logic should also have unit tests independent of Express routes.

---

# 30. API Versioning

MVP can begin with:

```text
/api
```

No version prefix is required initially.

If breaking API changes become necessary later, introduce:

```text
/api/v1
```

Do not prematurely add versioning complexity to the MVP.

---

# 31. AI Implementation Guidance

Any AI coding agent implementing this API should:

1. Read the PRD, System Architecture, and Database Schema first.
2. Treat this document as the API contract.
3. Implement validation on the backend even when frontend validation exists.
4. Keep financial calculations in dedicated business-logic modules.
5. Never calculate authoritative balances solely in React.
6. Never expose Supabase service-role credentials.
7. Never perform admin password validation solely in the frontend.
8. Use database transactions for multi-record mutations.
9. Keep settlement records append-only.
10. Return consistent response structures.
11. Use stable error codes.
12. Write API tests alongside implementation.
13. Do not create endpoints for explicitly out-of-scope features.
14. Do not introduce authentication/account systems unless requirements change.
15. If an API behavior conflicts with the PRD or schema, stop and resolve the conflict rather than silently choosing a different behavior.

---

# 32. Locked API Decisions

| Decision | Choice |
|---|---|
| Style | REST |
| Format | JSON |
| Normal authentication | None |
| Admin authentication | Shared password |
| Admin header | `X-Admin-Password` |
| Financial source of truth | Backend + PostgreSQL |
| Balances endpoint | Dynamic calculation |
| Smart settlement | Dynamic calculation |
| Smart settlement persistence | None |
| Settlement persistence | Append-only |
| Settlement undo endpoint | None |
| Expense mutation | Transactional |
| Concurrent expenses | Both succeed |
| Timestamps | Server/database generated |
| Currency | INR |
| Money | Integer rupees |
| Maximum expense | ₹99,999 |
| Offline mutations | Not supported |

---

# 33. Source-of-Truth Hierarchy

```text
PRD
 │
 ├── WHAT the product does
 ▼
System Architecture
 │
 ├── HOW the system is structured
 ▼
Database Schema
 │
 ├── HOW data is persisted
 ▼
API Design
 │
 ├── HOW components communicate
 ▼
User Stories / User Flows
 │
 ├── HOW users interact
 ▼
Implementation Plan
 │
 └── HOW development proceeds
```

If a lower-level document conflicts with a higher-level requirement, resolve the conflict explicitly and update the affected documents together.
