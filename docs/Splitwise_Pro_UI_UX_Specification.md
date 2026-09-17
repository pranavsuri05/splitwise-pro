# UI/UX Specification — Splitwise Pro

**Version:** 1.0  
**Status:** MVP UI/UX Specification  
**Platform:** Mobile-first Web App / PWA  
**Primary Target:** Modern iPhones  
**Design Direction:** Clean, minimal, lightweight, native-iPhone-inspired utility app

---

# 1. Purpose

This document defines the visual and interaction design for Splitwise Pro.

The goal is to create a simple expense-sharing app that feels natural on an iPhone:

- Minimal
- Clean
- Fast
- Easy to understand
- Few taps
- Light visual graphics
- Strong information hierarchy
- No unnecessary dashboards or decoration

This document should be used alongside the PRD, System Architecture, Database Schema, API Design, and User Stories/User Flows.

---

# 2. Core Design Principles

## 2.1 Simple First

Every screen should make the next action obvious.

The user should not need to understand the application's internal architecture.

---

## 2.2 Minimal Visual Noise

Avoid:

- Excessive cards
- Large illustrations
- Dense tables
- Heavy borders
- Gradients everywhere
- Large decorative graphics
- Excessive animations
- Unnecessary navigation

Use whitespace and hierarchy to separate information.

---

## 2.3 iPhone-First

The interface should be designed for modern iPhone screens first.

Primary targets:

- iPhone 14
- iPhone 14 Plus
- iPhone 15
- iPhone 17
- iPhone 17 Pro

The application should also work on similar modern mobile sizes.

---

## 2.4 Native-Like, Not Native-Only

The application is a React/Vite PWA.

It should visually and behaviorally feel similar to a polished iOS utility app without attempting to reproduce Apple's UI exactly.

---

## 2.5 Fast Interaction

Common operations should require as few taps as reasonably possible.

The primary example:

```text
Home
 ↓
+
 ↓
Enter expense
 ↓
Add Expense
```

---

# 3. Overall Visual Direction

Desired aesthetic:

```text
Clean
Minimal
Light
Modern
Soft
Functional
```

The application should feel closer to a simple iPhone utility than a traditional finance dashboard.

Use:

- Light backgrounds
- White surfaces
- Subtle borders
- Rounded corners
- Small line icons
- Moderate corner radii
- Clear typography
- Restrained color usage

Avoid making the app visually busy.

---

# 4. Color System

Use a restrained palette.

## Background

Near-white / very light neutral.

## Surface

White.

## Primary Text

Near-black.

## Secondary Text

Medium gray.

## Borders

Very light gray.

## Positive Balance

Subtle green.

## Negative Balance

Subtle red.

## Accent

One primary accent color should be used consistently for:

- Primary buttons
- Selected controls
- Important interactive elements
- Active states

The accent should not dominate the entire screen.

---

# 5. Balance Color Rules

Do not make the application entirely green/red.

Example:

```text
Sidhant       +₹670
Rahul         -₹420
Arjun         -₹250
```

Positive and negative values may use subtle semantic colors.

Use text, signs, and layout as the primary communication mechanism.

Color must never be the only indicator.

---

# 6. Typography

Use a clean system font stack appropriate for Apple devices.

Recommended:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "Segoe UI",
  sans-serif;
```

Hierarchy should be modest.

Recommended levels:

```text
Screen title       Large / semibold
Section heading    Medium / semibold
Primary data       Medium / semibold
Body               Regular
Secondary data     Small / regular
Metadata           Small / muted
```

Avoid oversized hero typography.

---

# 7. Spacing

Use a consistent spacing system based around small multiples.

Suggested values:

```text
4px
8px
12px
16px
20px
24px
32px
```

Primary screen horizontal padding:

```text
16px
```

Larger sections:

```text
24px+
```

Do not compress unrelated information into tiny gaps.

---

# 8. Touch Targets

Interactive controls should be comfortable for touch.

Target approximately:

```text
44px minimum touch area
```

This applies to:

- Buttons
- Icons
- Checkboxes
- Rows
- Navigation controls
- Close buttons

Small visual icons may exist inside larger touch targets.

---

# 9. Corner Radius

Use moderate rounded corners.

Suggested:

```text
Small controls: 8px
Cards/inputs:   12px
Sheets:         20px+
```

Avoid excessive pill-shaped UI unless appropriate for a compact control.

---

# 10. Icons & Graphics

Use a consistent lightweight line-icon system.

Examples:

| Category | Suggested visual |
|---|---|
| Food | Fork/plate |
| Travel | Car/plane |
| Rent | House |
| Shopping | Bag |
| Entertainment | Play/movie |
| Utilities | Bolt |
| Other | Simple dots/grid |

Icons are secondary to text and financial information.

Avoid large decorative illustrations.

Use small graphics primarily for:

- Categories
- Empty states
- Success states
- Important visual cues

---

# 11. Main Navigation

There is no bottom tab bar.

The application has three primary actions from Home:

```text
⚙️       Group ▼       ✓
```

Where:

- `⚙️` = current group settings
- `Group ▼` = group selector
- `✓` = settlement screen

The floating:

```text
+
```

button opens Add Expense.

---

# 12. Home Screen

The Home screen is the primary screen.

Conceptual layout:

```text
┌──────────────────────────────┐
│                              │
│ ⚙️       Goa Trip ▼      ✓  │
│                              │
│ Group Balance                │
│                              │
│ Sidhant                 +670 │
│ Rahul                   -420 │
│ Arjun                   -250 │
│                              │
│ ──────────────────────────── │
│                              │
│ Recent                       │
│                              │
│ 🍛 Dinner              ₹2400 │
│    Sidhant · Food            │
│    Today, 9:42 PM            │
│                              │
│ 🚕 Cab                  ₹680 │
│    Rahul · Travel            │
│    Today, 7:15 PM            │
│                              │
│ 🛒 Groceries           ₹1200 │
│    Arjun · Shopping          │
│                              │
│                         ＋   │
└──────────────────────────────┘
```

---

## 12.1 Home Header

Structure:

```text
⚙️       Goa Trip ▼      ✓
```

Requirements:

- Compact.
- Always visible near the top.
- Safe-area aware.
- Group name centered.
- Group name can be tapped to open selector.

---

## 12.2 Balance Section

Title:

```text
Group Balance
```

Each person:

```text
Sidhant             +₹670
Rahul               -₹420
Arjun               -₹250
```

Sort/order should remain stable and intuitive.

Do not display:

```text
You owe
You are owed
```

because there is no current-user identity.

---

## 12.3 Recent Transactions

The transaction feed is also the transaction history.

Default:

```text
Newest → Oldest
```

Each transaction should display:

- Small category icon where available
- Description
- Amount
- Payer
- Category
- Timestamp

Tap opens transaction details/edit.

---

# 13. Floating Add Button

Use a floating:

```text
+
```

button as the main action.

Requirements:

- Easy to reach with one hand.
- Visually prominent but not oversized.
- Safe-area aware.
- Remains above scroll content.
- Has touch feedback.

---

# 14. Group Selector

Tapping the group name opens a bottom sheet.

Example:

```text
Select Group

Goa Trip
Flat Expenses
Manali Trip

────────────

＋ Create New Group
```

Requirements:

- Current group visually indicated.
- Group names do not need to be unique.
- Selecting a group immediately changes context.
- Group-specific data must reload.
- Previous group's data must not remain mixed into the new group.

---

# 15. Create Group UI

Suggested bottom sheet/modal:

```text
Create New Group

Group Name

[ Goa Trip              ]

Cancel        Create
```

Validation:

- Required.
- Not blank.
- Maximum 100 characters.

After creation:

```text
New group becomes active.
```

No password required.

---

# 16. Add Expense Screen

This is the highest-priority interaction screen.

Suggested design:

```text
┌──────────────────────────────┐
│                              │
│ ← Add Expense             ✕  │
│                              │
│ Amount                       │
│                              │
│ ₹ 2,400                      │
│                              │
│ Description                  │
│                              │
│ Dinner                       │
│                              │
│ Paid by                      │
│ Sidhant                   ›  │
│                              │
│ Split between                │
│                              │
│ Sidhant                  ₹800│
│ Rahul                    ₹800│
│ Arjun                    ₹800│
│                              │
│ Category (optional)          │
│ Food                      ›  │
│                              │
│                              │
│        Add Expense           │
│                              │
└──────────────────────────────┘
```

---

# 17. Add Expense Interaction

When the screen opens:

- Amount input should be easy to focus.
- Numeric keyboard should be used.
- Form should be vertically scrollable when necessary.
- Keyboard must not cover the active input/button.

The primary action remains:

```text
Add Expense
```

---

# 18. Amount Input

Use a numeric input.

Rules:

```text
Minimum: ₹1
Maximum: ₹99,999
Decimals: not allowed
```

Display INR naturally:

```text
₹2,400
```

Do not allow paise.

---

# 19. Description Input

Required.

Placeholder example:

```text
Dinner
```

Maximum:

```text
150 characters
```

Show concise validation when empty.

---

# 20. Payer Selector

Tapping `Paid by` opens a bottom sheet:

```text
Paid by

Sidhant
Rahul
Arjun
Varun
```

Only active people appear.

The user may select any person.

---

# 21. Participant Selection

Use a clean selectable list.

Example:

```text
Split between

☑ Sidhant
☑ Rahul
☐ Arjun
☑ Varun
```

The payer does not have to be included.

At least one participant is required.

---

# 22. Share Amount UI

Once participants are selected, display individual amounts.

Example:

```text
Sidhant                 ₹800
Rahul                   ₹800
Arjun                   ₹800
```

Equal split is the default.

Amounts can be edited directly.

Show the current total:

```text
Total     ₹2,400 / ₹2,400
```

If invalid:

```text
Total     ₹2,300 / ₹2,400

Shares must equal ₹2,400.
```

The submit button should be disabled until the shares are valid.

---

# 23. Category Selector

Optional.

Tapping category opens:

```text
Category

Food
Travel
Rent
Shopping
Entertainment
Utilities
Other
────────────
None
```

If no category is selected, display:

```text
Category (optional)
```

---

# 24. Add Expense Success

After successful save:

```text
Expense added
```

Return to Home.

Refresh:

- Transaction feed
- Group balances

The new expense should appear in the feed.

A subtle success animation/check is acceptable.

---

# 25. Add Expense Cancel

The top-right:

```text
✕
```

cancels without saving.

No confirmation is required for an untouched/new form.

If substantial form data has been entered, a lightweight discard confirmation may be used if necessary.

---

# 26. Expense Details Screen

Tapping a transaction opens its details.

Example:

```text
Dinner
₹2,400

Paid by
Sidhant

Split between

Sidhant              ₹800
Rahul                ₹800
Arjun                ₹800

Food

17 Sep 2026 · 9:42 PM

Edit
Delete
```

Use a clean layout rather than a dense table.

---

# 27. Edit Expense UI

Editing should reuse the Add Expense form where possible.

Flow:

```text
Expense Details
      ↓
Edit
      ↓
Edit form
      ↓
Save Changes
      ↓
Admin Password
      ↓
Success
```

The original creation timestamp remains unchanged.

---

# 28. Delete Expense UI

Use a confirmation dialog.

Example:

```text
Delete Expense?

This expense will be permanently removed.

Cancel          Delete
```

Then request admin password.

Do not make accidental deletion easy.

---

# 29. Settings Screen

Use an iOS-inspired grouped settings layout.

Example:

```text
Settings

GROUP

Group Name
Goa Trip                         ›

PEOPLE

People                           ›

CATEGORIES

Categories                       ›

DANGER ZONE

Clear All Transactions           ›
Delete Group                     ›
```

Keep the screen visually sparse.

---

# 30. People Screen

Example:

```text
People

Sidhant
Rahul
Arjun
Varun

＋ Add Person
```

Inactive people may be shown separately or with a muted state.

Example:

```text
Inactive

Rahul
```

Historical records remain accessible.

---

# 31. Add Person

Simple form:

```text
Add Person

Name

[ Rahul ]

Cancel          Add
```

No password.

---

# 32. Remove Person

Tap person → Remove.

Show:

```text
Remove Rahul?

Rahul will no longer be available
for new expenses.

Historical records will remain.

Cancel          Remove
```

Then request admin password.

---

# 33. Categories Screen

Example:

```text
Categories

🍛 Food
🚕 Travel
🏠 Rent
🛍 Shopping
🎬 Entertainment
💡 Utilities
••• Other

＋ Add Category
```

Removing a category does not delete expenses.

Existing expenses become Uncategorized.

---

# 34. Settlement Screen

The settlement screen should prioritize clarity.

Example:

```text
Settlement

Outstanding

Rahul → Sidhant
₹700

Arjun → Sidhant
₹500

Varun → Rahul
₹300

────────────────────

Smart Settlement

Rahul → Sidhant
₹400

[✓ Log Settlement]

Arjun → Sidhant
₹800

[✓ Log Settlement]
```

No chart or graph is required.

---

# 35. Smart Settlement Button

Use a clear secondary/primary action:

```text
Smart Settlement
```

It generates suggestions from current balances.

It is a deterministic mathematical calculation, not an AI feature.

---

# 36. Settlement Log Flow

When the user taps:

```text
✓ Log Settlement
```

show:

```text
Log Settlement

Rahul → Sidhant

₹400

Admin Password

••••••••

Cancel          Log Settlement
```

After success:

```text
✓ Settled

Rahul → Sidhant
₹400

17 Sep 2026 · 11:15 AM
```

---

# 37. Settlement History

Place history below outstanding balances.

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

Settlement records cannot be edited or deleted.

---

# 38. Admin Password Modal

Use one consistent component throughout the app.

Example:

```text
Admin Password

[ •••••••• ]

Cancel             Confirm
```

Use secure password input.

Never display the password.

Never place it in a URL.

The backend validates the password.

---

# 39. Confirmation Dialogs

Destructive operations should use a two-stage pattern:

```text
Action
 ↓
Warning/confirmation
 ↓
Admin password
 ↓
Server mutation
```

Applies to:

- Delete expense
- Remove person
- Clear transactions
- Delete group
- Log settlement

---

# 40. Loading States

Keep loading states minimal.

Examples:

```text
Loading...
```

or skeleton rows where useful.

Avoid long animated loaders.

For financial data, do not show temporary zero balances as if they were authoritative.

---

# 41. Empty States

## No Groups

```text
No groups yet.

Create your first group.

＋ Create Group
```

## No Expenses

```text
No expenses yet.

Add your first expense.

＋
```

## No Outstanding Payments

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

Use small, subtle graphics where appropriate.

---

# 42. Error States

Errors should be short and actionable.

Examples:

```text
Could not save expense.
Check your connection and try again.
```

```text
Incorrect admin password.
```

```text
Something went wrong.
Please try again.
```

Avoid exposing technical details such as SQL/database errors.

---

# 43. Network Behavior

The application requires an active connection for financial mutations.

No offline transaction creation.

If a mutation fails:

- Do not show success.
- Do not create a fake local transaction.
- Keep entered form data where practical.
- Allow retry.

Static PWA assets may still be cached.

---

# 44. Keyboard Behavior

The UI must account for the iPhone software keyboard.

Requirements:

- Inputs should scroll into view.
- Important buttons must not be hidden behind the keyboard.
- Numeric keyboard for amount.
- Appropriate keyboard for text fields.
- Dismiss keyboard naturally when submitting or moving to another section.

---

# 45. Safe Area

The application must respect iPhone safe areas.

Important UI:

- Top header
- Floating `+`
- Bottom sheets
- Primary bottom actions

must not overlap:

- Dynamic Island
- Status bar
- Home indicator

Use CSS safe-area environment variables where appropriate.

---

# 46. Bottom Sheets

Use bottom sheets for compact selection/action flows where appropriate:

- Group selector
- Payer selector
- Category selector
- Admin password
- Confirmation
- Other short actions

Sheets should:

- Have rounded top corners.
- Be easy to dismiss.
- Keep content concise.
- Avoid excessive nesting.

---

# 47. Modals vs Full Screens

Use a full screen for:

- Home
- Add Expense
- Expense Details/Edit
- Settings
- People
- Categories
- Settlement

Use sheets/modals for:

- Selecting a person
- Selecting a category
- Selecting a group
- Password entry
- Short confirmations

---

# 48. Motion & Animation

Motion should be subtle and fast.

Allowed:

- Bottom sheet slide-up.
- Button press feedback.
- Small success check.
- Transaction insertion.
- Balance update transition.

Avoid:

- Long transitions.
- Large page animations.
- Excessive bouncing.
- Confetti for ordinary actions.
- Decorative particle effects.

The application should feel fast.

---

# 49. Responsive Behavior

The primary layout is mobile-first.

For larger screens:

```text
Desktop browser
       ↓
Centered mobile-width application shell
```

The desktop experience does not need a separate dashboard design for MVP.

Avoid stretching the entire UI across a large desktop viewport.

---

# 50. Interaction Feedback

Every meaningful action should provide feedback.

Examples:

```text
Button pressed
→ subtle visual feedback
```

```text
Expense saved
→ success indication
```

```text
Settlement logged
→ success state + updated balances
```

```text
Invalid form
→ inline validation
```

Feedback should be quick and unobtrusive.

---

# 51. Accessibility

The app should provide:

- Clear text labels.
- Adequate touch targets.
- Keyboard accessibility where relevant.
- Visible focus states.
- Screen-reader-friendly labels where practical.
- Semantic HTML.
- Color-independent meaning.
- Readable contrast.
- Accessible form errors.

Do not use icons alone when the meaning could be ambiguous.

---

# 52. Component Inventory

The frontend should have reusable components for:

```text
AppShell
TopHeader
GroupSelector
BalanceList
BalanceRow
TransactionList
TransactionRow
FilterControls
SortControl
FloatingAddButton
AddExpenseForm
AmountInput
PersonSelector
ParticipantSelector
ShareInput
CategorySelector
ExpenseDetails
AdminPasswordModal
ConfirmationDialog
SettingsSection
PeopleList
CategoryList
SettlementList
SettlementSuggestion
EmptyState
LoadingState
ErrorState
```

Exact component names may change during implementation.

---

# 53. Screen Inventory

MVP screens:

```text
1. Home
2. Group Selector
3. Create Group
4. Add Expense
5. Expense Details
6. Edit Expense
7. Settings
8. People
9. Categories
10. Settlement
```

Reusable overlays:

```text
11. Payer Selector
12. Category Selector
13. Admin Password
14. Confirmation Dialog
```

---

# 54. Home Screen Information Hierarchy

Priority from highest to lowest:

```text
1. Current group
2. Group balances
3. Recent transactions
4. Filters/sorting
5. Add Expense
```

Do not allow secondary metadata to visually compete with balances or transaction descriptions.

---

# 55. Expense Screen Information Hierarchy

Priority:

```text
1. Amount
2. Description
3. Payer
4. Participants/shares
5. Category
6. Save
```

The amount should be visually prominent.

---

# 56. Settlement Information Hierarchy

Priority:

```text
1. Outstanding obligations
2. Smart settlement suggestions
3. Log Settlement
4. Settlement history
```

Do not overwhelm the user with calculation details.

---

# 57. Settings Information Hierarchy

Priority:

```text
1. Group
2. People
3. Categories
4. Danger Zone
```

Danger Zone should be visually separated from normal settings.

---

# 58. Design Anti-Patterns

Do not introduce:

- Bottom tab navigation with unused sections.
- Dashboard charts.
- Large KPI cards.
- Complex sidebars.
- Desktop-first layouts.
- Multiple nested menus.
- User avatars unless genuinely useful.
- Excessive badges.
- Excessive shadows.
- Heavy gradients.
- AI visual elements.
- Gamification.
- Complicated onboarding.

---

# 59. Visual Density Rule

The application should generally have:

```text
Few elements
+
Large enough spacing
+
Strong hierarchy
+
Small supporting graphics
```

rather than:

```text
More information
+
More cards
+
More colors
+
More controls
```

---

# 60. Definition of Done — UI/UX

The UI implementation is complete when:

- [ ] App feels clean and minimal on iPhone.
- [ ] Home screen is easy to understand immediately.
- [ ] Group selector is simple.
- [ ] Add Expense is fast and intuitive.
- [ ] Amount input uses the numeric keyboard.
- [ ] Equal splitting works visually.
- [ ] Unequal shares can be edited.
- [ ] Share total is always visible/validated.
- [ ] Category is optional.
- [ ] Expense details are readable.
- [ ] Edit/delete flows are clear.
- [ ] Settings uses grouped sections.
- [ ] People management is simple.
- [ ] Category management is simple.
- [ ] Settlement screen clearly shows outstanding payments.
- [ ] Smart settlement suggestions are easy to understand.
- [ ] Individual settlement logging is clear.
- [ ] Admin password UI is consistent.
- [ ] Destructive actions have confirmation.
- [ ] Empty states are useful but visually light.
- [ ] Errors are concise and actionable.
- [ ] Loading states do not imply false financial data.
- [ ] Safe areas are respected.
- [ ] Keyboard behavior is correct.
- [ ] Touch targets are comfortable.
- [ ] No horizontal scrolling on target iPhones.
- [ ] Desktop does not require a separate complex UI.
- [ ] Animations are subtle.
- [ ] No unnecessary graphics or visual clutter.

---

# 61. Final Design Principle

The final product should feel like:

> **A small, polished iPhone utility that gets expense sharing out of the way instead of making expense sharing the experience.**

The UI should prioritize:

```text
Clarity
   ↓
Speed
   ↓
Trust
   ↓
Minimal visual design
```

The design must support the product's core promise:

**Open → record → understand → settle.**
