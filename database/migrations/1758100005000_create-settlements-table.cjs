exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        from_person UUID NOT NULL REFERENCES people(id),
        to_person UUID NOT NULL REFERENCES people(id),
        amount INTEGER NOT NULL CHECK (amount >= 1),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (from_person <> to_person)
    );
  `)

  pgm.sql(`
    CREATE INDEX settlements_group_created_at
    ON settlements(group_id, created_at DESC);
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS settlements;')
}
