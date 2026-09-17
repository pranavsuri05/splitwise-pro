exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (group_id, name)
    );
  `)

  pgm.sql(`
    CREATE INDEX categories_group
    ON categories(group_id);
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS categories;')
}
