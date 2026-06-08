# Chat-Dings 💬

Ein moderner Web-Messenger als Boilerplate auf Basis von **Next.js 15**, **Supabase**, **shadcn/ui** und **Zod** – als Lernprojekt und Startpunkt für eure eigene Messenger-App.

---

## Tech Stack

| Technologie | Zweck |
|-------------|-------|
| **Next.js 15** (App Router) | Framework, Server Components, Server Actions |
| **Supabase** | Auth, PostgreSQL-Datenbank, Realtime |
| **shadcn/ui** | UI-Komponentenbibliothek (Radix UI + Tailwind) |
| **Zod** | Typsichere Validierung aller Formulareingaben |
| **TypeScript** | End-to-End-Typsicherheit |
| **Tailwind CSS v4** | Styling |

---

## Projektstruktur

```
src/
├── app/
│   ├── layout.tsx              # Root Layout (Dark Mode, Inter Font)
│   ├── page.tsx                # Redirect → /chat
│   ├── login/page.tsx          # Login-Seite
│   ├── register/page.tsx       # Registrierungs-Seite
│   └── chat/
│       ├── layout.tsx          # Chat-Layout (lädt User + Chatliste)
│       ├── page.tsx            # Leerer Zustand (kein Chat gewählt)
│       └── [chatId]/page.tsx   # Chat-Detailansicht
├── components/
│   ├── chat/
│   │   ├── ChatSidebar.tsx     # Sidebar mit Chatliste + Nutzer-Footer
│   │   ├── ChatHeader.tsx      # Chat-Kopfzeile
│   │   ├── MessageList.tsx     # Nachrichtenliste mit Bubbles
│   │   ├── MessageInput.tsx    # Eingabefeld (Enter = Senden)
│   │   └── NewChatDialog.tsx   # Modal: Nutzer suchen & DM starten
│   └── ui/                     # shadcn/ui Komponenten (auto-generiert)
├── lib/
│   ├── actions/
│   │   ├── auth.ts             # Server Actions: signUp, signIn, signOut
│   │   └── chat.ts             # Server Actions: sendMessage, createDirectChat
│   ├── supabase/
│   │   ├── client.ts           # Browser-Client (@supabase/ssr)
│   │   ├── server.ts           # Server-Client (@supabase/ssr)
│   │   └── types.ts            # TypeScript-Typen (Datenbankschema)
│   ├── validations.ts          # Zod-Schemas für alle Eingaben
│   └── utils.ts                # shadcn Hilfsfunktionen
├── middleware.ts               # Route Guards (Auth-Schutz)
supabase/
└── schema.sql                  # Vollständiges Datenbankschema
```

---

## 🚀 Setup-Anleitung

### 1. Repository klonen

```bash
git clone git@github.com:celinadressel/ChatDings.git
cd ChatDings
npm install
```

### 2. Supabase-Zugangsdaten eintragen

Erstelle eine `.env.local` Datei im Projektroot (wird nicht committet):

```env
NEXT_PUBLIC_SUPABASE_URL=https://gpdrvalixxggxhwocwgm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=EUER_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=EUER_SERVICE_ROLE_KEY
SUPABASE_DB_PASSWORD=EUER_DB_PASSWORT
```

> Die Zugangsdaten bekommt ihr von Tim/Celina – oder legt euch im [Supabase Dashboard](https://supabase.com/dashboard/project/gpdrvalixxggxhwocwgm) unter **Settings > API** die Keys an.

### 3. Datenbank einrichten

Falls noch nicht geschehen: Gehe im Supabase Dashboard zu **SQL Editor** und führe das Skript aus:

```
supabase/schema.sql
```

Das Skript erstellt:
- Tabellen: `profiles`, `chats`, `chat_members`, `messages`
- Row Level Security (RLS) Policies
- Indizes für Performance
- Automatische `updated_at`-Trigger
- Realtime-Publikation für `messages`

### 4. Supabase Auth konfigurieren

Im Supabase Dashboard unter **Authentication > Settings**:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/**`
- E-Mail-Bestätigung für Entwicklung deaktivieren:
  *Authentication > Providers > Email > Confirm email: **OFF***

### 5. Entwicklungsserver starten

```bash
npm run dev
```

App läuft unter: **http://localhost:3000**

---

## 🗄️ Datenbankschema

Alle Entitäten verwenden **UUIDs** als Primary Keys (generiert von PostgreSQL).

```
auth.users (Supabase intern)
  └── id: UUID (PK)

profiles
  └── id: UUID (PK, FK → auth.users)
  └── username: TEXT (unique)
  └── display_name: TEXT
  └── avatar_url: TEXT

chats
  └── id: UUID (PK)
  └── name: TEXT (null bei DMs)
  └── is_group: BOOLEAN
  └── created_by: UUID (FK → profiles)

chat_members
  └── chat_id: UUID (FK → chats)
  └── user_id: UUID (FK → profiles)
  └── role: 'admin' | 'member'
  [PK: (chat_id, user_id)]

messages
  └── id: UUID (PK)
  └── chat_id: UUID (FK → chats)
  └── sender_id: UUID (FK → profiles)
  └── content: TEXT
  └── is_deleted: BOOLEAN
```

---

## 🔒 Authentifizierung

- Supabase Auth (Email + Password)
- Sessions in Cookies via `@supabase/ssr`
- `middleware.ts` schützt automatisch alle Routen unter `/chat/*`

### Auth-Flow

```
Register → signUp() Server Action
  ├── supabase.auth.signUp()      ← Auth-User anlegen
  └── profiles.insert()           ← Öffentliches Profil anlegen
  → Redirect zu /chat

Login → signIn() Server Action
  └── supabase.auth.signInWithPassword()
  → Redirect zu /chat

Logout → signOut() → Redirect zu /login
```

---

## 📝 Validierung mit Zod

Alle Formulare werden serverseitig mit Zod validiert (`src/lib/validations.ts`):

| Schema | Felder |
|--------|--------|
| `signUpSchema` | email, username (3-30 Zeichen, alphanumerisch), display_name, password (min. 8), confirmPassword |
| `signInSchema` | email, password |
| `sendMessageSchema` | content (max. 4000 Zeichen), chat_id (UUID) |
| `createChatSchema` | name, is_group, member_ids |

---

## ✨ Features

- ✅ Registrierung und Login (E-Mail/Passwort)
- ✅ Nutzerprofile (Username + Anzeigename)
- ✅ Direkt-Nachrichten (DM) zwischen Nutzern starten
- ✅ Nutzersuche beim Anlegen neuer Chats
- ✅ Nachrichten senden (Enter = Senden, Shift+Enter = Zeilenumbruch)
- ✅ Chat-Bubbles (eigene Nachrichten rechts, andere links)
- ✅ UUID-basierte IDs für alle Entitäten
- ✅ Route Guards via Next.js Middleware
- ✅ Row Level Security in Supabase
- ✅ Dark Mode

---

## 🔮 Mögliche Erweiterungen

- **Echtzeit-Nachrichten** via `supabase.channel()` + Realtime (Infrastruktur bereits aktiv)
- **Gruppen-Chats** anlegen (Backend bereits vorbereitet)
- **Profilbilder** via Supabase Storage
- **Nachrichten bearbeiten/löschen** (`is_deleted`-Flag bereits vorhanden)
- **Read Receipts** (Lesen-Bestätigungen)
- **Push-Benachrichtigungen** via Web Push API

---

## 🛠️ Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Dev-Server starten
npm run dev

# TypeScript-Typen prüfen
npx tsc --noEmit
```

---

*Boilerplate für Kommilitonen-Projekt – Next.js 15 · Supabase · shadcn/ui · Zod*
