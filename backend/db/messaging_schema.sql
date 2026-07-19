-- AUTOVERSE — Messaging schema
-- Run after core_schema.sql, listing_schema.sql, and buyer_schema.sql.
--
-- Design note: this table pair is deliberately append-only and keyed
-- simply (UUID PK, created_at ordering) — that shape is exactly what
-- Supabase Realtime (Postgres logical replication under the hood)
-- streams cleanly, so moving from polling to a live subscription later
-- is a client-side change only, not a schema change.

CREATE TABLE IF NOT EXISTS conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  buyer_id            UUID NOT NULL REFERENCES users(id),
  dealer_id           UUID REFERENCES dealers(id),   -- set when the listing belongs to a dealer
  seller_id           UUID REFERENCES users(id),      -- set when the listing belongs to an individual seller
  origin_inquiry_id   UUID REFERENCES inquiries(id),   -- links back to the first-contact record, if any
  last_message_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One conversation per buyer per listing — repeated contact reuses
  -- the same thread rather than fragmenting into duplicates.
  UNIQUE (vehicle_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer
  ON conversations (buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_dealer
  ON conversations (dealer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller
  ON conversations (seller_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES users(id),
  sender_role       TEXT NOT NULL CHECK (sender_role IN ('buyer','dealer','seller')),
  body              TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at ASC);

-- Powers the unread-count lookup ("messages in this thread not sent by
-- me, not yet read") without a full table scan as message volume grows.
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages (conversation_id, sender_id) WHERE read_at IS NULL;

-- ============================================================
-- Supabase migration notes (apply when moving off self-managed Postgres)
-- ============================================================
-- 1. Enable realtime streaming on the messages table:
--      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
--    Conversations can be added too if the inbox screen should update
--    live when a new thread is created, not just when a message arrives.
--
-- 2. Row Level Security — once auth moves to Supabase Auth (auth.uid()
--    replaces the custom JWT's req.user.id), enable RLS with policies
--    equivalent to the ownership checks currently enforced in
--    messagingService.assertParticipant():
--
--      ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
--      CREATE POLICY conversations_participant_select ON conversations
--        FOR SELECT USING (
--          buyer_id = auth.uid() OR dealer_id = auth.uid() OR seller_id = auth.uid()
--        );
--
--      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
--      CREATE POLICY messages_participant_select ON messages
--        FOR SELECT USING (
--          conversation_id IN (
--            SELECT id FROM conversations
--            WHERE buyer_id = auth.uid() OR dealer_id = auth.uid() OR seller_id = auth.uid()
--          )
--        );
--      CREATE POLICY messages_participant_insert ON messages
--        FOR INSERT WITH CHECK (
--          sender_id = auth.uid() AND conversation_id IN (
--            SELECT id FROM conversations
--            WHERE buyer_id = auth.uid() OR dealer_id = auth.uid() OR seller_id = auth.uid()
--          )
--        );
--
--    Until then, the Express layer is the enforcement point (see
--    messagingService.ts) — do not expose these tables directly to
--    client-side Supabase queries before RLS is in place.
