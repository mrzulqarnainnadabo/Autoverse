-- AUTOVERSE — Supabase Migration
-- Run this AFTER all prior schema files (core, autoinspect, listing,
-- buyer, messaging) have been applied to your Supabase project's
-- Postgres database, via the SQL Editor in the Supabase Dashboard or
-- `supabase db push` with the CLI.

-- ============================================================
-- 1. Tie public.users to Supabase's built-in auth.users
-- ============================================================
-- public.users.id must equal the corresponding auth.users.id so that
-- auth.uid() in RLS policies matches rows in our own users table.
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE users
  ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Auto-create a public.users profile row whenever someone signs up via
-- Supabase Auth. Role/full_name/phone come from the metadata passed at
-- signup time, e.g.:
--   supabase.auth.signUp({ email, password, options: { data: {
--     role: 'buyer', full_name: 'Ada Obi', phone: '08012345678'
--   }}})
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'AUTOVERSE User'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- If a dealer signs up, also seed a minimal dealers row so
-- listingService.createDraft (which requires a dealers(id) row to
-- attach a FK to) doesn't fail on their very first listing. Individual
-- sellers don't need a dealers row — vehicles.seller_id covers them.
CREATE OR REPLACE FUNCTION public.handle_new_dealer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'dealer' THEN
    INSERT INTO public.dealers (id, business_name, state)
    VALUES (NEW.id, NEW.full_name || '''s Dealership', 'Lagos')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_public_user_created ON public.users;
CREATE TRIGGER on_public_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_dealer();

-- ============================================================
-- 2. Row Level Security for tables the mobile client queries directly
-- ============================================================
-- Only `conversations` and `messages` are queried directly by the
-- mobile Supabase client right now (for the Realtime subscription in
-- ChatScreen — see mobile/screens/ChatScreen.tsx). Every other table
-- (vehicles, listings, dealers, autoinspect_reports, etc.) is only
-- ever accessed through the Express API, which enforces its own
-- ownership checks — so RLS is not yet enabled on those tables. Add
-- policies there too if you later expose them to direct client reads.

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_participant_select ON conversations
  FOR SELECT USING (
    buyer_id = auth.uid() OR dealer_id = auth.uid() OR seller_id = auth.uid()
  );

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_participant_select ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR dealer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- Writes still go through Express (see messagingService.sendMessage),
-- which uses the service-role client and therefore bypasses RLS. This
-- INSERT policy exists so that if a future feature calls
-- supabase.from('messages').insert(...) directly from the client, it's
-- already safe — sender must be a real participant.
CREATE POLICY messages_participant_insert ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR dealer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Enable Realtime streaming on the messages table
-- ============================================================
-- This is what ChatScreen's supabase.channel(...).on('postgres_changes', ...)
-- subscription listens to.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
