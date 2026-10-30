CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY NOT NULL,
  owner_hash TEXT NOT NULL,
  recipient TEXT NOT NULL,
  max_guests INTEGER NOT NULL DEFAULT 2,
  config_json TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'heirloom-film',
  published INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invitation_id TEXT NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  attendance TEXT NOT NULL CHECK (attendance IN ('attending', 'declining')),
  guests INTEGER NOT NULL,
  dietary TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS rsvps_invitation_created
  ON rsvps (invitation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS request_limits (
  key TEXT PRIMARY KEY NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
