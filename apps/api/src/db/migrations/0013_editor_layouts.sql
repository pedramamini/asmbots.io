-- Editor layouts (PRODUCT_SPEC §3): a signed-in user's named arrangements of the editor's panels,
-- so a layout made once comes back by name, on any device. `layout` is the editor's JSON as sent
-- (`{ root, hidden }`); the editor makes it whole when it reads it. A name is unique to its user,
-- in any case. The layouts go with the user when they delete their account.
CREATE TABLE editor_layouts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        TEXT NOT NULL COLLATE NOCASE,
  layout      TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, name)
);
