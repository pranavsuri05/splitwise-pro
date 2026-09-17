# Database Schema — Splitwise Pro

**Version:** 1.0  
**Status:** MVP Schema  
**Database:** PostgreSQL via Supabase  
**Purpose:** Source-of-truth data model for implementation.

## 1. Schema Goals

The database must:
- Keep the model simple.
- Isolate data by group.
- Preserve historical records where required.
- Support concurrent users.
- Avoid storing derived balances.
- Avoid storing Smart Settlement recommendations.
- Use UUID primary keys.
- Store whole INR amounts only.
- Maintain referential integrity.
- Support safe deletion and deactivation rules.

## 2. Entity Relationship Overview

```text
groups
  ├──< people
  ├──< categories
  ├──< expenses
  │      └──< expense_shares
  └──< settlements
```

## 3. General Conventions

### IDs
All primary keys use UUIDs for safe concurrent creation and non-predictable identifiers.

### Timestamps
Use `TIMESTAMPTZ`. Server/database-generated timestamps are authoritative.

### Money
Store whole INR amounts as integers.

```text
₹500   → 500
₹1,250 → 1250
```

No paise or decimal monetary columns.

## 4. `groups`

Represents a trip, event, household, or shared-expense context.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique group ID |
| `name` | VARCHAR(100) | NOT NULL | Group name |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |

Rules:
- Group names do not need to be globally unique.
- Multiple groups may have the same name.
- Deleting a group permanently deletes its dependent data atomically.

## 5. `people`

Represents participants within a group.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique person ID |
| `group_id` | UUID | FK → groups.id | Owning group |
| `name` | VARCHAR(100) | NOT NULL | Person name |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Can participate in new expenses |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |

Constraint:

```sql
UNIQUE (group_id, name)
```

Adding a person requires no password and affects only future expenses.

Removing a person requires the admin password, sets `is_active = FALSE`, preserves historical references, and prevents future participation.

## 6. `categories`

Represents group-specific expense categories.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique category ID |
| `group_id` | UUID | FK → groups.id | Owning group |
| `name` | VARCHAR(50) | NOT NULL | Category name |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |

Constraint:

```sql
UNIQUE (group_id, name)
```

Categories can be added/removed without password.

Removing a category does not delete expenses. Existing expenses referencing it become Uncategorized by setting `category_id` to NULL.

## 7. `expenses`

Represents the main expense record.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique expense ID |
| `group_id` | UUID | FK → groups.id | Owning group |
| `description` | VARCHAR(150) | NOT NULL | Required description |
| `amount` | INTEGER | NOT NULL | Total whole-rupee amount |
| `paid_by` | UUID | FK → people.id | Payer |
| `category_id` | UUID | FK → categories.id, NULL | Optional category |
| `created_at` | TIMESTAMPTZ | NOT NULL | Server-generated timestamp |

Amount constraint:

```sql
CHECK (amount >= 1 AND amount <= 99999)
```

Description must not be blank or whitespace-only.

Payer and category must belong to the same group; payer must be active at creation time.

## 8. `expense_shares`

Represents each participant's share of an expense.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique share ID |
| `expense_id` | UUID | FK → expenses.id | Parent expense |
| `person_id` | UUID | FK → people.id | Participant |
| `amount` | INTEGER | NOT NULL | Whole-rupee share |

Constraints:

```sql
CHECK (amount >= 0)
UNIQUE (expense_id, person_id)
```

Rules:
- At least one share.
- All shares are whole rupees.
- Sum of shares must equal the expense amount exactly.
- Participants must belong to the expense's group.
- New expenses cannot include inactive people.

Equal-split rounding must be deterministic and must always produce a total exactly equal to the expense amount.

## 9. `settlements`

Represents an actual payment logged between people.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique settlement ID |
| `group_id` | UUID | FK → groups.id | Owning group |
| `from_person` | UUID | FK → people.id | Person who paid |
| `to_person` | UUID | FK → people.id | Person who received |
| `amount` | INTEGER | NOT NULL | Whole-rupee payment |
| `created_at` | TIMESTAMPTZ | NOT NULL | Server-generated timestamp |

Constraints:

```sql
CHECK (amount >= 1)
CHECK (from_person <> to_person)
```

Both people must belong to the same group. Settlement logging requires the admin password.

Settlement records are immutable: no edit, delete, or undo.

Mistakes are corrected with a new settlement.

## 10. Why Balances Are Not Stored

There is intentionally no balances table.

Balances are derived from expenses and logged settlements:

```text
Expenses
   ↓
Participant shares + payer credits
   ↓
Net balances
   ↓
Logged settlements
   ↓
Current balances
```

This maintains one source of truth.

For an expense:

```text
balance[participant] -= participant_share
balance[payer] += expense_amount
```

For a settlement where sender pays receiver:

```text
balance[sender] += amount
balance[receiver] -= amount
```

Final balances must sum to zero.

## 11. Why Smart Settlements Are Not Stored

Smart Settlement recommendations are derived from current balances and therefore do not need a table.

Only actual logged settlements are persisted.

## 12. Referential Integrity

```text
groups.id
   ├── people.group_id
   ├── categories.group_id
   ├── expenses.group_id
   └── settlements.group_id

expenses.id
   └── expense_shares.expense_id

people.id
   ├── expenses.paid_by
   ├── expense_shares.person_id
   ├── settlements.from_person
   └── settlements.to_person
```

## 13. Deletion Strategy

### Group
Delete group and all dependent people, categories, expenses, shares, and settlements atomically.

### Expense
Delete expense and cascade its expense shares. Settlements remain unchanged.

### Category
Do not delete expenses. Set their `category_id` to NULL.

### Person
Do not physically delete through the normal UI. Set `is_active = FALSE` so historical references remain valid.

## 14. Person Removal and Historical Data

Removing a person is a business-level operation, not a hard database deletion.

Keep:
- Person record
- Historical expense participation
- Historical payments
- Historical settlements

The balance engine applies the PRD's agreed removal behavior when calculating the current state.

## 15. Editing Expenses

Editing requires the admin password.

Editable fields:
- Description
- Amount
- Payer
- Category
- Participants
- Shares

Keep the same `id` and original `created_at`.

Recommended transactional flow:

```text
Verify password
      ↓
Validate complete update
      ↓
Update expense
      ↓
Replace/update shares
      ↓
Commit
```

No partial update should remain after failure.

## 16. Deleting Expenses

Deleting requires the admin password.

Delete the expense and its shares. Recalculate balances immediately. Settlement records are not modified.

## 17. Concurrency

Multiple users may create expenses simultaneously.

Both transactions must persist.

UUID IDs avoid client-side ID collisions. No application-level locking is required for normal expense creation.

If timestamps are identical, use `id` as a deterministic secondary sort key.

## 18. Indexing

Recommended indexes:

```sql
CREATE INDEX expenses_group_created_at
ON expenses(group_id, created_at DESC);

CREATE INDEX people_group_active
ON people(group_id, is_active);

CREATE INDEX categories_group
ON categories(group_id);

CREATE INDEX expense_shares_expense
ON expense_shares(expense_id);

CREATE INDEX expense_shares_person
ON expense_shares(person_id);

CREATE INDEX settlements_group_created_at
ON settlements(group_id, created_at DESC);
```

Unique constraints also provide useful indexes.

## 19. Database Transactions

Use PostgreSQL transactions for multi-record mutations.

### Create expense

```text
BEGIN
  validate group/person/category
  insert expense
  insert shares
  validate share total
COMMIT
```

### Edit expense

```text
BEGIN
  verify authorization
  validate update
  update expense
  replace/update shares
COMMIT
```

### Log settlement

```text
BEGIN
  verify authorization
  validate settlement
  insert settlement
COMMIT
```

### Delete group

```text
BEGIN
  verify authorization
  delete group
  cascade dependent data
COMMIT
```

## 20. Database vs Application Validation

Database constraints should handle simple invariants:
- Amount range
- Positive settlement amount
- Sender ≠ receiver
- Unique person names
- Unique category names
- Unique expense/person shares

Backend business logic should handle contextual rules:
- Person belongs to group
- Category belongs to group
- Payer belongs to group
- Payer is active
- Participant belongs to group
- Shares total exactly to expense amount
- Settlement participants belong to group
- Person-removal behavior
- Admin authorization

## 21. Conceptual SQL Schema

```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE people (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, name)
);

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, name)
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description VARCHAR(150) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 1 AND amount <= 99999),
    paid_by UUID NOT NULL REFERENCES people(id),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expense_shares (
    id UUID PRIMARY KEY,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id),
    amount INTEGER NOT NULL CHECK (amount >= 0),
    UNIQUE (expense_id, person_id)
);

CREATE TABLE settlements (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_person UUID NOT NULL REFERENCES people(id),
    to_person UUID NOT NULL REFERENCES people(id),
    amount INTEGER NOT NULL CHECK (amount >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (from_person <> to_person)
);
```

The production migration must additionally enforce required cross-table/group validation and Supabase security policies.

## 22. Locked Database Decisions

| Decision | Choice |
|---|---|
| Database | PostgreSQL via Supabase |
| Primary key | UUID |
| Currency | INR |
| Money representation | Integer rupees |
| Decimal/paise | Not supported |
| Maximum expense | ₹99,999 |
| Group names | Not globally unique |
| Person names | Unique within group |
| Category names | Unique within group |
| Person removal | Soft/inactive |
| Category removal | Existing expenses become Uncategorized |
| Balance storage | Not stored |
| Smart settlement storage | Not stored |
| Settlement records | Append-only |
| Settlement undo | Not supported |
| Expense timestamps | Server/database generated |
| Historical people | Preserved |
| Group deletion | Cascading atomic deletion |
| Concurrent expenses | Both persist |
| Default transaction ordering | Newest → Oldest |

## 23. AI Implementation Guidance

Any AI coding agent implementing this schema should:

1. Read the PRD and System Architecture first.
2. Create version-controlled migrations.
3. Use UUIDs consistently.
4. Use `TIMESTAMPTZ`.
5. Store money as integer rupees.
6. Never use floating-point monetary calculations.
7. Preserve historical people and settlement references.
8. Never hard-delete a person through normal removal.
9. Use transactions for multi-record mutations.
10. Validate cross-table rules server-side.
11. Add indexes for actual query patterns.
12. Never store derived balances.
13. Never store Smart Settlement recommendations.
14. Keep settlements append-only.
15. Never expose privileged Supabase credentials to the frontend.
16. Test migrations on a clean database before deployment.

## 24. Source-of-Truth Hierarchy

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
 ├── HOW persistent data is represented
 ▼
API Design
 │
 ├── HOW components communicate
 ▼
Implementation Plan
 │
 └── HOW development proceeds
```

If implementation requirements conflict with this schema, resolve the conflict explicitly instead of silently creating inconsistent data behavior.
