-- Profiles (PRODUCT_SPEC §6): the GitHub account's display name and login, refreshed at each
-- sign-in, and whether the user hides them. `anonymous` 1 keeps the name, the GitHub login, and
-- the avatar off every public record; the handle still shows. Null name and login until the next
-- sign-in.
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN github_login TEXT;
ALTER TABLE users ADD COLUMN anonymous INTEGER NOT NULL DEFAULT 0;
