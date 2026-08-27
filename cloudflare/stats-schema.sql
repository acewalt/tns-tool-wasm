CREATE TABLE IF NOT EXISTS stats (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS daily_visitors (
  visit_date TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visit_date, visitor_id)
) STRICT;

INSERT INTO stats (name, value)
VALUES ('documents_generated', 0)
ON CONFLICT(name) DO NOTHING;
