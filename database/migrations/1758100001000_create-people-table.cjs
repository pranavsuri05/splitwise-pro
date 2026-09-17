exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE people (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (group_id, name)
    );
  `)

  pgm.sql(`
    CREATE INDEX people_group_active
    ON people(group_id, is_active);
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS people;')
}
