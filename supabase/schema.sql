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
  status        TEXT,
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

-- ─── Hilfsfunktionen für RLS (verhindern unendliche Rekursion) ──
CREATE OR REPLACE FUNCTION public.is_chat_member(chat_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = $1 AND cm.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_chat_admin(chat_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id AND c.created_by = user_id
  ) OR EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = chat_id AND cm.user_id = user_id AND cm.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- profiles: jeder kann lesen, nur eigenes Profil bearbeiten
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- chats: nur Mitglieder sehen ihre Chats
CREATE POLICY "chats_select_member"
  ON public.chats FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_chat_member(id, auth.uid())
  );

CREATE POLICY "chats_insert_authenticated"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- chat_members: nur Mitglieder sehen Memberships
CREATE POLICY "chat_members_select_member"
  ON public.chat_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_chat_member(chat_id, auth.uid())
  );

-- Nur Chat-Admins dürfen Mitglieder hinzufügen
CREATE POLICY "chat_members_insert_authenticated"
  ON public.chat_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_chat_admin(chat_id, auth.uid()));

-- Nur Chat-Admins dürfen Mitglieder entfernen (Nutzer dürfen sich selbst entfernen)
CREATE POLICY "chat_members_delete_member"
  ON public.chat_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_chat_admin(chat_id, auth.uid())
  );

-- messages: nur Mitglieder lesen & schreiben
CREATE POLICY "messages_select_member"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.is_chat_member(chat_id, auth.uid()));

CREATE POLICY "messages_insert_member"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    public.is_chat_member(chat_id, auth.uid())
  );

CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

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

-- ─── Automatisches Erstellen von Profilen bei Signup ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Zugriff auf die Trigger-Funktion einschränken (Sicherheitsbestimmung)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ─── Tabelle: locations ───────────────────────────────────────
-- ============================================================
CREATE TABLE IF NOT EXISTS public.locations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  accuracy      DOUBLE PRECISION,
  is_sharing    BOOLEAN DEFAULT TRUE NOT NULL,
  expires_at    TIMESTAMPTZ DEFAULT NULL, -- NULL means indefinite sharing
  chat_id       UUID REFERENCES public.chats(id) ON DELETE CASCADE, -- NULL means shared with all contacts
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT locations_user_id_chat_id_key UNIQUE NULLS NOT DISTINCT (user_id, chat_id)
);

-- Row Level Security (RLS)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS-Richtlinien
CREATE POLICY "locations_write_own" ON public.locations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "locations_select_shared" ON public.locations FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() OR
    (
      -- If chat_id is set, the viewer must be a member of that specific chat
      (locations.chat_id IS NOT NULL AND public.is_chat_member(locations.chat_id, auth.uid()))
      OR
      -- If chat_id is null, the viewer must share some chat with the user
      (locations.chat_id IS NULL AND EXISTS (
        SELECT 1 
        FROM public.chat_members cm1
        JOIN public.chat_members cm2 ON cm1.chat_id = cm2.chat_id
        WHERE cm1.user_id = auth.uid() AND cm2.user_id = locations.user_id
      ))
    )) AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Realtime aktivieren für locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER TABLE public.locations REPLICA IDENTITY DEFAULT;

