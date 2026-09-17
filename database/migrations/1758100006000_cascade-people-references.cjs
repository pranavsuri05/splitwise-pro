// Database_Schema.md §21's conceptual SQL leaves `expenses.paid_by`,
// `expense_shares.person_id`, and `settlements.from_person`/`to_person`
// without ON DELETE CASCADE to people(id). That's fine for normal operation
// (people are only ever soft-removed, never hard-deleted), but it breaks the
// documented atomic whole-group deletion (§13/§19/§22, PRD §12): Postgres
// resolves the groups -> people cascade and the groups -> expenses ->
// expense_shares cascade independently, and can attempt to delete a person
// row before the expense_shares row referencing them is gone, raising a
// foreign key violation. Adding CASCADE here only ever takes effect when a
// person row is hard-deleted, which only happens as part of this same
// whole-group wipe.
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE expenses
      DROP CONSTRAINT expenses_paid_by_fkey,
      ADD CONSTRAINT expenses_paid_by_fkey
        FOREIGN KEY (paid_by) REFERENCES people(id) ON DELETE CASCADE;
  `)

  pgm.sql(`
    ALTER TABLE expense_shares
      DROP CONSTRAINT expense_shares_person_id_fkey,
      ADD CONSTRAINT expense_shares_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;
  `)

  pgm.sql(`
    ALTER TABLE settlements
      DROP CONSTRAINT settlements_from_person_fkey,
      ADD CONSTRAINT settlements_from_person_fkey
        FOREIGN KEY (from_person) REFERENCES people(id) ON DELETE CASCADE;
  `)

  pgm.sql(`
    ALTER TABLE settlements
      DROP CONSTRAINT settlements_to_person_fkey,
      ADD CONSTRAINT settlements_to_person_fkey
        FOREIGN KEY (to_person) REFERENCES people(id) ON DELETE CASCADE;
  `)
}

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE expenses
      DROP CONSTRAINT expenses_paid_by_fkey,
      ADD CONSTRAINT expenses_paid_by_fkey
        FOREIGN KEY (paid_by) REFERENCES people(id);
  `)

  pgm.sql(`
    ALTER TABLE expense_shares
      DROP CONSTRAINT expense_shares_person_id_fkey,
      ADD CONSTRAINT expense_shares_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES people(id);
  `)

  pgm.sql(`
    ALTER TABLE settlements
      DROP CONSTRAINT settlements_from_person_fkey,
      ADD CONSTRAINT settlements_from_person_fkey
        FOREIGN KEY (from_person) REFERENCES people(id);
  `)

  pgm.sql(`
    ALTER TABLE settlements
      DROP CONSTRAINT settlements_to_person_fkey,
      ADD CONSTRAINT settlements_to_person_fkey
        FOREIGN KEY (to_person) REFERENCES people(id);
  `)
}
