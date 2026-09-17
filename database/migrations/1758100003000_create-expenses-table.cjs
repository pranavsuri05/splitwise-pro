exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        description VARCHAR(150) NOT NULL,
        amount INTEGER NOT NULL CHECK (amount >= 1 AND amount <= 99999),
        paid_by UUID NOT NULL REFERENCES people(id),
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  pgm.sql(`
    CREATE INDEX expenses_group_created_at
    ON expenses(group_id, created_at DESC);
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS expenses;')
}
