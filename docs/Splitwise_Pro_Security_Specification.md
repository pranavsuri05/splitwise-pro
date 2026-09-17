# Security Specification — Splitwise Pro

**Version:** 1.0  
**Status:** MVP Security Specification  
**Application Type:** Private personal-use expense-sharing PWA  
**Security Approach:** Simple, server-authoritative, appropriate for trusted users with access to the private app link

---

# 1. Purpose

This document defines the security model for Splitwise Pro.

The application is intentionally designed for private use by the user and their friends.

It is **not** designed as a public commercial financial platform.

The security model therefore prioritizes:

- Protecting the database
- Protecting admin-only actions
- Preventing accidental or malicious data corruption
- Keeping secrets server-side
- Validating all financial operations
- Avoiding unnecessary authentication complexity

---

# 2. Security Model

Splitwise Pro does not have user accounts.

There is no:

- Login
- Signup
- OAuth
- Social authentication
- User session
- Current-user identity
- Role system

The basic model is:

```text
Private App Link
       ↓
   Application
       ↓
Normal features available
       ↓
Sensitive actions require
shared admin password
```

The app is intended to be used only by people who have access to the private link.

---

# 3. Trust Model

Users of the app are considered trusted members of the private group.

Normal users can:

- View group data.
- Create groups.
- Switch groups.
- Add people.
- Add/remove categories.
- Add expenses.
- View balances.
- View settlement suggestions.
- View settlement history.

Sensitive financial/destructive operations require the shared admin password.

---

# 4. Protected Operations

The following operations require admin authorization:

```text
Edit Expense
Delete Expense
Remove Person
Log Settlement
Clear All Transactions
Delete Group
```

The following do not:

```text
Create Group
Rename Group
Add Person
Add Category
Remove Category
Create Expense
View Expenses
View Balances
View Settlement Suggestions
View Settlement History
```

If this list changes, update the API Design and User Stories documents as well.

---

# 5. Admin Password

There is one shared admin password.

Only the user should know it.

The password must:

- Never be stored in frontend JavaScript.
- Never be committed to GitHub.
- Never be included in a URL.
- Never be stored in browser local storage.
- Never be logged.
- Never be returned by an API.
- Never be exposed through an error message.

---

# 6. Admin Password Storage

The backend must not store the password in plaintext.

Use a secure server-side secret or password hash.

Recommended approaches include:

- Argon2
- bcrypt
- Secure platform-managed secret

The exact implementation may depend on the deployment environment.

The frontend should never receive the stored hash.

---

# 7. Admin Authorization Request

Protected requests use:

```http
X-Admin-Password: <password>
```

Example:

```http
DELETE /api/groups/<groupId>/expenses/<expenseId>
X-Admin-Password: <password>
```

The password must only be transmitted over HTTPS in production.

Do not place the password in:

```text
URL query parameters
URL paths
Browser-visible persisted configuration
Logs
Analytics
```

---

# 8. Authorization Flow

For a protected request:

```text
Frontend
   ↓
HTTPS request
   ↓
Backend receives password
   ↓
Backend verifies password
   ↓
If valid → perform operation
If invalid → return 401
```

Example error:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ADMIN_PASSWORD",
    "message": "Admin authorization failed."
  }
}
```

Do not reveal additional information about the password.

---

# 9. No JWT / Session System

MVP does not require:

- JWTs
- Refresh tokens
- OAuth
- Cookies for authentication
- User sessions
- Role-based access control

The shared password is intentionally kept simple.

Each protected request can independently verify the password.

This keeps the architecture small and easy to maintain.

---

# 10. Private Link Limitation

The private application link provides practical access control for the intended use case, but a URL by itself is not a complete authentication mechanism.

Anyone who obtains the link can access normal application functionality.

Therefore:

```text
Private link ≠ authentication
```

The shared admin password provides an additional barrier for sensitive operations.

For the intended trusted-friends MVP, this is acceptable.

If the application ever becomes public or handles sensitive information at larger scale, proper authentication and authorization should be introduced.

---

# 11. Supabase Security

The browser must never receive the Supabase service-role key.

Architecture:

```text
React/PWA
    ↓
Express API
    ↓
Supabase/PostgreSQL
```

Server-side credentials remain in environment variables.

Never commit:

```text
.env
service-role keys
database passwords
admin password/hash
production secrets
```

to GitHub.

---

# 12. Environment Variables

Sensitive configuration belongs in environment variables.

Examples:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD_HASH
```

Exact variable names may change during implementation.

The frontend may receive only values intentionally safe for browser exposure.

---

# 13. Database Access

Database access should be restricted to the backend.

The backend is responsible for:

- Validation
- Authorization
- Financial calculations
- Database mutations

The browser should not have unrestricted direct database access.

Use the database/API layer to enforce group relationships and business rules.

---

# 14. Database Integrity

Security also means protecting financial consistency.

The database should enforce appropriate constraints:

- Foreign keys
- Unique constraints
- Positive/valid amounts
- Valid UUID relationships
- Expense/share relationships
- Settlement relationships

Multi-record changes should use database transactions.

---

# 15. Server-Side Validation

The frontend cannot be trusted as the only validator.

Every mutation must be validated by the backend.

Examples:

```text
Expense amount
Description
Payer
Participants
Share amounts
Category
Settlement amount
Group membership
Person status
```

The server must verify that referenced resources belong to the requested group.

---

# 16. Cross-Group Access Protection

Every group-specific request must verify resource ownership.

Example:

```text
GET /groups/A/expenses/expense-B
```

If `expense-B` belongs to group B:

```text
Reject request
```

Do not allow a client to access another group's data simply by changing a UUID.

This check must happen server-side.

---

# 17. Input Security

All API inputs must be validated.

Protect against:

- SQL injection
- Cross-site scripting
- Malformed JSON
- Invalid UUIDs
- Invalid numbers
- Negative monetary values
- Unexpected oversized strings
- Invalid group/person/category relationships

Use parameterized queries or safe database APIs.

Never construct SQL using raw string concatenation from user input.

---

# 18. XSS Protection

User-controlled fields include:

- Group names
- Person names
- Category names
- Expense descriptions

These values must be rendered safely.

The React application should rely on normal escaped rendering.

Do not use raw HTML rendering for user-generated content unless absolutely necessary.

---

# 19. Financial Integrity

The backend is the authoritative source of financial state.

The frontend must never be trusted to submit authoritative:

- Balances
- Smart settlement results
- Financial adjustments
- Historical timestamps

The backend calculates/validates these values.

Core invariant:

```text
sum(current balances) = 0
```

---

# 20. Expense Integrity

The backend must enforce:

```text
1 <= amount <= 99,999
```

and:

```text
sum(shares) = expense amount
```

An invalid expense must never be persisted.

Expense + shares must be created atomically.

---

# 21. Settlement Integrity

Settlement creation requires:

```text
amount >= 1
from_person != to_person
```

Both people must belong to the same group.

The admin password must be valid.

The settlement must be validated against the current financial state according to the business rules.

Settlements are immutable after creation.

---

# 22. Person Removal Security

Removing a person is an admin-protected action.

The backend should:

1. Verify admin password.
2. Verify person exists.
3. Verify person belongs to group.
4. Mark person inactive.
5. Preserve historical records.
6. Apply the defined balance-removal behavior.

Do not physically delete historical person references simply to remove them from the active list.

---

# 23. Destructive Actions

Destructive actions require two protections:

```text
Confirmation
+
Admin password
```

Applies to:

- Delete expense
- Remove person
- Clear transactions
- Delete group

The backend must still require the password even if the frontend already displayed a confirmation.

Frontend confirmation is not a security mechanism.

---

# 24. Delete Group Protection

Deleting a group is irreversible.

The UI should clearly explain what will be deleted.

The backend should:

- Verify admin password.
- Verify group exists.
- Perform deletion transactionally.
- Cascade/delete dependent records according to the schema.

No partial group deletion should be possible.

---

# 25. Clear Transactions Protection

Clear transactions is also admin-protected.

The backend must perform the operation atomically.

The exact records cleared must match the final product rule.

Recommended complete financial reset:

```text
Expenses
Expense Shares
Settlement History
```

are removed.

People and categories remain.

---

# 26. Rate Limiting

Because there is one shared admin password, protect the admin endpoints against repeated guessing.

A simple rate limit is sufficient for MVP.

Example strategy:

```text
Repeated failed admin attempts
        ↓
Temporary request throttling
```

Do not build a complex security platform.

---

# 27. Error Handling

Never expose:

- Stack traces
- Database credentials
- SQL queries
- Internal filesystem paths
- Password hashes
- Service-role keys
- Internal service configuration

Return concise application errors.

Example:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong."
  }
}
```

Detailed technical information should remain in secure server logs.

---

# 28. Logging

Server logs may record useful operational information such as:

- Request method
- Endpoint
- Status code
- Timing
- Error code
- Resource IDs where appropriate

Never log:

```text
Admin password
Password hash
Database password
Supabase service-role key
Authorization secrets
```

Be cautious about logging full request bodies for financial endpoints.

---

# 29. HTTPS

Production deployment must use HTTPS.

This protects:

- Admin password transmission
- Expense data
- Settlement data
- Group information

Never deploy protected operations over plain HTTP.

Local development may use HTTP on localhost.

---

# 30. Browser Storage

Do not persist the admin password in:

```text
localStorage
sessionStorage
IndexedDB
URL
cookies
```

unless a future authentication architecture explicitly requires a secure session mechanism.

For MVP, the password should exist only for the duration of the protected request/form interaction.

---

# 31. PWA Security

The PWA may cache static application assets.

Do not unnecessarily cache sensitive API responses or financial data in a way that allows stale/private data to persist beyond the intended application lifecycle.

The service worker should primarily support:

```text
Static app shell
CSS
JavaScript
Icons
Other non-sensitive assets
```

Financial mutations remain online-only.

---

# 32. Content Security

Where practical, configure standard web security headers such as:

- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- Frame protections

Do not introduce complex security middleware unless it provides a clear benefit.

---

# 33. Third-Party Services

MVP should minimize third-party data sharing.

Do not send expense or settlement information to:

- AI services
- Advertising platforms
- Analytics services
- Unnecessary external APIs

The core system only needs:

```text
Frontend hosting
Backend
PostgreSQL/Supabase
```

---

# 34. Privacy

The app should collect only information required for expense sharing.

Examples:

- Group name
- Person names
- Category names
- Expense descriptions
- Expense amounts
- Expense shares
- Settlement records
- Timestamps

No user account profile is required.

No financial information should be sent to external services unnecessarily.

---

# 35. Threat Model

| Threat | Mitigation |
|---|---|
| Accidental deletion | Confirmation + admin password |
| Unauthorized admin action | Shared admin password |
| Password guessing | Rate limiting |
| Password leakage | HTTPS + no logging/storage in browser |
| SQL injection | Parameterized/safe DB APIs |
| XSS | Safe React rendering + validation |
| Cross-group access | Server-side group/resource validation |
| Invalid financial data | Backend validation + DB constraints |
| Corrupt multi-record state | Database transactions |
| Client-side manipulation | Server-authoritative calculations |
| Database credential exposure | Server-only environment variables |
| Secret committed to GitHub | `.env`/secret management |
| Stale concurrent data | Server refresh + authoritative recalculation |

---

# 36. Security Boundaries

The main security boundaries are:

```text
Browser
   │
   │ HTTPS
   ▼
Express Backend
   │
   ├── Validation
   ├── Admin Authorization
   ├── Financial Logic
   │
   ▼
PostgreSQL / Supabase
```

The backend is the main security boundary.

The frontend is treated as untrusted.

---

# 37. What MVP Intentionally Does Not Implement

To keep the app simple, MVP does not implement:

- User accounts
- Login
- Signup
- OAuth
- JWT
- Refresh tokens
- Role management
- Multi-factor authentication
- Enterprise SSO
- Complex permission systems
- Public sharing controls
- Payment authorization
- Bank integrations

These can be introduced later if the product's scope changes.

---

# 38. Security Testing

Before deployment, verify:

### Admin

- [ ] Protected endpoints reject missing password.
- [ ] Incorrect password returns `401`.
- [ ] Correct password allows operation.
- [ ] Password is never returned.
- [ ] Password is never logged.

### API

- [ ] Invalid UUIDs are rejected.
- [ ] Cross-group resource access is rejected.
- [ ] Invalid expense amounts are rejected.
- [ ] Invalid shares are rejected.
- [ ] Invalid settlements are rejected.
- [ ] Inactive people cannot be used for new expenses.

### Database

- [ ] Foreign keys work.
- [ ] Unique constraints work.
- [ ] Cascades behave correctly.
- [ ] Transactions roll back correctly.
- [ ] Service-role credentials are server-only.

### Web

- [ ] HTTPS works in production.
- [ ] No secrets appear in frontend bundles.
- [ ] No sensitive data is unnecessarily cached.
- [ ] User-controlled text is safely rendered.

---

# 39. Deployment Security Checklist

Before production:

- [ ] Production uses HTTPS.
- [ ] Admin password/hash is configured through secure environment variables.
- [ ] Supabase service-role key is backend-only.
- [ ] `.env` is excluded from Git.
- [ ] No secrets are committed to GitHub.
- [ ] Production database credentials are not exposed to the client.
- [ ] Admin endpoints have rate limiting.
- [ ] Security headers are configured where practical.
- [ ] Error responses do not expose internals.
- [ ] Database backups/recovery options are understood.

---

# 40. Security Philosophy

The security model should remain proportional to the application.

This is:

```text
A private app
+
Trusted friends
+
Private link
+
Shared admin password
```

It is not:

```text
A public banking platform
```

Therefore the goal is not to build an enterprise authentication system.

The goal is to prevent:

- Accidental destructive actions
- Casual unauthorized changes
- Client-side manipulation
- Database exposure
- Common web vulnerabilities
- Financial calculation corruption
- Secret leakage

while keeping the application simple to operate.

---

# 41. Future Security Upgrade Path

If Splitwise Pro ever becomes public or supports many unrelated users, introduce:

```text
User accounts
      ↓
Authentication
      ↓
Group membership
      ↓
Per-group authorization
      ↓
Role/permission model
      ↓
Secure sessions/tokens
```

The current architecture should keep the backend logic sufficiently separated so that this can be introduced later without rewriting the financial engine.

---

# 42. Locked Security Decisions

| Decision | Choice |
|---|---|
| App access | Private link |
| User accounts | None |
| Login | None |
| Normal authentication | None |
| Admin protection | Shared password |
| Password storage | Server-side secure hash/secret |
| Password in frontend bundle | Never |
| Password in URL | Never |
| Password in browser storage | Never |
| HTTPS | Required in production |
| Supabase service-role key | Backend only |
| Financial authority | Backend |
| Cross-group validation | Required |
| Rate limiting | Admin endpoints |
| Offline financial mutations | Not supported |
| Third-party financial data sharing | None required |
| Public/commercial security model | Out of scope |

---

# 43. Final Security Principle

Keep the security simple, but never put trust where it does not belong.

```text
Private link
     +
Shared admin password
     +
HTTPS
     +
Server-side validation
     +
Secure database credentials
     +
Atomic financial operations
     +
Common web-security protections
```

This provides an appropriate security baseline for the private Splitwise Pro MVP without introducing unnecessary authentication or infrastructure complexity.
