# User Stories & User Flows — Splitwise Pro

**Version:** 1.0  
**Status:** MVP User Flow Specification  
**Platform:** Mobile-first Web App / PWA  
**Primary Target:** Modern iPhones

---

# 1. Purpose

This document defines how users interact with Splitwise Pro.

It converts the product requirements into concrete:

- User stories
- Screen flows
- Navigation flows
- Success states
- Error states
- Empty states
- Protected actions
- Edge-case behavior

This document should be used alongside the PRD, System Architecture, Database Schema, and API Design documents.

---

# 2. Core Interaction Model

Splitwise Pro is a shared group expense tracker.

There is:

- No login.
- No user account.
- No current-user identity.
- No requirement to identify who is holding the phone.
- No permission distinction between normal group members for ordinary actions.

Any person using the app can:

- View the group.
- Add an expense for any person.
- Select participants.
- View balances.
- View transaction history.
- Create/switch groups.
- Add people.
- Add/remove categories.

The shared admin password protects selected sensitive actions.

---

# 3. Main Navigation

The application has three primary navigation actions:

```text
                    ┌─────────────────────┐
                    │      Home           │
                    │                     │
                    │  ⚙️ Group ▼    ✓    │
                    │                     │
                    │   Group Balance     │
                    │                     │
                    │   Transactions      │
                    │                     │
                    │              +      │
                    └─────────────────────┘
                         │       │
              ┌──────────┘       └──────────┐
              ▼                             ▼
         Settings                      Settlement
```

The floating `+` opens Add Expense.

---

# 4. Home Screen User Stories

## US-001 — View Current Group

**As a user,** I want to see the currently selected group so that I know which group's expenses I am viewing.

### Flow

```text
Open app
   ↓
Load current/default group
   ↓
Display group name in top bar
```

Example:

```text
⚙️       Goa Trip ▼       ✓
```

---

## US-002 — View Group Balances

**As a user,** I want to see everyone's current net balance so that I understand who should pay and who should receive.

Example:

```text
Group Balance

Sidhant     +₹670
Rahul       -₹420
Arjun       -₹250
```

Interpretation:

- Positive = should receive.
- Negative = should pay.
- Zero = settled.

There is intentionally no:

```text
You owe...
You are owed...
```

because the application has no current-user identity.

---

# 5. Transaction Feed

## US-003 — View Transaction History

**As a user,** I want to see all expenses so that the home screen also functions as the transaction history.

Transactions are ordered:

```text
Newest → Oldest
```

Each transaction displays enough information to understand:

- Description
- Amount
- Paid by
- Participants/split
- Category when present
- Date/time

---

## US-004 — Filter Transactions

**As a user,** I want to filter transactions so that I can find relevant expenses quickly.

Supported filters:

```text
Category
Person
Date
```

Filters may be combined.

Example:

```text
Category: Food
Person: Rahul
Date: September 2026
```

The filtered result should update without changing the stored transactions.

---

## US-005 — Sort Transactions

Supported sorting:

```text
Newest → Oldest
Oldest → Newest
Highest Amount → Lowest Amount
Lowest Amount → Highest Amount
```

Sorting affects display only.

---

# 6. Group Selection

## US-006 — Switch Group

**As a user,** I want to switch between groups so that I can manage separate expense spaces.

Example:

```text
Select Group

Goa Trip
Flat Expenses
Manali Trip

────────────

＋ Create New Group
```

Selecting a group immediately changes the application context.

All displayed:

- People
- Categories
- Expenses
- Balances
- Settlement history

must belong to the selected group.

---

## US-007 — Create Group

**As a user,** I want to create a new group so that I can track a separate set of expenses.

### Flow

```text
Group selector
      ↓
＋ Create New Group
      ↓
Enter group name
      ↓
Create
      ↓
New group becomes current group
```

### Validation

- Required name.
- Cannot be blank.
- Maximum 100 characters.
- Duplicate names are allowed.

The new group starts independently with:

```text
People: none
Categories: default categories
Expenses: none
Settlements: none
Balances: zero
```

The exact initial people setup can be completed from Settings.

No admin password is required.

---

# 7. Settings

## US-008 — Open Group Settings

Tap:

```text
⚙️
```

The settings screen applies only to the currently selected group.

Suggested structure:

```text
Settings

Group
  Group Name

People
  Manage People

Categories
  Manage Categories

Danger Zone
  Clear All Transactions
  Delete Group
```

---

# 8. Group Name

## US-009 — Rename Group

**As a user,** I want to change the current group name.

### Flow

```text
Settings
   ↓
Group Name
   ↓
Edit name
   ↓
Save
```

Validation follows group-name rules.

Renaming does not affect expenses or balances.

---

# 9. People Management

## US-010 — Add Person

**As a user,** I want to add someone to the group so that they can participate in future expenses.

### Flow

```text
Settings
   ↓
People
   ↓
＋ Add Person
   ↓
Enter name
   ↓
Save
```

No password required.

Validation:

- Required.
- Not blank.
- Maximum 100 characters.
- Unique within group.

Adding a person does not modify historical transactions.

---

## US-011 — Remove Person

**As a user,** I want to remove someone from future group activity while preserving historical records.

### Flow

```text
Settings
   ↓
People
   ↓
Select person
   ↓
Remove
   ↓
Admin Password
   ↓
Confirm
   ↓
Person becomes inactive
```

The person is not physically deleted from the database.

Historical transactions remain available.

The person cannot be selected for new expenses.

Current balance calculations apply the agreed person-removal behavior from the PRD.

---

# 10. Category Management

## US-012 — Add Category

**As a user,** I want to create a custom category.

### Flow

```text
Settings
   ↓
Categories
   ↓
＋ Add Category
   ↓
Enter name
   ↓
Save
```

No password required.

Validation:

- Required.
- Not blank.
- Maximum 50 characters.
- Unique within group.

---

## US-013 — Remove Category

**As a user,** I want to remove a category that I no longer use.

Existing expenses must not be deleted.

Their category becomes:

```text
Uncategorized
```

internally represented by:

```text
category_id = NULL
```

---

# 11. Add Expense

## US-014 — Open Add Expense

Tap:

```text
+
```

The Add Expense screen opens.

Suggested layout:

```text
← Add Expense                         ✕

Amount
₹ ______

Description
__________

Paid by
[ Person ▼ ]

Split between

☑ Sidhant    ₹800
☑ Rahul      ₹800
☑ Arjun      ₹800

Category (optional)
[ Food ▼ ]

             Add Expense
```

---

# 12. Expense Entry

## US-015 — Enter Expense Amount

Amount rules:

- Integer only.
- No paise.
- Minimum ₹1.
- Maximum ₹99,999.

Invalid examples:

```text
₹0
₹-100
₹100.50
₹100000
```

The UI should prevent invalid input where practical and the backend must always validate it.

---

## US-016 — Enter Description

Description is required.

It must not be:

```text
""
"   "
```

Maximum:

```text
150 characters
```

---

## US-017 — Select Payer

The user chooses any active person in the current group.

Example:

```text
Paid by

Sidhant
Rahul
Arjun
```

The phone user does not need to be the payer.

---

# 13. Expense Splitting

## US-018 — Select Participants

The user chooses who participated in the expense.

At least one participant is required.

The payer does not have to be included.

Example:

```text
Split between

☑ Sidhant
☑ Rahul
☐ Arjun
```

---

## US-019 — Equal Split Default

When participants are selected, the application initially divides the expense equally among them.

Example:

```text
Amount: ₹900
3 people

Sidhant   ₹300
Rahul     ₹300
Arjun     ₹300
```

---

## US-020 — Unequal Split

The user can directly edit individual shares.

Example:

```text
Sidhant   ₹500
Rahul     ₹300
Arjun     ₹100
```

The application must continuously verify:

```text
sum(shares) = total expense
```

The expense cannot be submitted until the amounts match exactly.

---

## US-021 — Split Rounding

Because all money is stored as whole rupees, equal splits that do not divide evenly require deterministic rounding.

Example:

```text
₹100 / 3
```

The application must allocate:

```text
₹33
₹33
₹34
```

using the deterministic rounding rule defined by the implementation.

The final shares must always equal the original amount.

---

# 14. Expense Category

## US-022 — Add Optional Category

The user may select a category.

Category is optional.

If no category is selected:

```text
category_id = NULL
```

The transaction remains valid.

---

# 15. Submit Expense

## US-023 — Create Expense

When the user taps:

```text
Add Expense
```

the frontend validates the form and sends the request to the backend.

### Success flow

```text
Validate form
     ↓
POST expense
     ↓
Server validates
     ↓
Database transaction
     ↓
Expense saved
     ↓
Return success
     ↓
Return to Home
     ↓
Refresh transactions + balances
```

The server generates the authoritative timestamp.

---

## US-024 — Cancel Expense

Tap:

```text
✕
```

or the designated cancel control.

Result:

```text
Return to previous screen
```

No expense is saved.

Unsaved form data is discarded.

---

# 16. Expense Validation Errors

If the amount is invalid:

```text
Amount must be between ₹1 and ₹99,999.
```

If description is missing:

```text
Description is required.
```

If no participant is selected:

```text
Select at least one participant.
```

If shares do not match:

```text
Shares must total ₹2,400.
```

If the server is unavailable:

```text
Could not save expense.
Please check your connection and try again.
```

The app must not display a fake success state.

---

# 17. Expense Details

## US-025 — Open Expense

Tap a transaction in the feed.

The app opens the expense details/edit view.

The view should show:

- Description
- Amount
- Paid by
- Participants
- Individual shares
- Category
- Creation date/time

Available actions:

```text
Edit
Delete
```

Both are protected by admin password.

---

# 18. Edit Expense

## US-026 — Edit Existing Expense

### Flow

```text
Open expense
     ↓
Edit
     ↓
Modify fields
     ↓
Admin Password
     ↓
Confirm
     ↓
PATCH expense
     ↓
Refresh expense + balances
```

Editing:

- Keeps the same expense ID.
- Keeps the original creation timestamp.
- Updates the existing transaction.
- Does not create a duplicate.
- Recalculates balances.

---

# 19. Delete Expense

## US-027 — Delete Existing Expense

### Flow

```text
Open expense
     ↓
Delete
     ↓
Admin Password
     ↓
Confirmation
     ↓
DELETE expense
     ↓
Refresh feed + balances
```

Deleting permanently removes:

- Expense
- Expense shares

Settlement records are not automatically modified.

---

# 20. Settlement Screen

## US-028 — Open Settlement Screen

Tap:

```text
✓
```

The screen displays current outstanding obligations.

Example:

```text
Settlement                                  ✕

Outstanding

Rahul → Sidhant                         ₹700
Arjun → Sidhant                         ₹500
Varun → Rahul                           ₹300

────────────────────────────

Smart Settlement
```

The displayed state is based on current balances.

---

# 21. Smart Settlement

## US-029 — Generate Smart Settlement

The user taps:

```text
Smart Settlement
```

The backend calculates payment suggestions from current net balances.

The calculation is deterministic.

It is not an AI feature.

### Conceptual flow

```text
Current expenses
      +
Current settlements
      ↓
Calculate net balances
      ↓
Separate debtors / creditors
      ↓
Match amounts
      ↓
Generate payment suggestions
```

Example:

```text
Rahul → Sidhant     ₹400
                 [✓ Log Settlement]

Arjun → Sidhant     ₹800
                 [✓ Log Settlement]
```

---

# 22. Log Settlement

## US-030 — Log Suggested Settlement

The user taps:

```text
✓ Log Settlement
```

for one specific suggested payment.

### Flow

```text
Tap Log Settlement
       ↓
Settlement confirmation screen/modal
       ↓
Display from/to/amount
       ↓
Enter admin password
       ↓
Log Settlement
       ↓
POST settlement
       ↓
Refresh balances
       ↓
Refresh suggestions
       ↓
Refresh settlement history
```

There is intentionally no global:

```text
Confirm All Settlements
```

button.

Each settlement is logged independently.

---

# 23. Settlement Success

After successful logging:

```text
✓ Settled

Rahul → Sidhant
₹400

17 Sep 2026 · 11:15 AM
```

The outstanding balance updates immediately.

Smart settlement suggestions are recalculated.

---

# 24. Settlement History

## US-031 — View Settlement History

Settlement history appears below outstanding balances.

Example:

```text
Settlement History

Rahul → Sidhant
₹400
17 Sep 2026 · 11:15 AM

Arjun → Sidhant
₹300
17 Sep 2026 · 10:52 AM
```

Each record contains:

- From
- To
- Amount
- Timestamp

Settlement records are immutable.

---

# 25. Settlement Immutability

There are no:

```text
Edit Settlement
Delete Settlement
Undo Settlement
```

actions.

If a settlement was entered incorrectly, the correction is recorded as a new settlement according to the application's balance rules.

---

# 26. Dynamic Settlement Behavior

After each logged settlement:

```text
Old balances
     ↓
Apply settlement
     ↓
New balances
     ↓
Recalculate suggestions
```

The user should never need to manually refresh the page.

---

# 27. Clear All Transactions

## US-032 — Clear Group Transactions

From Settings:

```text
Danger Zone
   ↓
Clear All Transactions
```

Requires admin password.

The action must have a strong confirmation step because it is destructive.

Recommended confirmation:

```text
Clear all transactions?

This will remove the group's expense records
and the associated transaction history.

[Cancel]    [Clear All]
```

The exact treatment of settlement history must follow the final product rule documented in the PRD/API contract.

People and categories remain.

---

# 28. Delete Group

## US-033 — Delete Group

From Settings:

```text
Danger Zone
   ↓
Delete Group
```

Requires admin password.

Strong confirmation required.

Recommended flow:

```text
Delete Group?

This permanently deletes:
• Expenses
• People
• Categories
• Balances
• Settlement history

[Cancel]    [Delete Group]
```

After successful deletion:

```text
Return to group selector
```

If another group exists, select it.

If no group exists, show the Create New Group flow.

---

# 29. Loading States

Every network-backed screen must have a loading state.

Example:

```text
Loading...
```

For dashboard data, avoid displaying misleading zero balances while data is still loading.

Prefer:

```text
Loading balances...
```

until authoritative data is available.

---

# 30. Empty States

## No Groups

```text
No groups yet.

Create your first group to get started.

＋ Create Group
```

## No Expenses

```text
No expenses yet.

Add your first expense.

＋
```

## No Outstanding Balance

```text
All settled 🎉

No outstanding payments.
```

## No Settlement History

```text
No settlements logged yet.
```

## No Filter Results

```text
No transactions match these filters.
```

---

# 31. Network Failure

If the backend is unavailable:

```text
Something went wrong.
Please check your connection and try again.
```

For mutations:

- Do not show success.
- Do not locally invent a transaction.
- Do not update balances as if the mutation succeeded.

The app does not support offline transaction recording or offline synchronization.

---

# 32. Concurrent Users

Multiple friends may have the app open simultaneously.

Example:

```text
Phone A                 Phone B
   │                       │
   │ Add Expense           │ Add Expense
   ├──────────┐   ┌────────┤
   │          ▼   ▼        │
   │       Backend         │
   │          │            │
   │          ▼            │
   │      PostgreSQL       │
```

Both valid expenses must be persisted.

The UI should refresh after successful mutations.

The backend must not rely on a global application lock.

---

# 33. Stale Screen Handling

Because multiple people can use the app simultaneously, the data shown on one phone can become stale.

When returning to or refreshing the main screen, the frontend should fetch current:

- Expenses
- Balances
- People
- Categories

Settlement suggestions should always be generated from current server state.

The frontend must not assume its previously displayed balance is authoritative.

---

# 34. Group Context Rules

Every group-specific API request must use the currently selected group ID.

A user switching:

```text
Goa Trip
```

to:

```text
Flat Expenses
```

must never see Goa Trip data mixed into Flat Expenses.

The frontend should clear or replace group-specific state when switching groups.

---

# 35. Back Navigation

Back/cancel behavior should never accidentally save data.

Examples:

```text
Add Expense → ✕ → Home
Expense Edit → Cancel → Expense Details
Settings → Back → Home
Settlement → ✕ → Home
```

Unsaved changes should be discarded unless the UI explicitly provides a save action.

---

# 36. Protected Action UX

For protected actions, use a consistent password interaction.

Example:

```text
Admin Password

••••••••

[Cancel]       [Confirm]
```

Invalid password:

```text
Incorrect admin password.
```

Do not reveal any additional password information.

The password should not be included in URLs.

---

# 37. Accessibility and Interaction Requirements

The app should support:

- Readable text sizes.
- Sufficient touch target sizes.
- Clear button labels.
- Visible focus states where applicable.
- Keyboard-safe forms.
- Proper input types for numeric fields.
- Screen-reader-friendly labels where practical.
- Avoid relying only on color to communicate balance state.

The interface should remain usable on the target iPhone sizes without horizontal scrolling.

---

# 38. User Journey — First Use

```text
Open app
   ↓
No groups
   ↓
Create New Group
   ↓
Enter "Goa Trip"
   ↓
Create
   ↓
Add people in Settings
   ↓
Home
   ↓
Add Expense
   ↓
Enter amount
   ↓
Enter description
   ↓
Choose payer
   ↓
Choose participants
   ↓
Review shares
   ↓
Optional category
   ↓
Add Expense
   ↓
Home shows transaction
   ↓
Balances update
```

---

# 39. User Journey — Normal Expense

```text
Home
 ↓
+
 ↓
Add Expense
 ↓
Amount
 ↓
Description
 ↓
Paid by
 ↓
Participants
 ↓
Shares
 ↓
Category (optional)
 ↓
Add Expense
 ↓
Success
 ↓
Home
```

Target interaction goal:

**Record a normal expense in as few taps as reasonably possible.**

---

# 40. User Journey — Edit Expense

```text
Home
 ↓
Tap transaction
 ↓
Edit
 ↓
Modify
 ↓
Admin Password
 ↓
Confirm
 ↓
Saved
 ↓
Updated balances
```

---

# 41. User Journey — Settlement

```text
Home
 ↓
✓
 ↓
Outstanding balances
 ↓
Smart Settlement
 ↓
Suggested payments
 ↓
Tap Log Settlement
 ↓
Admin Password
 ↓
Log
 ↓
Balances recalculate
 ↓
Suggestions recalculate
 ↓
Settlement appears in history
```

---

# 42. User Journey — Group Switching

```text
Home
 ↓
Tap "Goa Trip ▼"
 ↓
Select another group
 ↓
New group becomes active
 ↓
Dashboard reloads
```

No data from the previous group should remain visible after the new group's data is loaded.

---

# 43. User Journey — Destructive Action

```text
Settings
 ↓
Danger Zone
 ↓
Destructive action
 ↓
Warning / confirmation
 ↓
Admin Password
 ↓
Server validation
 ↓
Mutation
 ↓
Success
 ↓
Reload affected state
```

Both password and confirmation are required for destructive actions.

---

# 44. Complete MVP User Story List

| ID | User Story | Protected |
|---|---|---|
| US-001 | View current group | No |
| US-002 | View balances | No |
| US-003 | View transaction history | No |
| US-004 | Filter transactions | No |
| US-005 | Sort transactions | No |
| US-006 | Switch group | No |
| US-007 | Create group | No |
| US-008 | Open settings | No |
| US-009 | Rename group | No |
| US-010 | Add person | No |
| US-011 | Remove person | Yes |
| US-012 | Add category | No |
| US-013 | Remove category | No |
| US-014 | Open Add Expense | No |
| US-015 | Enter amount | No |
| US-016 | Enter description | No |
| US-017 | Select payer | No |
| US-018 | Select participants | No |
| US-019 | Equal split | No |
| US-020 | Unequal split | No |
| US-021 | Split rounding | No |
| US-022 | Add category to expense | No |
| US-023 | Create expense | No |
| US-024 | Cancel expense | No |
| US-025 | Open expense | No |
| US-026 | Edit expense | Yes |
| US-027 | Delete expense | Yes |
| US-028 | Open settlement | No |
| US-029 | Generate smart settlement | No |
| US-030 | Log settlement | Yes |
| US-031 | View settlement history | No |
| US-032 | Clear transactions | Yes |
| US-033 | Delete group | Yes |

---

# 45. Definition of Done — User Flows

The MVP user-flow implementation is complete when:

- [ ] A user can create a group.
- [ ] A user can switch between groups.
- [ ] A user can add people.
- [ ] A user can remove people with admin authorization.
- [ ] A user can manage categories.
- [ ] A user can add an expense.
- [ ] Equal splitting works.
- [ ] Unequal splitting works.
- [ ] Share totals are validated.
- [ ] Expense timestamps are recorded.
- [ ] Expenses appear newest-first.
- [ ] Filtering works.
- [ ] Sorting works.
- [ ] Expenses can be edited with admin authorization.
- [ ] Expenses can be deleted with admin authorization.
- [ ] Balances update after expense changes.
- [ ] Settlement suggestions are generated from current balances.
- [ ] Individual settlements can be logged with admin authorization.
- [ ] Settlement history is displayed.
- [ ] Settlements cannot be edited or deleted.
- [ ] Balances update immediately after settlement.
- [ ] Destructive actions require confirmation and admin authorization.
- [ ] Network failures do not produce fake success.
- [ ] Multiple simultaneous expense submissions work correctly.
- [ ] Group data remains isolated.
- [ ] The app works cleanly on target iPhone screen sizes.

---

# 46. Out-of-Scope User Flows

The following are intentionally not part of MVP:

- User registration.
- Login/logout.
- Individual accounts.
- Current-user identity.
- Social login.
- AI expense parsing.
- OCR receipt scanning.
- Recurring expenses.
- Subscription tracking.
- Multiple currencies.
- UPI/payment integration.
- Direct bank/payment settlement.
- Push reminders.
- Offline expense creation.
- Automatic cloud synchronization from an offline queue.
- Advanced analytics.
- Budgeting.
- Investment/finance tracking.
- Public sharing.
- Commercial multi-tenant features.

---

# 47. Implementation Rule

The UI should make the common path fast while keeping the financial state authoritative on the backend.

The preferred principle is:

```text
Simple interaction
       +
Strong server validation
       +
Deterministic financial logic
       +
Immediate UI refresh
```

If a user flow conflicts with the PRD, Database Schema, or API Design, the conflict must be resolved explicitly before implementation rather than silently choosing new behavior.
