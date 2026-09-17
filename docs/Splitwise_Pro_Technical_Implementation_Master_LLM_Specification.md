# Splitwise Pro — Technical Implementation & Master LLM Build Specification

## 1. Purpose

This is the final implementation-facing specification for Splitwise Pro.

It combines:

- Technical implementation guidance
- Codebase conventions
- LLM build instructions
- Non-negotiable product rules
- Implementation sequence
- Acceptance criteria
- Final QA checklist

This document should be used together with Docs 1–9.

The goal is to give a coding LLM enough context to build the application without inventing unnecessary product behavior or changing locked requirements.

---

# 2. Source of Truth

The project specification consists of these documents:

1. PRD
2. System Architecture
3. Database Schema
4. API Design
5. User Stories & User Flows
6. UI/UX Specification
7. Business Logic & Algorithms
8. Security Specification
9. Testing Strategy
10. This document

### Authority rule

If implementation details appear ambiguous:

1. Follow the explicit locked product requirement.
2. Follow the Business Logic document for calculations.
3. Follow the Database Schema for data structure.
4. Follow the API Design for API contracts.
5. Follow the UI/UX Specification for interface behavior.
6. Do not invent a new feature simply because it seems useful.

If two requirements genuinely conflict, stop and identify the conflict instead of silently redesigning the product.

---

# 3. Product Summary

Splitwise Pro is a private personal expense-sharing web application for small groups of friends.

It is intentionally simpler than a commercial expense-management platform.

Core capabilities:

- Multiple independent groups.
- Shared dashboard.
- Add expenses.
- Equal or manually adjusted unequal splits.
- Categories.
- Group balances.
- Smart settlement suggestions.
- Individual settlement logging.
- Transaction editing/deletion.
- Person management.
- Group management.
- Minimal iPhone-first PWA interface.

The application is not intended to become a full financial platform.

---

# 4. Locked Technology Stack

Use:

```text
Frontend:
React
Vite
PWA

Backend:
Node.js
Express

Database:
PostgreSQL
Supabase

Hosting:
Vercel + Supabase

Source Control:
Git + GitHub
```

Do not replace the stack with another framework unless explicitly requested.

---

# 5. Product Constraints

The following are non-negotiable MVP requirements.

## Identity

There are:

- No user accounts.
- No login screen.
- No OAuth.
- No JWT user authentication.
- No current-user concept.
- No "who are you?" selection.

Anyone with access to the private group link can view and record transactions.

A shared admin password protects sensitive mutations.

---

## Groups

Each group has independent:

- People
- Categories
- Expenses
- Expense shares
- Balances
- Settlement history

Group names do not need to be globally unique.

---

## People

Person names are unique within a group.

People are soft-removed:

```text
is_active = false
```

Historical records remain.

Inactive people:

- Cannot participate in new expenses.
- Cannot be selected as a new payer.
- Remain visible in historical transactions where relevant.

---

## Expenses

Every expense contains:

```text
amount
description
paid_by
participants
shares
optional category
created_at
```

Rules:

- Integer rupees only.
- No paise.
- Minimum ₹1.
- Maximum ₹99,999.
- Description required.
- At least one participant.
- Payer must be active.
- Shares must sum exactly to amount.
- Payer does not need to participate.
- One-person expenses are valid.

Equal split is automatic.

Users can manually modify individual shares for unequal splitting.

---

## Categories

Default categories:

```text
Food
Travel
Rent
Shopping
Entertainment
Utilities
Other
```

Categories are group-specific.

Category is optional on an expense.

Removing a category does not delete expenses.

Affected expenses become:

```text
Uncategorized
```

---

## Settlements

Settlement records are:

- Append-only.
- Immutable.
- Individually logged.
- Password protected.

There is no edit, delete, or undo settlement operation.

Smart Settlement generates suggestions dynamically and does not persist suggestions separately.

---

# 6. Recommended Project Structure

Use a clean separation between frontend, backend, business logic, and database access.

Example:

```text
splitwise-pro/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── assets/
│   │   ├── App.*
│   │   └── main.*
│   │
│   ├── public/
│   ├── vite.config.*
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── business/
│   │   ├── middleware/
│   │   ├── db/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── app.*
│   │
│   └── package.json
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── tests/
│   ├── unit/
│   ├── api/
│   ├── e2e/
│   └── fixtures/
│
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

The exact folder naming can vary slightly if the implementation remains clean and follows the architectural boundaries.

---

# 7. Architecture Boundaries

Use this dependency direction:

```text
React UI
   ↓
Frontend API service
   ↓
Express API
   ↓
Validation / Authorization
   ↓
Business Logic
   ↓
Database Access
   ↓
PostgreSQL / Supabase
```

The frontend must not:

- Connect directly using the Supabase service-role key.
- Implement authoritative financial calculations.
- Decide whether an admin password is valid.
- Bypass API validation.

The backend must be authoritative for:

- Validation.
- Authorization.
- Expense mutations.
- Settlement mutations.
- Balance calculations.
- Person removal semantics.
- Cross-group checks.

---

# 8. Frontend Implementation

## 8.1 Screens

Implement:

```text
Home
Add Expense
Expense Details / Edit
Settings
People
Categories
Settlement
```

Group creation and password confirmation can be implemented as screens, sheets, or modals according to the UI specification.

---

## 8.2 Navigation

Home header:

```text
⚙️       Goa Trip ▼       ✓
```

Actions:

```text
Gear
→ Current group settings

Group selector
→ Switch/create group

✓
→ Settlement

+
→ Add Expense
```

Do not add a bottom navigation bar.

---

## 8.3 Home

The home screen should show:

```text
Group Balance

Sidhant     +₹670
Rahul       -₹420
Arjun       -₹250
```

Then transaction history.

Default ordering:

```text
Newest → Oldest
```

Filters:

```text
Category
Person
Date
```

Sorting:

```text
Newest → Oldest
Oldest → Newest
Highest → Lowest
Lowest → Highest
```

---

# 9. UI Design Rules

The application should feel like a small polished iPhone utility.

Use:

- Light background.
- White surfaces.
- Near-black primary text.
- Gray secondary text.
- Subtle green/red balance states.
- One restrained accent color.
- Small line icons.
- Generous whitespace.
- Rounded but restrained cards.
- Large touch targets.
- Bottom sheets where appropriate.

Avoid:

- Dense dashboards.
- Large analytics charts.
- Excessive gradients.
- Heavy animations.
- Gamification.
- Unnecessary illustrations.
- Complex navigation.
- Desktop-first layouts.

The primary design principle is:

```text
Open → Record → Understand → Settle
```

---

# 10. Responsive / iPhone Requirements

Prioritize modern iPhone sizes.

The UI must:

- Respect safe-area insets.
- Work with the iOS keyboard.
- Avoid horizontal scrolling.
- Have comfortable touch targets.
- Keep important actions reachable.
- Work in Safari.
- Work when installed to the iPhone Home Screen as a PWA.

Desktop should use a centered mobile-width experience rather than becoming a separate complex dashboard.

---

# 11. Backend Implementation

Use Express with clear layers:

```text
Routes
→ Controllers
→ Validation / Authorization
→ Business Services
→ Database
```

Routes should remain thin.

Business calculations should not be embedded directly inside route handlers.

---

# 12. API Rules

Base path:

```text
/api
```

Primary resources:

```text
/groups
/groups/:groupId/people
/groups/:groupId/categories
/groups/:groupId/expenses
/groups/:groupId/balances
/groups/:groupId/settlements
```

Use the API contracts defined in Doc 4.

Success format:

```json
{
  "success": true,
  "data": {}
}
```

Error format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_EXPENSE",
    "message": "Expense shares must equal the total amount."
  }
}
```

Do not casually change response formats between endpoints.

---

# 13. Database Implementation

Use PostgreSQL through Supabase.

Tables:

```text
groups
people
categories
expenses
expense_shares
settlements
```

There is intentionally no persisted:

```text
balances
smart_settlements
```

Balances are derived from persisted records.

Smart settlement suggestions are calculated dynamically.

Follow Doc 3 for the authoritative schema.

---

# 14. Database Integrity

Use:

- UUID primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Cascades where specified.
- `ON DELETE SET NULL` for categories.
- Database transactions for multi-record mutations.

Important invariants:

```text
expense shares sum = expense amount
sum(group balances) = 0
settlement amount >= ₹1
sender != receiver
```

---

# 15. Balance Engine

Implement the balance engine as a standalone deterministic service.

For every expense:

```text
balance[payer] += amount

for each share:
    balance[person] -= share.amount
```

For every settlement:

```text
balance[sender] += amount
balance[receiver] -= amount
```

The final result must sum to zero.

Do not maintain a separate mutable balance table for MVP.

---

# 16. Equal Split Engine

Given:

```text
amount
participants in selection order
```

Calculate:

```text
base = floor(amount / participant_count)
remainder = amount % participant_count
```

Assign:

```text
base + 1
```

to the first `remainder` participants.

Assign:

```text
base
```

to all remaining participants.

Example:

```text
₹100 / 3

A = ₹34
B = ₹33
C = ₹33
```

The algorithm must always produce whole rupee shares whose sum equals the expense amount.

---

# 17. Smart Settlement Engine

Separate:

```text
creditors = positive balances
debtors = negative balances
```

Then repeatedly:

```text
payment = min(debtor_remaining, creditor_remaining)
```

Create:

```text
debtor → creditor
```

Move to the next party when either balance reaches zero.

Example:

```text
A = +₹1000
B = +₹500
C = -₹700
D = -₹800
```

Expected:

```text
C → A ₹700
D → A ₹300
D → B ₹500
```

The algorithm must be deterministic.

No AI or machine learning is required.

---

# 18. Person Removal Implementation

Removal means:

```text
is_active = false
```

Do not rewrite historical expenses.

If the removed person has a negative balance:

```text
their obligation is redistributed equally among
the remaining active members
```

Use deterministic integer remainder handling.

If the removed person has a positive balance:

```text
their receivable is removed from current group obligations
```

Historical records remain visible.

The implementation must ensure removed people cannot be selected for new expenses.

---

# 19. Expense Mutation Rules

## Create

Validate:

- Group exists.
- Payer exists and is active.
- Participants exist and are active.
- Amount is valid.
- Description is nonblank.
- Shares are valid.
- Shares sum exactly to amount.
- Category belongs to the same group if supplied.

Create the expense and all shares atomically.

---

## Edit

Requires admin password.

Preserve:

```text
expense.id
expense.created_at
```

Update the mutable fields.

Recalculate balances from persisted data.

---

## Delete

Requires admin password.

Delete:

```text
expense
expense_shares
```

Settlement history remains unchanged.

---

# 20. Settlement Mutation Rules

Logging a settlement requires admin password.

Before insertion:

- Sender exists.
- Receiver exists.
- Sender ≠ receiver.
- Amount is positive.
- People belong to the same group.
- Settlement is valid under the current group state.

After insertion:

- Recalculate balances.
- Refresh settlement suggestions.
- Refresh settlement history.

Settlement records cannot be edited or deleted.

---

# 21. Admin Password Implementation

Use one shared admin password.

Protected operations:

```text
Edit expense
Delete expense
Remove person
Log settlement
Clear transactions
Delete group
```

Unprotected:

```text
View data
Create group
Add person
Add/remove category
Switch groups
Create normal expense
```

Password verification must happen server-side.

Use a secure password hash/secret mechanism.

Do not:

- Hardcode plaintext password in frontend JavaScript.
- Put password in URLs.
- Store it unnecessarily in browser storage.
- Log it.
- Return it through an API response.

Use:

```text
X-Admin-Password
```

for protected requests if following the API specification.

---

# 22. Supabase Security

Never expose the Supabase service-role key to the browser.

Keep sensitive credentials in server-side environment variables.

Example:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD_HASH
```

Only variables intended for the frontend should be exposed to Vite's client bundle.

Do not place server secrets under frontend-exposed environment variables.

---

# 23. Environment Configuration

Provide:

```text
.env.example
```

with placeholders only.

Never commit:

```text
.env
```

or real credentials.

Example:

```text
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD_HASH=
```

Use the simplest secure configuration compatible with the chosen Vercel/Supabase deployment architecture.

---

# 24. Validation Strategy

Validation must exist on the server even when the frontend validates the same field.

Frontend validation:

```text
UX
```

Backend validation:

```text
Authority
```

Never trust:

- Client-provided group ownership.
- Client-provided person ownership.
- Client-provided category ownership.
- Client-provided balance values.
- Client-provided authorization state.

---

# 25. Error Handling

Use predictable error codes.

Examples:

```text
INVALID_GROUP
INVALID_PERSON
INVALID_CATEGORY
INVALID_EXPENSE
INVALID_SPLIT
INVALID_SETTLEMENT
UNAUTHORIZED
NOT_FOUND
CROSS_GROUP_REFERENCE
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

Do not expose:

- Database credentials.
- Stack traces in production.
- Password information.
- Internal secrets.

User-facing errors should be understandable.

---

# 26. Concurrency

The application must support multiple friends using it simultaneously.

Do not introduce a global application lock.

Use:

- UUID identifiers.
- Database transactions.
- Atomic writes.
- Server-generated timestamps.

Two valid simultaneous expense creations should both persist.

Do not rely on client-side timestamps for authoritative ordering.

---

# 27. State Management

Do not introduce a large state-management framework unless implementation complexity actually requires it.

For MVP, prefer:

- React state.
- Context where appropriate.
- Small reusable hooks.
- API service functions.
- Server as source of truth.

After successful mutations, refresh the affected server data rather than creating a complicated local synchronization system.

---

# 28. Data Fetching

The frontend should retrieve data through the Express API.

Do not duplicate business calculations unnecessarily.

Preferred flow:

```text
API request
→ Server validates
→ Server queries database
→ Server calculates required derived data
→ API response
→ React renders
```

Balances returned by the backend are authoritative.

---

# 29. PWA Requirements

Configure the application as an installable PWA.

Include:

- Web app manifest.
- Appropriate app name.
- App icons.
- Theme metadata.
- Mobile viewport configuration.
- Service worker where appropriate.

Do not implement offline transaction creation.

If the backend is unavailable:

```text
show failure
do not pretend the expense was saved
```

Static assets may be cached, but sensitive financial API responses should not be unnecessarily cached.

---

# 30. No Unrequested Features

Do not add:

- AI expense parsing.
- OCR.
- Receipt scanning.
- Recurring expenses.
- Subscription tracking.
- Analytics dashboards.
- Graphs.
- Push reminders.
- UPI integrations.
- Payment links.
- Multiple currencies.
- Multi-account authentication.
- Social features.
- Chat.
- Gamification.
- Ads.
- Unnecessary notifications.
- Complex permissions.
- Enterprise functionality.

If an implementation idea requires adding one of these, do not add it without explicit approval.

---

# 31. LLM Development Rules

The coding LLM should behave as an implementation engineer, not a product designer.

## Rule 1 — Read before coding

Read all provided specifications before making architectural changes.

## Rule 2 — Do not reinvent requirements

Do not reinterpret explicit requirements.

## Rule 3 — Prefer simple solutions

Choose the simplest implementation that satisfies the specification.

## Rule 4 — Keep boundaries clean

Do not put database logic into React components.

Do not put financial business logic into UI components.

Do not put authorization decisions exclusively in the frontend.

## Rule 5 — Do not overengineer

Avoid unnecessary:

- abstraction layers.
- design patterns.
- dependencies.
- state-management systems.
- microservices.
- infrastructure.

This is a small private application.

## Rule 6 — Test financial logic first

Before declaring a feature complete, verify the underlying calculations.

## Rule 7 — Do not silently change behavior

If a requirement appears ambiguous, identify the ambiguity and make the smallest reasonable assumption consistent with the existing documents.

---

# 32. Suggested Implementation Sequence

The LLM should build in approximately this order:

## Phase 1 — Foundation

```text
Create repository
Set up React + Vite
Set up Express
Set up Supabase
Configure environment variables
Configure basic deployment structure
```

## Phase 2 — Database

```text
Create tables
Create constraints
Create indexes
Create migrations
Create seed/default categories where appropriate
```

## Phase 3 — Backend Core

```text
Express application
Database connection
Error handling
Validation
Group APIs
People APIs
Category APIs
```

## Phase 4 — Expense System

```text
Expense API
Expense shares
Balance engine
Equal split engine
Expense validation
Expense edit/delete
```

## Phase 5 — Settlement

```text
Settlement history
Smart settlement engine
Settlement creation
Password protection
```

## Phase 6 — Frontend

```text
App shell
Group selector
Home
Add Expense
Expense Details/Edit
Settings
People
Categories
Settlement
Password flows
```

## Phase 7 — PWA / iPhone

```text
Manifest
Icons
Safe-area handling
Keyboard handling
Installability
Mobile polish
```

## Phase 8 — Testing

```text
Unit
API
Database
Frontend
E2E
Concurrency
Security
```

## Phase 9 — Deployment

```text
Production environment
Supabase configuration
Vercel deployment
Smoke tests
Final QA
```

---

# 33. Acceptance Criteria

The application is not complete until all of the following work.

## Groups

- [ ] Create group.
- [ ] Switch groups.
- [ ] Group names can duplicate across groups.
- [ ] Each group has independent data.
- [ ] Rename group.
- [ ] Delete group with admin password.

## People

- [ ] Add person.
- [ ] Duplicate person name within group rejected.
- [ ] Remove person with admin password.
- [ ] Removal is soft.
- [ ] Historical records remain.
- [ ] Removed person cannot participate in new expenses.
- [ ] Negative removed balance follows redistribution rule.
- [ ] Positive removed balance is removed from current obligations.

## Categories

- [ ] Default categories available.
- [ ] Add category.
- [ ] Duplicate category rejected within group.
- [ ] Remove category.
- [ ] Existing expenses preserved.
- [ ] Removed category becomes Uncategorized.

## Expenses

- [ ] Add expense.
- [ ] Integer rupees only.
- [ ] ₹1–₹99,999 accepted.
- [ ] Invalid amounts rejected.
- [ ] Description required.
- [ ] Active payer required.
- [ ] At least one participant required.
- [ ] Payer does not need to participate.
- [ ] Equal split works.
- [ ] Unequal split works.
- [ ] Shares sum exactly to total.
- [ ] Optional category works.
- [ ] Expense ID preserved during edit.
- [ ] Original creation timestamp preserved during edit.
- [ ] Delete requires password.
- [ ] Deleted shares are removed.

## Balances

- [ ] Balance calculation is correct.
- [ ] Settlement affects balances correctly.
- [ ] Sum of active balances follows the defined removal semantics.
- [ ] Normal valid group balances sum to zero.
- [ ] Balance calculation is deterministic.

## Smart Settlement

- [ ] Creditors and debtors are identified correctly.
- [ ] Suggestions are valid.
- [ ] No self-payments.
- [ ] No zero-value suggestions.
- [ ] Suggestions never exceed outstanding balances.
- [ ] Suggestions are deterministic.
- [ ] Logging one suggestion updates balances.
- [ ] Remaining suggestions recalculate.

## Settlements

- [ ] Settlement requires admin password.
- [ ] Settlement amount must be positive.
- [ ] Sender and receiver cannot be the same.
- [ ] Settlement history is displayed.
- [ ] Settlement records are immutable.
- [ ] No edit/delete/undo exists.

## Security

- [ ] Admin password verified server-side.
- [ ] Service-role key never reaches browser.
- [ ] Secrets are environment variables.
- [ ] Password is not logged.
- [ ] Password is not in URLs.
- [ ] Cross-group references are rejected.
- [ ] Server-side validation exists.
- [ ] Malicious text input cannot execute JavaScript.
- [ ] Admin endpoints are rate-limited.

## UI

- [ ] iPhone-first layout.
- [ ] Home header follows specified navigation.
- [ ] Floating `+` opens Add Expense.
- [ ] Settlement button opens settlement screen.
- [ ] Settings applies to current group.
- [ ] No bottom tab bar.
- [ ] Forms are keyboard-aware.
- [ ] Safe areas work.
- [ ] Loading states exist.
- [ ] Empty states exist.
- [ ] Error states exist.
- [ ] Network failures do not fake success.

## PWA

- [ ] Installable from Safari.
- [ ] Home-screen launch works.
- [ ] App icons configured.
- [ ] Manifest configured.
- [ ] Mobile viewport configured.
- [ ] No offline transaction recording.

---

# 34. Final QA Scenarios

Before declaring the application finished, execute this realistic scenario.

Create:

```text
Group: Goa Trip

People:
Sidhant
Rahul
Arjun
Varun
```

Create categories:

```text
Food
Travel
```

Create expenses:

```text
Sidhant pays ₹1000
Split: all four equally

Rahul pays ₹800
Split: Rahul + Arjun

Arjun pays ₹600
Split: Sidhant + Arjun + Varun
```

Verify:

- Transaction ordering.
- Individual shares.
- Group balances.
- Filters.
- Sorting.

Then:

```text
Open Settlement
Generate Smart Settlement
```

Verify:

- Suggestions are deterministic.
- Suggested payments correspond to actual balances.

Log one settlement.

Verify:

- Settlement history updates.
- Balances change.
- Suggestions recalculate.

Then edit an expense.

Verify:

```text
same expense ID
same original creation timestamp
new amount
correct new balances
```

Then delete an expense.

Verify:

```text
expense disappears
shares disappear
balances recalculate
settlement history remains
```

Then remove a person.

Verify:

```text
person becomes inactive
historical records remain
person unavailable for new expenses
removal balance semantics apply
```

Finally:

```text
Switch to another group
```

Verify:

```text
No data leaks between groups.
```

---

# 35. Final "Do Not Declare Complete" Conditions

The LLM must not declare the project complete if:

- Balance tests fail.
- Share totals can differ from expense totals.
- Cross-group access works.
- Admin password can be bypassed.
- Service-role credentials are exposed.
- Settlement changes do not affect balances.
- Person removal violates its defined semantics.
- Expense editing changes the original creation timestamp.
- Deleted expenses leave orphaned shares.
- Concurrent valid expenses can overwrite each other.
- Network failure produces fake success.
- Core iPhone flows are unusable.
- Critical tests are failing.

---

# 36. Final Engineering Checklist

Before final handoff:

```text
[ ] Code builds successfully
[ ] Production build succeeds
[ ] Environment variables documented
[ ] Database migrations work
[ ] Database constraints verified
[ ] API contracts verified
[ ] Unit tests pass
[ ] API tests pass
[ ] Frontend tests pass
[ ] E2E tests pass
[ ] Security checks pass
[ ] Concurrency checks pass
[ ] PWA install tested
[ ] iPhone Safari tested
[ ] Production deployment tested
[ ] No secrets committed
[ ] README updated
[ ] No unnecessary features added
[ ] No unresolved critical errors
```

---

# 37. Master Instruction to the Coding LLM

Use the following as the operating instruction when building Splitwise Pro:

> You are the senior full-stack engineer responsible for implementing Splitwise Pro.
>
> First read all provided Splitwise Pro specification documents. Treat them as the source of truth.
>
> Build the application using React + Vite + PWA for the frontend, Node.js + Express for the backend, and PostgreSQL through Supabase for persistence.
>
> The product is a private, simple, iPhone-first expense-sharing application. It has no user accounts, no login, no OAuth, no current-user identity, and no unnecessary enterprise architecture.
>
> Implement exactly the documented product behavior. Do not invent features that are not specified.
>
> The backend is authoritative for validation, authorization, balances, settlements, person-removal behavior, and database integrity.
>
> Keep the codebase simple and maintainable. Separate UI, API, business logic, validation, and database access. Do not put authoritative financial logic in the frontend.
>
> Implement deterministic integer-rupee calculations. Equal splits must use the specified participant-order remainder distribution. Balances must be derived from expenses and settlements. Smart Settlement must use the specified deterministic debtor/creditor matching algorithm.
>
> Preserve historical records according to the documented rules. Person removal must be soft removal and must use the defined balance semantics.
>
> Protected mutations must require the shared admin password and verify it server-side. Never expose secrets or the Supabase service-role key to the browser.
>
> Build the UI as a clean, minimal, native-iPhone-inspired PWA with the documented navigation and screens. Do not turn it into a dense finance dashboard.
>
> Implement error, loading, empty, keyboard, safe-area, and network-failure states.
>
> Write tests while implementing, not only at the end. Prioritize balance, splitting, settlement, person-removal, authorization, database integrity, and cross-group tests.
>
> Do not declare the project complete until the acceptance criteria and final QA checklist pass.
>
> If you encounter an actual contradiction between the specifications, do not silently choose a new product behavior. Identify the contradiction and explain exactly which requirements conflict.
>
> Otherwise, make reasonable implementation-level decisions without repeatedly asking for approval for trivial coding choices.
>
> Prefer the simplest correct implementation over unnecessary abstractions.
>
> The final result should be a polished, functional private expense-sharing PWA that can be deployed and used by a small group of friends on iPhones.

---

# 38. Final Product Standard

Splitwise Pro should ultimately feel like:

> **A small, polished iPhone utility that gets expense sharing out of the way instead of making expense sharing the experience.**

The application succeeds when a group can:

```text
Open
  ↓
Record an expense
  ↓
See exactly who owes/receives
  ↓
Generate simple settlement suggestions
  ↓
Log payments
  ↓
Be done
```

without unnecessary complexity.
