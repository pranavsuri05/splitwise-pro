exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE expense_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        person_id UUID NOT NULL REFERENCES people(id),
        amount INTEGER NOT NULL CHECK (amount >= 0),
        UNIQUE (expense_id, person_id)
    );
  `)

  pgm.sql(`
    CREATE INDEX expense_shares_expense
    ON expense_shares(expense_id);
  `)

  pgm.sql(`
    CREATE INDEX expense_shares_person
    ON expense_shares(person_id);
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS expense_shares;')
}
