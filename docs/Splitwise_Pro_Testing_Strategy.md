# Splitwise Pro — Testing Strategy

## 1. Purpose

This document defines the testing strategy for Splitwise Pro.

The goal is to verify that the application:

- Calculates balances correctly.
- Handles equal and unequal expense splits deterministically.
- Handles settlements correctly.
- Applies person-removal rules correctly.
- Prevents invalid or unauthorized mutations.
- Preserves historical data where required.
- Handles concurrent usage safely.
- Provides reliable UI states and user flows.
- Is safe to deploy and maintain.

Testing should prioritize correctness of financial calculations and data integrity over visual polish.

---

## 2. Testing Philosophy

Splitwise Pro is a small application, but its balance and settlement logic must be highly reliable.

Testing priorities:

1. **Business logic correctness**
2. **Database integrity**
3. **API correctness and authorization**
4. **End-to-end user flows**
5. **Concurrency and atomicity**
6. **Frontend behavior**
7. **Performance and reliability**
8. **Visual polish**

The balance engine should be deterministic and testable independently of the UI and database.

A change to one part of the application should not silently change the meaning of existing expenses, settlements, or historical records.

---

# 3. Testing Layers

Splitwise Pro should use multiple testing layers:

```text
Unit Tests
    ↓
Backend / API Tests
    ↓
Database / Transaction Tests
    ↓
Frontend Tests
    ↓
End-to-End Tests
    ↓
Concurrency + Security Tests
    ↓
Deployment Verification
```

Each layer catches a different class of failure.

---

# 4. Unit Testing

Unit tests should cover all deterministic business logic without requiring a browser or live database.

## 4.1 Balance Calculation

For every expense:

```text
balance[payer] += expense.amount

for each share:
    balance[person] -= share.amount
```

For every settlement:

```text
balance[sender] += amount
balance[receiver] -= amount
```

### Test Case B-01 — Simple Equal Expense

Input:

```text
People: A, B
Expense: ₹100
Paid by: A
Shares:
A = ₹50
B = ₹50
```

Expected:

```text
A = +₹50
B = -₹50
```

---

### Test Case B-02 — Payer Not Included

Input:

```text
People: A, B
Expense: ₹100
Paid by: A
Shares:
B = ₹100
```

Expected:

```text
A = +₹100
B = -₹100
```

The payer does not need to be a participant.

---

### Test Case B-03 — One-Person Expense

Input:

```text
People: A
Expense: ₹500
Paid by: A
Shares:
A = ₹500
```

Expected:

```text
A = ₹0
```

---

### Test Case B-04 — Multiple Expenses

Input:

```text
Expense 1:
A pays ₹100
A owes ₹50
B owes ₹50

Expense 2:
B pays ₹200
A owes ₹100
B owes ₹100
```

Expected:

```text
A = -₹50
B = +₹50
```

The final balance must include all expenses.

---

## 4.2 Balance Invariant

For every valid group:

```text
sum(all balances) = 0
```

This should be asserted in every balance-engine test.

Example:

```text
A = +₹670
B = -₹420
C = -₹250

670 - 420 - 250 = 0
```

If the invariant fails, the balance engine must be considered broken.

---

# 5. Equal Split Testing

Equal splitting uses integer rupees only.

The deterministic rule is:

1. Divide the amount equally.
2. Calculate the remainder.
3. Distribute the remaining ₹1 amounts one-by-one in participant selection order.

## Test Case S-01

```text
Amount: ₹100
Participants: A, B
```

Expected:

```text
A = ₹50
B = ₹50
```

---

## Test Case S-02

```text
Amount: ₹100
Participants: A, B, C
```

Expected:

```text
A = ₹34
B = ₹33
C = ₹33
```

---

## Test Case S-03

```text
Amount: ₹10
Participants: A, B, C, D
```

Expected:

```text
A = ₹3
B = ₹3
C = ₹2
D = ₹2
```

---

## Test Case S-04

```text
Amount: ₹1
Participants: A
```

Expected:

```text
A = ₹1
```

---

## Test Case S-05 — More Participants Than Amount

Example:

```text
Amount: ₹2
Participants: A, B, C
```

Expected:

```text
A = ₹1
B = ₹1
C = ₹0
```

The shares must still sum exactly to ₹2.

---

# 6. Unequal Split Testing

Users can modify individual shares.

## Test Case U-01 — Valid Unequal Split

```text
Amount: ₹1000

A = ₹600
B = ₹300
C = ₹100
```

Expected:

```text
Valid
```

---

## Test Case U-02 — Shares Too High

```text
Amount: ₹1000

A = ₹600
B = ₹500
```

Expected:

```text
Rejected
Reason: shares exceed total amount
```

---

## Test Case U-03 — Shares Too Low

```text
Amount: ₹1000

A = ₹600
B = ₹300
```

Expected:

```text
Rejected
Reason: shares do not equal total amount
```

---

## Test Case U-04 — Negative Share

```text
A = -₹50
B = ₹1050
```

Expected:

```text
Rejected
```

---

# 7. Expense Validation Testing

Every expense should be validated server-side.

### Required checks

| Test | Expected |
|---|---|
| Amount = ₹0 | Reject |
| Amount = ₹1 | Accept |
| Amount = ₹99,999 | Accept |
| Amount = ₹100,000 | Reject |
| Decimal amount | Reject |
| Negative amount | Reject |
| Blank description | Reject |
| Missing payer | Reject |
| Inactive payer | Reject |
| No participants | Reject |
| Inactive participant | Reject for new expense |
| Missing shares | Reject |
| Shares do not equal amount | Reject |
| Valid category | Accept |
| No category | Accept |
| Category from another group | Reject |

---

# 8. Expense Edit Testing

Editing an expense must preserve its original creation timestamp and expense ID.

## Test Case E-01

Create:

```text
Expense ID = X
Created at = T1
Amount = ₹500
```

Edit:

```text
Amount = ₹700
```

Expected:

```text
Expense ID remains X
Created at remains T1
Amount becomes ₹700
Balances recalculate
```

---

# 9. Expense Delete Testing

Deleting an expense permanently removes:

```text
Expense
+
Expense shares
```

Expected:

- Balance recalculates.
- Expense disappears from transaction feed.
- Settlement records remain unchanged.
- No orphaned expense shares remain.

---

# 10. Person Removal Testing

Person removal is a critical business rule.

A removed person is soft-deleted:

```text
is_active = false
```

Historical expenses remain intact.

The balance engine applies the removal rule rather than rewriting history.

## Test Case P-01 — Removed Person Owes Money

Before removal:

```text
A = +₹100
B = -₹40
C = -₹60
```

Remove C.

C owes the group ₹60.

The ₹60 obligation is redistributed among remaining active members.

Expected:

```text
C becomes inactive.

A and B receive the appropriate redistribution of C's ₹60 obligation
according to the deterministic equal-distribution rule.
```

The final active-group balance must still satisfy the application's removal semantics and deterministic rounding.

---

## Test Case P-02 — Removed Person Is Owed Money

Before removal:

```text
A = +₹100
B = -₹100
```

Remove A.

A is owed ₹100.

Expected:

- A becomes inactive.
- A's receivable is removed from current group obligations.
- Historical records remain.
- No new expense can use A.
- The remaining active group does not retain an obligation to pay A.

---

## Test Case P-03 — Removed Person Has Zero Balance

```text
A = ₹0
```

Expected:

- A becomes inactive.
- No redistribution is necessary.
- Historical data remains.
- A cannot participate in new expenses.

---

# 11. Category Testing

## Category Creation

Expected:

- Valid name creates category.
- Duplicate category name within the same group is rejected.

## Category Removal

When a category is removed:

```text
Existing expenses remain.
category_id becomes NULL.
```

The expense should appear as:

```text
Uncategorized
```

No balance should change.

---

# 12. Settlement Testing

## Test Case ST-01 — Basic Settlement

Before settlement:

```text
A = +₹100
B = -₹100
```

Settlement:

```text
B → A ₹100
```

Expected:

```text
A = ₹0
B = ₹0
```

---

## Test Case ST-02 — Partial Settlement

Before:

```text
A = +₹100
B = -₹100
```

Settlement:

```text
B → A ₹40
```

Expected:

```text
A = +₹60
B = -₹60
```

---

## Test Case ST-03 — Invalid Settlement

Reject:

```text
amount = 0
amount < 0
sender = receiver
```

Also reject settlements that violate the current valid group/person constraints.

---

## Test Case ST-04 — Settlement Immutability

After logging:

```text
Settlement ID = X
```

Expected:

- Settlement cannot be edited.
- Settlement cannot be deleted.
- Settlement cannot be undone.
- A correction must be represented by another settlement.

---

# 13. Smart Settlement Testing

Smart Settlement must produce deterministic payment suggestions.

Algorithm:

```text
separate creditors (+)
separate debtors (-)

while both lists contain balances:
    payment = min(debtor_remaining, creditor_remaining)

    debtor → creditor = payment

    reduce both balances

    move to the next party when a balance reaches zero
```

## Test Case SS-01

Input:

```text
A = +₹1000
B = +₹500
C = -₹700
D = -₹800
```

Expected suggestions:

```text
C → A ₹700
D → A ₹300
D → B ₹500
```

After these payments:

```text
A = ₹0
B = ₹0
C = ₹0
D = ₹0
```

---

## Smart Settlement Assertions

Every suggestion must satisfy:

- Sender has a negative balance.
- Receiver has a positive balance.
- Amount > ₹0.
- Sender ≠ receiver.
- Suggested payment does not exceed sender's remaining debt.
- Suggested payment does not exceed receiver's remaining credit.
- Final simulated balances equal zero.
- Same input produces the same output ordering.

Smart settlements do not need to be persisted.

---

# 14. Database Testing

Database tests should verify both schema constraints and transactional behavior.

## 14.1 Constraints

Test:

- Primary keys.
- Foreign keys.
- Unique `(group_id, name)` for people.
- Unique `(group_id, name)` for categories.
- Expense amount range.
- Share amount non-negative.
- Settlement amount positive.
- Settlement sender ≠ receiver.

---

## 14.2 Cascades

### Delete Expense

Expected:

```text
expense deleted
expense_shares deleted
```

### Delete Group

Expected:

```text
group deleted
people deleted
categories deleted
expenses deleted
expense_shares deleted
settlements deleted
```

All dependent records should be removed atomically.

### Delete Category

Expected:

```text
category deleted
existing expenses preserved
expense.category_id = NULL
```

---

# 15. Transaction / Atomicity Testing

Multi-record mutations must be atomic.

Example expense creation:

```text
Create expense
+
Create expense shares
```

If share insertion fails:

```text
expense must not remain partially created
```

Example settlement:

```text
Create settlement
```

The database operation must either succeed completely or fail without leaving inconsistent data.

---

# 16. API Testing

Every API endpoint should be tested for:

- Valid request.
- Invalid request.
- Missing fields.
- Wrong data types.
- Wrong group ID.
- Unknown person/category/expense IDs.
- Unauthorized protected operation.
- Valid protected operation.
- Malformed JSON.
- Unexpected server errors.

## Endpoint Coverage

### Groups

```text
GET    /api/groups
POST   /api/groups
GET    /api/groups/:groupId
PATCH  /api/groups/:groupId
DELETE /api/groups/:groupId
```

Test creation, retrieval, rename, deletion, and invalid IDs.

### People

```text
GET  /api/groups/:groupId/people
POST /api/groups/:groupId/people
PATCH /api/groups/:groupId/people/:personId
```

Test adding, removing, duplicate names, inactive people, and cross-group IDs.

### Categories

Test:

```text
GET
POST
DELETE
```

including duplicate names and category removal behavior.

### Expenses

Test:

```text
GET
POST
GET by ID
PATCH
DELETE
DELETE all
```

including validation, authorization, recalculation, and transactional behavior.

### Balances

```text
GET /api/groups/:groupId/balances
```

Verify balances against independently calculated expected values.

### Settlements

Test:

```text
GET history
GET suggestions
POST settlement
```

Verify deterministic suggestions and immutable settlement records.

---

# 17. Authorization / Admin Password Testing

Protected operations require the shared admin password.

Protected:

```text
Edit expense
Delete expense
Remove person
Log settlement
Clear transactions
Delete group
```

Tests:

| Scenario | Expected |
|---|---|
| Correct password | Operation allowed |
| Wrong password | Operation rejected |
| Missing password | Operation rejected |
| Password in URL | Must not be accepted |
| Password logged by server | Must never happen |
| Password returned by API | Must never happen |

The password must be verified server-side.

---

# 18. Cross-Group Access Testing

This is important because there is no normal user authentication.

Example:

```text
Group A
Person A1
Expense A1

Group B
Person B1
Expense B1
```

Attempt to:

- Read Group A data through Group B ID.
- Edit Group A expense using Group B context.
- Use Group A person in Group B expense.
- Use Group A category in Group B expense.
- Create a settlement between people from different groups.

Expected:

```text
Every cross-group operation is rejected.
```

---

# 19. Frontend Testing

Frontend tests should verify behavior rather than implementation details.

## Home

Verify:

- Correct group name shown.
- Group selector opens.
- Group switching updates all displayed data.
- Balance section is correct.
- Transactions are newest-first by default.
- Filters work.
- Sorting works.
- Floating `+` opens Add Expense.
- Settlement button opens Settlement screen.
- Settings opens current group settings.

---

## Add Expense

Verify:

- Amount field accepts valid integer rupees.
- Invalid amounts show errors.
- Description is required.
- Active people appear.
- Inactive people do not appear for new expenses.
- Equal split is generated automatically.
- Manual shares can be edited.
- Shares must equal total.
- Optional category works.
- Successful creation returns to the appropriate screen and refreshes data.
- Failed network request does not show fake success.

---

## Expense Details

Verify:

- Correct expense data displayed.
- Edit requires admin password.
- Delete requires admin password.
- Cancel leaves expense unchanged.
- Edit preserves original timestamp.
- Delete updates balances.

---

## Settings

Verify:

- Group name can be changed.
- People can be added.
- People can be removed only with password.
- Categories can be added.
- Categories can be removed.
- Danger Zone actions require password.

---

## Settlement

Verify:

- Outstanding balances are shown.
- Suggestions are deterministic.
- Each suggestion has its own `Log Settlement` action.
- Logging requires admin password.
- Balance refreshes immediately after logging.
- Settlement history updates.
- No global confirmation button is required.

---

# 20. Filtering and Sorting Tests

Transaction feed should support:

### Filters

```text
Category
Person
Date
```

### Sort

```text
Newest → Oldest
Oldest → Newest
Highest → Lowest
Lowest → Highest
```

Tests should verify combinations such as:

```text
Category = Food
Person = Rahul
Sort = Highest → Lowest
```

Filtering must not alter underlying data.

---

# 21. Loading / Empty / Error State Testing

Every data-dependent screen should have explicit states.

### Loading

Verify:

- Loading indicator appears.
- UI does not show stale or fake success state.

### Empty

Examples:

```text
No transactions yet.
No settlements yet.
No other people in this group.
No categories yet.
```

### Error

Verify:

- API failure produces understandable error.
- User can retry where appropriate.
- Partially submitted mutations do not appear successful.

### Network Failure

If backend is unavailable:

```text
Do not record the transaction locally as successful.
Do not fabricate a success response.
```

---

# 22. End-to-End Testing

End-to-end tests should simulate real user journeys.

## E2E-01 — Complete Group Flow

```text
Create group
    ↓
Add people
    ↓
Add category
    ↓
Create expense
    ↓
Verify transaction
    ↓
Verify balances
    ↓
Open settlement
    ↓
Generate suggestions
    ↓
Log settlement
    ↓
Verify balances
    ↓
Verify settlement history
```

Expected: complete flow works without manual database intervention.

---

## E2E-02 — Expense Edit Flow

```text
Create expense
    ↓
Open expense
    ↓
Edit
    ↓
Enter admin password
    ↓
Save
    ↓
Verify updated amount
    ↓
Verify balances
```

---

## E2E-03 — Expense Delete Flow

```text
Create expense
    ↓
Open expense
    ↓
Delete
    ↓
Enter admin password
    ↓
Verify expense removed
    ↓
Verify shares removed
    ↓
Verify balances
```

---

## E2E-04 — Person Removal Flow

```text
Create group
    ↓
Create expenses
    ↓
Verify person's balance
    ↓
Remove person
    ↓
Enter admin password
    ↓
Verify inactive status
    ↓
Verify historical transactions remain
    ↓
Verify removal balance semantics
    ↓
Verify person unavailable for new expenses
```

---

## E2E-05 — Multiple Groups

```text
Create Group A
Create Group B
Add different people
Create different expenses
Switch between groups
```

Expected:

```text
Group A data never appears in Group B.
Group B data never appears in Group A.
```

---

# 23. Concurrency Testing

Multiple friends may use the application at the same time.

## Test Case C-01 — Simultaneous Expenses

Two clients submit expenses at nearly the same time.

Expected:

```text
Expense A exists.
Expense B exists.
Both shares exist.
Both affect balances.
Neither overwrites the other.
```

---

## Test Case C-02 — Simultaneous Settlement / Expense

One client logs a settlement while another creates an expense.

Expected:

- Both operations succeed if individually valid.
- Database remains consistent.
- Final balance reflects both operations.

---

## Test Case C-03 — Simultaneous Edits

Two clients attempt to edit the same expense.

The application should not silently corrupt data.

If conflict handling is not explicitly implemented for the MVP, the final persisted record must still remain structurally valid and the balance engine must remain correct.

---

# 24. Timestamp and Ordering Tests

Transactions are displayed newest-first by default.

Verify:

```text
created_at
```

comes from the server/database.

If timestamps are equal, use a deterministic secondary ordering such as UUID.

Test:

- Multiple expenses created quickly.
- Multiple expenses from different clients.
- Settlement history ordering.
- Editing an expense does not move it to the top merely because it was edited.

---

# 25. Security Testing

Security testing should verify:

### Secret Exposure

Search the frontend bundle for:

```text
admin password
Supabase service-role key
database credentials
private server secrets
```

None should be exposed.

### Request Security

Verify:

- Protected operations cannot bypass password validation.
- Client-side validation cannot replace server-side validation.
- Cross-group references are rejected.
- Malicious input does not execute as HTML/JavaScript.

### Password Handling

Verify:

- Password is transmitted only over HTTPS in production.
- Password is not stored in URLs.
- Password is not stored unnecessarily in browser storage.
- Password is not written to logs.
- Failed attempts are rate-limited.

---

# 26. Input / XSS Testing

Test descriptions, names, and category names containing:

```text
<script>alert(1)</script>
```

and other HTML/JavaScript payloads.

Expected:

- Input is treated as text.
- No script executes.
- API remains valid.

Also test:

- Very long names.
- Very long descriptions.
- Unicode characters.
- Emojis.
- Leading/trailing whitespace.
- Empty strings.
- Unexpected JSON fields.
- Invalid UUIDs.

---

# 27. Edge-Case Test Matrix

| Area | Edge Case | Expected |
|---|---|---|
| Amount | ₹1 | Accept |
| Amount | ₹99,999 | Accept |
| Amount | ₹100,000 | Reject |
| Amount | ₹0 | Reject |
| Split | ₹1 / 1 person | ₹1 |
| Split | ₹100 / 3 | 34,33,33 |
| Split | ₹2 / 3 | 1,1,0 |
| Expense | Payer not participant | Accept |
| Expense | One participant | Accept |
| Expense | No participant | Reject |
| Category | None | Accept |
| Category | Removed | Expense becomes Uncategorized |
| Person | Duplicate name | Reject |
| Person | Removed | Cannot join new expenses |
| Person | Historical data | Preserved |
| Settlement | Partial | Balance remains outstanding |
| Settlement | Zero | Reject |
| Settlement | Negative | Reject |
| Settlement | Same sender/receiver | Reject |
| Settlement | Logged | Immutable |
| Balance | All expenses | Sum = 0 |
| Group | Same names in different groups | Allowed |
| Group | Same group name | Allowed |
| Network | Backend unavailable | No fake success |

---

# 28. Regression Testing

Whenever business logic changes, rerun:

```text
Balance tests
Equal split tests
Unequal split tests
Settlement tests
Smart settlement tests
Person removal tests
Expense edit/delete tests
Cross-group tests
```

A regression suite should be run automatically before deployment.

---

# 29. Performance and Reliability

Splitwise Pro is expected to have relatively small personal groups, so extreme-scale optimization is not required for MVP.

Still verify:

- Home loads quickly with a normal transaction history.
- Balance calculation remains responsive as transactions grow.
- Filtering and sorting do not freeze the UI.
- API responses remain reasonable.
- No unnecessary repeated requests occur.
- Database indexes are used for common group queries.
- Large transaction histories are handled without obvious UI degradation.

The application should prioritize correctness over premature optimization.

---

# 30. CI/CD Testing

Before merging or deploying:

```text
Install dependencies
    ↓
Lint
    ↓
Type / build checks if configured
    ↓
Unit tests
    ↓
Backend/API tests
    ↓
Frontend tests
    ↓
Build
    ↓
Deployment
```

At minimum, the CI pipeline should prevent deployment when critical tests fail.

---

# 31. Production Smoke Test

After deployment, verify:

1. Application opens.
2. PWA loads correctly.
3. Existing groups are visible.
4. Group switching works.
5. Create expense works.
6. Balance updates correctly.
7. Settlement suggestions work.
8. Protected operation requires password.
9. Settlement logging works.
10. No server errors appear in normal usage.

---

# 32. Definition of Done

Testing is considered complete for MVP when:

- [ ] Balance engine passes all core unit tests.
- [ ] Equal split rounding is deterministic.
- [ ] Unequal splits are validated.
- [ ] Expense validation works server-side.
- [ ] Expense edit preserves ID and original timestamp.
- [ ] Expense deletion removes shares and recalculates balances.
- [ ] Person removal follows the defined redistribution/removal semantics.
- [ ] Settlement calculations are correct.
- [ ] Settlement records are immutable.
- [ ] Smart Settlement produces valid deterministic suggestions.
- [ ] Database constraints work.
- [ ] Cascades and `SET NULL` behavior work.
- [ ] Multi-record operations are atomic.
- [ ] All API endpoints have positive and negative tests.
- [ ] Cross-group access is rejected.
- [ ] Admin-protected operations require server-side password verification.
- [ ] Secrets are not exposed to the frontend.
- [ ] Frontend forms validate correctly.
- [ ] Loading, empty, error, and network states work.
- [ ] Core user journeys pass end-to-end tests.
- [ ] Concurrent expense creation does not lose data.
- [ ] CI runs the critical test suite.
- [ ] Production smoke test passes.

---

# 33. Recommended Test Priority

If development time is limited, test in this order:

### P0 — Must Pass

```text
Balance calculation
Equal split
Unequal split validation
Expense creation
Expense edit/delete
Settlement
Smart Settlement
Person removal
Database atomicity
Cross-group protection
Admin password protection
```

### P1 — Should Pass

```text
Frontend forms
Filtering
Sorting
Group switching
Error/loading states
End-to-end flows
Concurrency
```

### P2 — Polish / Reliability

```text
Accessibility
Performance tuning
Visual regression
Browser/device coverage
Advanced failure scenarios
```

---

# 34. Browser / Device Coverage

Because the application is iPhone-first, primary testing should cover:

- Safari on modern iPhones.
- iPhone 14 / 14 Plus class screens.
- iPhone 15 class screens.
- iPhone 17 / 17 Pro class screens.
- Safari viewport with keyboard open.
- Home-screen PWA mode.
- Portrait orientation.

Secondary testing:

- Desktop Chrome.
- Desktop Safari.
- Desktop Edge/Firefox where practical.

The desktop layout does not need to become a separate dashboard experience.

---

# 35. Final Testing Principle

The most important test is not:

> "Does the screen look right?"

It is:

> "If five friends use this app to record real expenses and settlements, will every rupee remain explainable?"

Every expense, share, balance, person removal, and settlement should be traceable to persisted records and deterministic business rules.

If the UI is slightly imperfect but the money is correct, the MVP is still usable.

If the UI is perfect but the balances are wrong, the application is not acceptable.
