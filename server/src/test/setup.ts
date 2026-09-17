import 'dotenv/config'
import bcrypt from 'bcryptjs'

// Tests use a fixed, throwaway admin password — never the real one from
// the developer's own .env — so the suite is hermetic and never depends on
// (or risks exposing) production secrets.
export const TEST_ADMIN_PASSWORD = 'test-admin-password'

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(TEST_ADMIN_PASSWORD, 4)
