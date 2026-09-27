-- Weight classes: `main` is the lightweight ladder. The seed inserts hills with ON CONFLICT DO
-- NOTHING, so a `main` row from an earlier seed keeps its old description. Give it the seed's
-- (`src/db/seed.ts` SEED_HILLS). Its config already caps bots at 512 bytes. No row, no change.
UPDATE hills
SET description = 'the lightweight ladder: duels of 10 rounds, 80,000 cycles a round, bots of 1 to 512 bytes.'
WHERE slug = 'main';
