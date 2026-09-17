# System Architecture — Splitwise Pro

**Version:** 1.0  
**Status:** MVP Architecture  
**Purpose:** Source-of-truth technical architecture for implementation by an AI coding agent or developer.

## 1. Architecture Goals

Splitwise Pro is a private, lightweight, mobile-first expense-sharing application for a small group of friends.

The architecture prioritizes simplicity, low/no operating cost, easy deployment, correct money calculations, safe administrative actions, concurrent expense creation, and maintainability.

The MVP must not introduce infrastructure or technologies that are not required by the PRD.

## 2. Approved Technology Stack

### Frontend
- React
- Vite
- TypeScript preferred
- Mobile-first responsive UI
- PWA support
- Target: modern iPhone screen sizes

### Backend
- Node.js
- Express.js
- TypeScript preferred
- REST API

### Database / Backend Platform
- Supabase
- PostgreSQL
- Supabase-hosted project

### Hosting
- Vercel for the frontend
- Prefer Vercel for the Node/Express API as well if it can be deployed cleanly; otherwise use the simplest suitable free-tier Node host.
- Exact provider limits must be verified at implementation time.

### Source Control
- GitHub

### Currency
- INR only
- Whole rupee amounts
- No decimals or paise

## 3. High-Level Architecture

```text
                         ┌───────────────────────┐
                         │      iPhone User      │
                         │ Safari / Home Screen  │
                         │       PWA UI          │
                         └───────────┬───────────┘
                                     │ HTTPS
                                     ▼
                         ┌───────────────────────┐
                         │       Vercel          │
                         │ React + Vite Frontend │
                         │       + API           │
                         └───────────┬───────────┘
                                     │ REST API
                                     ▼
                         ┌───────────────────────┐
                         │       Supabase        │
                         │ PostgreSQL + APIs     │
                         │ Security / Policies   │
                         └───────────────────────┘
```

The system should remain small enough for one developer or AI agent to understand and maintain.

## 4. Application Layers

### Presentation Layer
Responsible for rendering screens, interaction, UX validation, loading/error states, filtering/sorting, and API calls.

The frontend is **not** the source of truth for financial calculations.

### API Layer
Responsible for HTTP requests, request validation, admin authorization, business-logic invocation, consistent responses, and errors.

Resources include Groups, People, Categories, Expenses, Balances, and Settlements.

### Business Logic Layer
Responsible for expense validation, split validation, balance calculation, person-removal rules, settlement calculations, smart settlement optimization, and settlement validation.

Financial logic must be deterministic and independently testable.

### Data Layer
Responsible for PostgreSQL persistence, CRUD operations, database transactions, referential integrity, timestamps, active/inactive people, and historical records.

PostgreSQL is the persistent source of truth.

## 5. Core Domain Model

```text
Group
 ├── People
 ├── Categories
 ├── Expenses
 │    └── Expense Participants / Shares
 └── Settlements
```

Each group is an isolated financial context. Data from one group must never appear in another group's dashboard, balances, or settlement calculations.

## 6. Groups

A group represents a trip, household, event, or shared-expense context.

Examples:
- Goa Trip
- Manali Trip
- Flat Expenses

A group owns its people, categories, expenses, and settlements.

Deleting a group removes all associated records atomically.

## 7. People

There are no user accounts in the MVP. A person is simply a participant in a group.

Each person has:
- Unique ID
- Group ID
- Name
- Active/inactive status
- Creation timestamp

Names must be unique within a group.

### Adding a person
- No password.
- Available for future expenses.
- Existing expenses are not modified.

### Removing a person
- Admin password required.
- Mark inactive rather than hard-delete.
- Cannot participate in new expenses.
- Historical transaction records remain.
- Current balances follow the PRD's removal rules.

## 8. Categories

Categories are group-specific.

Default categories:
- Food
- Travel
- Rent
- Shopping
- Entertainment
- Utilities
- Other

Categories can be added or removed without a password.

Removing a category does not delete expenses. Expenses using it become Uncategorized.

## 9. Expense Architecture

An expense contains:
- Expense ID
- Group ID
- Description
- Amount
- Paid-by person
- Creation timestamp
- Optional category
- Participant shares

Amount must satisfy:

```text
1 <= amount <= 99,999
```

Amounts are whole rupees only. Description is required.

The payer must be a valid active person in the group at creation time. At least one participant must be selected. Participant shares must total exactly the expense amount.

## 10. Expense Shares

Expense shares are stored separately from the main expense record.

```text
Expense
   │
   ├── Participant A → ₹500
   ├── Participant B → ₹300
   └── Participant C → ₹200
```

This supports equal and unequal splits while keeping balance calculations and history clear.

Equal splitting must use deterministic whole-rupee rounding. The implementation must ensure all generated shares total exactly to the expense amount.

## 11. Balance Calculation

For each expense:

```text
balance[participant] -= participant_share
balance[payer] += expense_amount
```

For a settlement where `sender pays receiver`:

```text
balance[sender] += amount
balance[receiver] -= amount
```

The resulting balances must sum to zero.

- Positive = person should receive money.
- Negative = person should pay money.
- Zero = no outstanding balance.

## 12. Settlement Architecture

### Outstanding Balances

The backend calculates authoritative net balances for the group.

Example:

```text
Sidhant     +₹670
Rahul       -₹420
Arjun       -₹250
```

### Smart Settlement

Smart settlement is deterministic; AI is not involved.

Input:

```text
person_id → net_balance
```

Output:

```text
sender → receiver → amount
```

A standard creditor/debtor matching approach can be used:
1. Separate positive and negative balances.
2. Match debtors with creditors.
3. Transfer the minimum of the two remaining amounts.
4. Reduce both remaining amounts.
5. Continue until all balances reach zero.

Guarantees:
- No negative or zero payment.
- No person pays themselves.
- Net balances remain mathematically equivalent.
- Payment count is minimized where the chosen algorithm guarantees it.

Unit tests must cover 2-person, 3-person, multi-party, uneven, and fully-settled cases.

## 13. Settlement Logging

A smart-settlement suggestion is only a recommendation until logged.

Each recommendation has a **Log Settlement** action.

Logging requires the admin password.

A settlement record contains:
- Sender
- Receiver
- Amount
- Timestamp

After logging:
- Balances update immediately.
- Settlement appears in history.
- Settlement cannot be edited or undone.

Mistakes are corrected by recording a new settlement.

## 14. Settlement Immutability

Settlement records are append-only.

Do not provide:
- Edit settlement
- Delete settlement
- Undo settlement

## 15. Administrative Password

There are no normal user accounts.

A single administrator password protects:
- Edit expense
- Delete expense
- Remove person
- Log settlement
- Clear all transactions
- Delete group

Password verification must happen server-side.

The password must never be stored in plaintext in frontend code. Use a server-side secret or secure password hash.

## 16. Database Atomicity

Operations affecting multiple records should use database transactions where supported.

### Create expense
```text
Validate
  ↓
Create expense
  ↓
Create shares
  ↓
Commit
```

### Log settlement
```text
Verify password
  ↓
Validate settlement
  ↓
Create settlement
  ↓
Commit
```

### Delete group
```text
Verify password
  ↓
Delete group/dependent data
  ↓
Commit
```

If a required step fails, the operation should roll back.

## 17. Concurrent Transactions

Multiple friends may use the application simultaneously.

If two users submit expenses at nearly the same time:

> Both transactions must succeed.

No application-level locking is required for normal expense creation.

Each expense receives a unique ID and server-side timestamp.

The dashboard orders transactions by timestamp, with a deterministic secondary key such as ID if timestamps are identical.

## 18. Timestamp Rules

Every expense and settlement receives an automatic server-side timestamp.

Do not rely exclusively on the client device clock.

The frontend displays timestamps in local time.

Default transaction ordering:

```text
Newest → Oldest
```

## 19. Editing Expenses

Editing requires admin password.

Editable fields:
- Amount
- Description
- Payer
- Participants
- Shares
- Category

The original creation timestamp remains unchanged.

Editing updates the same expense rather than creating a duplicate and recalculates balances.

## 20. Deleting Expenses

Deleting requires admin password.

The expense and associated shares are permanently removed.

Balances recalculate immediately.

Settlement records are not modified.

If a previously logged settlement becomes inconsistent with a changed/deleted expense, the settlement remains historically recorded as required by the append-only settlement rule.

## 21. Person Removal

Removing a person requires admin password.

The person becomes inactive.

Historical records remain.

The balance engine applies the PRD's agreed removal behavior to current balances.

Inactive people cannot be selected for new expenses.

## 22. Group Deletion

Requires admin password.

Permanently removes:
- Group
- People
- Categories
- Expenses
- Expense shares
- Settlements

Deletion must be atomic.

## 23. Offline Behavior

Offline transaction recording is unsupported.

If the backend is unreachable:
- Do not record the transaction locally as successful.
- Show an error/retry state.
- Never display a false success state.

Static PWA assets may be cached, but financial mutations require an online backend.

## 24. PWA Architecture

The frontend should be installable from Safari using Add to Home Screen.

Provide:
- App icon
- Standalone display mode
- Mobile viewport configuration
- Responsive layout
- Static asset caching where appropriate

No offline financial synchronization is required.

## 25. Frontend Screen Architecture

```text
App
│
├── Group Selector
│
├── Dashboard
│   ├── Group Balance
│   ├── Filters
│   ├── Sort
│   ├── Transaction Feed
│   └── Add Expense
│
├── Settlement
│   ├── Outstanding Balances
│   ├── Smart Settlement
│   ├── Log Settlement
│   └── Settlement History
│
└── Settings
    ├── Group Settings
    ├── People
    ├── Categories
    └── Danger Zone
```

## 26. Dashboard Data Flow

```text
Select Group
     ↓
Load group data
     ↓
Load transactions
     ↓
Load/calculates balances
     ↓
Render dashboard
```

Creating an expense:

```text
Submit Expense
     ↓
POST API
     ↓
Backend validates + persists
     ↓
Return created expense
     ↓
Refresh/revalidate dashboard
     ↓
Transaction appears chronologically
     ↓
Balances update
```

Avoid optimistic financial updates unless reconciled with server state.

## 27. Settlement Data Flow

```text
Open Settlement
       ↓
Request current balances
       ↓
Display outstanding balances
       ↓
Generate Smart Settlement
       ↓
Display recommended payments
       ↓
Log Settlement
       ↓
Admin password
       ↓
Backend validates + persists
       ↓
Refresh balances
```

## 28. API Design Principles

Use REST and resource-oriented endpoints.

Example structure:

```text
GET    /api/groups
POST   /api/groups

GET    /api/groups/:groupId
DELETE /api/groups/:groupId

GET    /api/groups/:groupId/people
POST   /api/groups/:groupId/people
PATCH  /api/groups/:groupId/people/:personId

GET    /api/groups/:groupId/categories
POST   /api/groups/:groupId/categories
DELETE /api/groups/:groupId/categories/:categoryId

GET    /api/groups/:groupId/expenses
POST   /api/groups/:groupId/expenses
PATCH  /api/groups/:groupId/expenses/:expenseId
DELETE /api/groups/:groupId/expenses/:expenseId

GET    /api/groups/:groupId/balances
GET    /api/groups/:groupId/settlements
POST   /api/groups/:groupId/settlements
```

Exact request/response schemas belong in the API Design Document.

## 29. API Validation

Every mutation must be validated server-side.

Validate:
- Group existence and ownership/context
- Person/group relationship
- Person active status where required
- Category/group relationship
- Integer amount and allowed range
- Required description
- Valid participants
- Exact share total
- Valid settlement
- Admin password for protected operations

## 30. Error Handling

Use consistent API errors.

Example:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_EXPENSE",
    "message": "Expense shares must equal the total amount."
  }
}
```

Use appropriate HTTP status codes.

Do not expose internal database/server details to users.

## 31. Security Boundaries

The frontend is untrusted.

Never trust:
- Client-calculated balances
- Client-side authorization state
- Client-side password checks
- Client-provided settlement validity
- Client assumptions about group state

The backend independently validates important financial and administrative operations.

## 32. Database Security

Supabase/PostgreSQL must enforce appropriate access boundaries.

Preferred architecture: keep financial/business operations behind the backend API where practical so rules remain centralized.

Never expose the Supabase service-role key to the browser.

If Supabase APIs are directly consumed by the frontend for any operation, use strict Row Level Security and least-privilege access.

## 33. Caching

Static frontend assets may be cached.

Do not aggressively cache financial data.

Financial data should be fetched/revalidated from the backend to keep balances and transactions current.

## 34. Real-Time Updates

Real-time synchronization is not required for MVP.

If two users add expenses:
- Both persist.
- The submitting user sees the result after the API response.
- Other open clients may need refresh/revalidation to see the new data.

Supabase Realtime can be considered later.

## 35. Deployment Architecture

Recommended initial deployment:

```text
GitHub
  │
  └──────────────► Vercel
                    ├── React/Vite frontend
                    └── Node/Express API where supported
                             │
                             │ HTTPS
                             ▼
                         Supabase
                             └── PostgreSQL
```

Provider free-tier limits and deployment capabilities must be verified at implementation time because they can change.

## 36. Environment Variables

Examples:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD_HASH
```

Privileged credentials exist only on the server.

Never expose service-role credentials or admin secrets in the frontend bundle.

## 37. Observability

Minimal backend logging should cover:
- Request failures
- Database errors
- Unexpected exceptions
- Important server-side validation failures

Never log:
- Admin passwords
- Service-role keys
- Other secrets

Financial history is represented by database records, not logs.

## 38. Testing Strategy

### Expense tests
- Valid equal split
- Valid unequal split
- Invalid total shares
- Amount below ₹1
- Amount ≥ ₹100,000
- Missing description
- Invalid payer
- Inactive payer
- Invalid participant
- Invalid category

### Balance tests
- Single expense
- Multiple expenses
- Multiple payers
- Unequal splits
- Fully settled group
- Partially settled group
- Settlement followed by another expense

### Smart settlement tests
- Two people
- Three people
- Multiple creditors
- Multiple debtors
- Uneven balances
- Zero balances
- All balances zero
- Payment-count minimization for supported algorithm cases

### Admin tests
- Correct password
- Incorrect password
- Missing password
- Expense edit/delete
- Person removal
- Settlement logging
- Group deletion

### Concurrency tests
- Two expenses submitted nearly simultaneously
- Both persist
- Neither overwrites the other

## 39. Non-Functional Requirements

### Performance
The app should feel responsive on a modern iPhone over a normal connection.

### Scalability
Large-scale infrastructure is unnecessary. The system should comfortably support the intended small private groups.

### Availability
Internet connectivity is required for financial mutations. Free-tier availability is acceptable for MVP.

### Maintainability
Separate business logic from UI components and HTTP route handlers. Financial calculations must have dedicated modules and automated tests.

## 40. Locked Architectural Decisions

| Decision | Choice |
|---|---|
| Product | Private personal expense-sharing app |
| Client | Mobile-first PWA |
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL via Supabase |
| Hosting | Vercel + Supabase |
| API | REST |
| Normal authentication | None |
| Admin security | Server-side password verification |
| Currency | INR |
| Money decimals | Not supported |
| Maximum expense | ₹99,999 |
| Offline transactions | Not supported |
| Real-time | Not required |
| AI | Not used |
| Settlement | Deterministic algorithm |
| Settlement undo | Not supported |
| Concurrent expenses | Both succeed |
| Transaction order | Newest first by default |
| Persistent source of truth | PostgreSQL/backend |

## 41. Future Extension Points

Possible future additions, not MVP requirements:
- Real-time updates
- More sophisticated settlement optimization
- Multiple currencies
- User authentication
- Native mobile client
- Expense import
- Receipt/OCR
- Analytics
- Notifications

Do not implement these unless requirements change.

## 42. AI Implementation Guidance

Any AI coding agent using this document should:

1. Read the PRD before implementing.
2. Treat the PRD and this architecture as sources of truth.
3. Avoid features explicitly out of scope.
4. Do not add user accounts unless requirements change.
5. Do not use AI for expense or settlement calculations.
6. Keep financial calculations deterministic.
7. Never treat client-side financial calculations as authoritative.
8. Keep admin password verification server-side.
9. Never expose privileged Supabase credentials to the frontend.
10. Write business-logic tests alongside financial functionality.
11. Prefer small understandable modules over unnecessary abstractions.
12. Optimize UI for one-handed iPhone use.
13. Preserve historical records according to the PRD.
14. Resolve requirement conflicts explicitly rather than inventing behavior.
15. Before adding dependencies, determine whether existing stack functionality is sufficient.

## 43. Source-of-Truth Hierarchy

```text
PRD
 │
 ├── defines WHAT the product does
 ▼
System Architecture
 │
 ├── defines HOW the system is structured
 ▼
Database Schema
 │
 ├── defines HOW persistent data is represented
 ▼
API Design
 │
 ├── defines HOW components communicate
 ▼
Implementation Plan
 │
 └── defines HOW development proceeds step-by-step
```

If a lower-level document conflicts with a higher-level requirement, stop and resolve the conflict instead of implementing inconsistent behavior.
