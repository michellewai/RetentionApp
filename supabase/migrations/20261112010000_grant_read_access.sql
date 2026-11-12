-- Let the public API roles read the three tables.
--
-- New Supabase projects no longer grant table privileges to the API roles
-- automatically, so the read-only policies from the first migration had no
-- effect on their own: a request needs both a privilege on the table and a
-- policy that allows the row. Only SELECT is granted, so writes through the
-- API stay impossible even if a write policy were added by mistake.

grant select on public.members to anon, authenticated;
grant select on public.previous_memberships to anon, authenticated;
grant select on public.check_ins to anon, authenticated;
