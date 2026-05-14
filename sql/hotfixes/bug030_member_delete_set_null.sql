-- ============================================================================
-- BUG-030 hotfix — Member DELETE 500 → 204
-- ============================================================================
-- Source spec : .cleargate/delivery/pending-sync/BUG-030_Member_Delete_500_FK_Items.md
-- Date drafted: 2026-05-15
-- Apply via   : Supabase SQL Editor → New query → paste → Run
--               (https://app.supabase.com/project/<your-project>/sql)
--
-- What it does:
--   1. Drops the existing FK on items.updated_by_member_id (default NO ACTION).
--   2. Makes the column nullable so the FK can use ON DELETE SET NULL.
--   3. Recreates the FK with ON DELETE SET NULL.
--
-- Why:
--   Today DELETE /admin-api/v1/members/:mid returns 500 when the member
--   has authored items (FK violation 23503). After this script:
--     - The DB allows the DELETE.
--     - Authored items keep their row; updated_by_member_id becomes NULL.
--     - Authorship history survives in audit_log (denormalized email).
--
-- Safety:
--   - Non-destructive. No rows deleted. Existing values preserved.
--   - Transactional. If any step fails, the whole change rolls back.
--   - Idempotent enough — DROP CONSTRAINT IF EXISTS handles re-runs cleanly.
--
-- Rollback (if needed — re-runs the pre-fix state):
--   BEGIN;
--   ALTER TABLE public.items
--     DROP CONSTRAINT IF EXISTS items_updated_by_member_id_members_id_fk;
--   ALTER TABLE public.items
--     ALTER COLUMN updated_by_member_id SET NOT NULL;  -- fails if any NULLs exist
--   ALTER TABLE public.items
--     ADD CONSTRAINT items_updated_by_member_id_members_id_fk
--       FOREIGN KEY (updated_by_member_id)
--       REFERENCES public.members(id)
--       ON DELETE NO ACTION
--       ON UPDATE NO ACTION;
--   COMMIT;
-- ============================================================================

BEGIN;

-- 1. Drop the existing FK (currently ON DELETE NO ACTION, which is why deletes 500).
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_updated_by_member_id_members_id_fk;

-- 2. Allow NULLs so the FK can use SET NULL semantics.
ALTER TABLE public.items
  ALTER COLUMN updated_by_member_id DROP NOT NULL;

-- 3. Recreate the FK with ON DELETE SET NULL.
ALTER TABLE public.items
  ADD CONSTRAINT items_updated_by_member_id_members_id_fk
    FOREIGN KEY (updated_by_member_id)
    REFERENCES public.members(id)
    ON DELETE SET NULL
    ON UPDATE NO ACTION;

COMMIT;

-- ============================================================================
-- Verification — run these AFTER the COMMIT to confirm the change applied.
-- ============================================================================

-- (a) Column is nullable.
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'items'
  AND column_name  = 'updated_by_member_id';
-- Expected: is_nullable = 'YES'

-- (b) FK delete_rule is SET NULL.
SELECT tc.constraint_name,
       rc.delete_rule,
       rc.update_rule
FROM information_schema.referential_constraints rc
JOIN information_schema.table_constraints tc
  ON tc.constraint_name = rc.constraint_name
 AND tc.table_schema    = rc.constraint_schema
WHERE tc.constraint_name = 'items_updated_by_member_id_members_id_fk';
-- Expected: delete_rule = 'SET NULL'  /  update_rule = 'NO ACTION'

-- (c) Functional smoke — count of authored items grouped by member.
-- (Run BEFORE issuing a DELETE on a member; confirms which rows would null out.)
SELECT updated_by_member_id, COUNT(*) AS authored_items
FROM public.items
GROUP BY updated_by_member_id
ORDER BY authored_items DESC
LIMIT 10;
