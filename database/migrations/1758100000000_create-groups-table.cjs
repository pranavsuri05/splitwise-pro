exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS groups;')
}
