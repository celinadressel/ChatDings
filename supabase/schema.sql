-- ============================================================
-- chat-dings – Supabase Datenbankschema
-- Einzuspielen in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Erweiterung für UUID-Generierung (in Supabase bereits aktiv)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tabelle: profiles ────────────────────────────────────────
-- Öffentliches Profil, das mit auth.users verknüpft ist
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── Tabelle: chats ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT,               -- NULL bei DMs
  is_group    BOOLEAN DEFAULT FALSE NOT NULL,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── Tabelle: chat_members ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_members (
  chat_id    UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

-- ─── Tabelle: messages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id     UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  is_deleted  BOOLEAN DEFAULT FALSE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── Indizes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON public.messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS chat_members_user_id_idx ON public.chat_members(user_id);

-- ─── Row Level Security (RLS) ─────────────────────────────────
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages   ENABLE ROW LEVEL SECURITY;

-- profiles: jeder kann lesen, nur eigenes Profil bearbeiten
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- chats: nur Mitglieder sehen ihre Chats
CREATE POLICY "chats_select_member"
  ON public.chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_id = chats.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "chats_insert_authenticated"
  ON public.chats FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- chat_members: nur Mitglieder sehen Memberships
CREATE POLICY "chat_members_select_member"
  ON public.chat_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_members.chat_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_members_insert_authenticated"
  ON public.chat_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- messages: nur Mitglieder lesen & schreiben
CREATE POLICY "messages_select_member"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_member"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- ─── Realtime aktivieren ──────────────────────────────────────
-- Im Supabase Dashboard: Database > Replication > messages Tabelle aktivieren
-- Alternativ per SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ─── Automatisches updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
