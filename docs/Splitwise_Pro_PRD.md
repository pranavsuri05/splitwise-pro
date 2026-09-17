# PRD — Splitwise Pro

**Status:** MVP Definition  
**Platform:** Mobile-first Web App / PWA  
**Primary Device:** iPhone  
**Users:** Private personal group of friends  
**Authentication:** None for normal usage  
**Currency:** INR (₹)

## 1. Product Overview

A lightweight, private expense-sharing web app for a fixed group of friends.

The app allows users to create multiple groups/trips, record shared expenses, calculate balances, and intelligently simplify settlements.

The goal is **not to replicate every feature of Splitwise**, but to provide a faster, simpler experience for personal use.

## 2. Core Product Principles

- Simple UI
- Minimal taps
- No unnecessary accounts
- No AI
- No multiple currencies
- No unnecessary financial features
- Shared group dashboard
- Accurate deterministic calculations
- Mobile-first iPhone experience

## 3. MVP Features

### A. Groups

Users can:

- Create multiple groups/trips.
- Switch between groups from the top-center selector.
- Delete a group with admin-password protection.
- Each group has independent:
  - People
  - Categories
  - Expenses
  - Balances
  - Settlement history

Example:

```text
Goa Trip ▼
Flat Expenses ▼
Manali Trip ▼
```

### B. People

Users can:

- Add people without a password.
- Remove people with the admin password.
- Give each person a unique name within the group.

Adding someone **does not affect previous expenses**.

Removing someone:
- Makes them inactive.
- Removes them from future expense selection.
- Keeps historical transaction records.
- Recalculates current balances according to the agreed removal rules.

### C. Expenses

Users can create an expense with:

- Amount
- Description
- Paid by
- People included in the expense
- Individual shares
- Optional category
- Automatically generated timestamp

Amount restrictions:

> **₹1–₹99,999**

No decimal amounts.

Description is mandatory.

Example:

```text
Amount       ₹2400
Description  Dinner
Paid by      Sidhant

Split between
☑ Sidhant   ₹800
☑ Rahul     ₹800
☑ Arjun     ₹800

Category     Food
```

Equal splits are automatically calculated.

Users can directly modify individual shares for unequal splits.

## 4. Dashboard

The dashboard is the primary screen.

Top navigation:

```text
⚙️       Goa Trip ▼       ✓
```

Where:

- ⚙️ = Group Settings
- `Goa Trip ▼` = Group selector
- ✓ = Settlement

Main dashboard contains:

### Group Overall State

Shows the group's current outstanding balances.

Example:

```text
Group Balance

Sidhant     +₹670
Rahul       -₹420
Arjun       -₹250
```

### Transaction Feed

All transactions appear chronologically.

**Default: newest → oldest.**

Each transaction displays:

- Description
- Amount
- Person who paid
- Participants
- Category, if present
- Timestamp

Transactions can be tapped to edit/delete.

## 5. Filtering & Sorting

Users can filter transactions by:

- Category
- Person
- Date

Users can sort by:

- Newest → Oldest
- Oldest → Newest
- Highest amount → Lowest
- Lowest amount → Highest

## 6. Add Expense

Floating **＋** button at the bottom of the dashboard.

Opens a dedicated expense screen.

```text
← Add Expense                         ✕

Amount
₹ ______

Description
__________

Paid by
[ Person ▼ ]

Split between

☑ Person 1    ₹xxx
☑ Person 2    ₹xxx
☑ Person 3    ₹xxx

Category (optional)
[ Food ▼ ]

             Add Expense
```

The **✕** cancels without saving.

If there is no internet connection, the expense is **not recorded**.

## 7. Categories

Default categories may include:

- Food
- Travel
- Rent
- Shopping
- Entertainment
- Utilities
- Other

Categories are:

- Optional on expenses.
- Group-specific.
- Addable without password.
- Removable without password.

Removing a category does **not** delete expenses associated with it.

Those expenses become uncategorized.

## 8. Settlement

Settlement screen shows all outstanding obligations.

Example:

```text
Outstanding

Rahul → Sidhant       ₹700
Arjun → Sidhant       ₹500
Varun → Rahul         ₹300
```

### Smart Settlement

The app calculates an optimized set of payments that reduces the number of transactions while preserving the same net balances.

Example:

```text
Smart Settlement

Rahul → Sidhant       ₹400
                 [✓ Log Settlement]

Arjun → Sidhant       ₹800
                 [✓ Log Settlement]
```

Each settlement is logged individually.

## 9. Settlement Logging

Logging a settlement requires the admin password.

A settlement record contains:

- Sender
- Receiver
- Amount
- Timestamp

After logging:

- Group balances update immediately.
- The settlement becomes part of settlement history.
- There is **no undo/edit functionality**.

If a mistake is made, users record another settlement to correct it.

## 10. Settlement History

Settlement history appears below outstanding balances.

Example:

```text
Settlement History

✓ Rahul → Sidhant       ₹400
  17 Sep · 11:15 AM

✓ Arjun → Sidhant       ₹800
  16 Sep · 09:42 PM
```

Settlement records remain even after expenses change, unless the entire group is deleted.

## 11. Settings

Group settings contain:

### Group

- Group name
- People
- Categories

### Danger Zone

- Clear all transactions
- Delete group

Danger-zone actions require the admin password.

## 12. Editing & Deletion Rules

### Edit Expense

Admin password required.

Editing recalculates balances immediately.

Original creation timestamp remains unchanged.

### Delete Expense

Admin password required.

The expense is permanently removed and balances recalculate.

### Remove Person

Admin password required.

The person becomes inactive while historical records remain available.

### Delete Group

Admin password required.

Deletes:

- Group
- People
- Categories
- Expenses
- Settlement records

## 13. Concurrency

Multiple people may have the application open simultaneously.

If two people record expenses at approximately the same time:

> **Both transactions must succeed.**

No locking mechanism is required.

Transactions are displayed according to their recorded timestamps.

## 14. Security

Normal users do not require accounts or passwords.

Administrative/destructive actions require a shared admin password.

Password-protected actions:

- Edit expense
- Delete expense
- Remove person
- Log settlement
- Clear transactions
- Delete group

The password must **never be stored as plaintext in the frontend**.

## 15. Explicitly Out of Scope

The MVP will **not** include:

- User accounts/login
- Multiple currencies
- AI expense parsing
- OCR/receipt scanning
- Recurring expenses
- Subscription tracking
- Spending analytics
- Payment/UPI integration
- Push reminders
- Native iOS application
- Offline transaction recording
- Complex notification systems

## 16. MVP Success Criteria

The MVP is successful if a group of friends can:

**Create group → Add people → Record expenses → View balances → Smart-settle → Log payments**

with minimal friction and without needing individual accounts.

The entire product should feel like a **simple private expense ledger**, rather than a full-scale financial application.

---

**PRD v1 is the baseline.** Any architecture, database, API, or implementation decision should conform to this unless the PRD is explicitly changed.
