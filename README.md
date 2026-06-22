# Chat-Dings 💬

Ein moderner, vollständig funktionsfähiger Web-Messenger, entwickelt als Hochschulprojekt von Tim Lachmann, Celina Dressel, Elias (EJ) und Lombartres.

> **Ziel:** Messenger-App mit Echtzeit-Kommunikation, Live-Standortfreigabe, Datei-Upload und Profilseite – gebaut auf modernem Next.js App Router + Supabase-Backend.

🌐 **Live-Demo:** [chat-dings.vercel.app](https://chat-dings.vercel.app) · Gehostet auf **Vercel**

---

## 🛠️ Tech Stack

| Technologie | Version | Zweck |
|---|---|---|
| **Next.js** (App Router) | 16.x | Framework, Server Components, Server Actions, Routing |
| **React** | 19.x | UI-Bibliothek, `useActionState`, Client-Components |
| **TypeScript** | 5.x | End-to-End-Typsicherheit |
| **Supabase** | 2.x | PostgreSQL-Datenbank, Auth (Email/Passwort), Realtime, Storage |
| **@supabase/ssr** | 0.10.x | Cookie-basiertes Session-Management in Next.js |
| **shadcn/ui** | 4.x | UI-Komponentenbibliothek (Radix UI + Tailwind CSS) |
| **Tailwind CSS** | 4.x | Utility-first Styling |
| **Zod** | 4.x | Typsichere serverseitige Validierung |
| **Leaflet** | 1.9.x | Interaktive Karte für Live-Standorte |
| **Lucide React** | 1.x | Icon-Set |

---

## ✨ Implementierte Features

### 🔐 Authentifizierung
- Registrierung mit E-Mail, Passwort, Username und Anzeigename
- Login / Logout (E-Mail + Passwort via Supabase Auth)
- Sessions in Cookies via `@supabase/ssr` (kein LocalStorage)
- Route Guard in `middleware.ts`: Nicht eingeloggte Nutzer werden automatisch zu `/login` weitergeleitet, eingeloggte Nutzer von Auth-Seiten zu `/chat`
- Bei Registrierung wird automatisch per PostgreSQL-Trigger ein öffentliches Profil angelegt (`handle_new_user`)

### 💬 Chats & Nachrichten
- **Direkt-Nachrichten (DMs)** zwischen zwei Nutzern starten (Duplikat-Prüfung: existiert bereits ein DM, wird der bestehende Chat geöffnet)
- **Gruppen-Chats** anlegen: Gruppenname vergeben + beliebig viele Mitglieder aus der Nutzerliste auswählen
- **Echtzeit-Nachrichten** via Supabase Realtime (`postgres_changes` INSERT): Neue Nachrichten erscheinen bei allen Mitgliedern sofort ohne Reload
- Nachrichten-Bubbles: eigene Nachrichten rechts (primary-farbig), fremde links (muted-Hintergrund)
- Zeitstempel und Absendername bei jeder Nachricht
- `Enter` = Senden, `Shift+Enter` = Zeilenumbruch

### 📎 Datei-Upload
- Dateien direkt im Chat versenden (Bilder, PDFs, Dokumente, ZIP, Text)
- Upload in Supabase Storage Bucket `chat-files` (privat, pfadbasiert: `{chatId}/{uuid}.{ext}`)
- **Bildvorschau** in der Nachrichtenliste (mit Lightbox / Vollbild-Klick)
- **Nicht-Bild-Dateien** als Download-Card mit Dateiname und Größe
- Signed URLs mit 1h Laufzeit für sicheren Zugriff
- Maximale Dateigröße: **20 MB**
- Authentifizierungs-Check vor Upload (verhindert abgelaufene Sessions)

### 🗺️ Live-Standortfreigabe
- Standort per Browser-Geolocation-API teilen (GPS, kontinuierliches `watchPosition`)
- Wählbare Dauer: **15 Min · 1 Std · 8 Std · unbegrenzt**
- **Scoped Sharing**: Standort nur für diesen Chat **oder** für alle gemeinsamen Kontakte teilen
- Interaktive Karte (Leaflet, CartoDB Dark Matter Tile Layer) mit animierten Avatar-Markern
- Genauigkeitskreis um jeden Marker (visualisiert GPS-Ungenauigkeit)
- Countdown-Timer zeigt verbleibende Sharing-Zeit
- Echtzeit-Updates per Supabase Realtime (`locations`-Tabelle)
- Automatische Ablauf-Bereinigung clientseitig (1-Sekunden-Intervall)
- Karte wird auf Desktop als Side-Panel (420–500px breit) neben dem Chat angezeigt, auf Mobile als Vollbild
- MapComponent wird **dynamisch ohne SSR** geladen (Leaflet benötigt `window`)

### 👤 Profilseite
- Eigenes Profil bearbeiten: Kontoname (Username), Anzeigename, Status-Text (max. 120 Zeichen), Profilbild-URL
- Live-Vorschau links neben dem Formular
- Server Action `updateProfile` mit Zod-Validierung und Fallback (falls `status`-Spalte noch nicht existiert)

### 🧭 Navigation & UI
- Persistente Sidebar mit Chatliste (zeigt letzten Nachrichtenvorschau + Zeitstempel)
- DM-Chats zeigen den **Namen des anderen Nutzers** (nicht generisch "Direkt-Chat")
- Gruppen zeigen ein Gruppen-Icon mit violettem Fallback-Avatar
- Profilbild des eigenen Nutzers im Sidebar-Footer
- Link zur eigenen Profilseite (`/chat/profile`)
- Dark Mode (systemweit)

---

## 📁 Projektstruktur

```
chat-dings/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root Layout (Dark Mode, Inter Font)
│   │   ├── page.tsx                    # Redirect → /chat
│   │   ├── globals.css                 # Globale Styles, Leaflet-Marker-CSS
│   │   ├── login/page.tsx              # Login-Seite
│   │   ├── register/page.tsx           # Registrierungs-Seite
│   │   └── chat/
│   │       ├── layout.tsx              # Chat-Layout: lädt User-Profil + Chatliste für Sidebar
│   │       ├── page.tsx                # Leerer Zustand (kein Chat gewählt)
│   │       ├── profile/page.tsx        # Profilseite (Server Component)
│   │       └── [chatId]/page.tsx       # Chat-Detailansicht (Server Component)
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx       # Client-Component: Realtime-State, Karte, Location-Sharing
│   │   │   ├── ChatSidebar.tsx         # Sidebar mit Chatliste + Nutzer-Footer
│   │   │   ├── ChatHeader.tsx          # Chat-Kopfzeile mit Karten-Toggle-Button
│   │   │   ├── MessageList.tsx         # Nachrichtenliste mit Bubbles (inkl. Datei-Attachments)
│   │   │   ├── MessageInput.tsx        # Texteingabe (Enter = Senden) + FileUploadButton
│   │   │   ├── NewChatDialog.tsx       # Modal: Nutzer suchen, DM oder Gruppe starten
│   │   │   ├── FileUploadButton.tsx    # Datei-Upload via Supabase Storage
│   │   │   ├── FileAttachment.tsx      # Dateidarstellung (Bild mit Lightbox / Download-Card)
│   │   │   └── MapComponent.tsx        # Leaflet-Karte (dynamisch, kein SSR)
│   │   ├── profile/
│   │   │   └── ProfileForm.tsx         # Profilbearbeitungsformular (useActionState)
│   │   └── ui/                         # shadcn/ui Komponenten (auto-generiert)
│   │       └── avatar, button, card, input, label, scroll-area, separator, ...
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── auth.ts                 # Server Actions: signUp, signIn, signOut
│   │   │   ├── chat.ts                 # Server Actions: sendMessage, createDirectChat,
│   │   │   │                           #   createGroupChat, addChatMember, removeChatMember,
│   │   │   │                           #   sendFileMessage
│   │   │   └── profile.ts              # Server Action: updateProfile
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser-seitiger Supabase-Client
│   │   │   ├── server.ts               # Server-seitiger Supabase-Client (Cookie-Kontext)
│   │   │   └── types.ts                # TypeScript-Typen (Datenbankschema)
│   │   ├── validations.ts              # Alle Zod-Schemas
│   │   └── utils.ts                    # cn() Hilfsfunktion (clsx + tailwind-merge)
│   └── middleware.ts                   # Route Guard: Auth-Schutz für alle nicht-statischen Routen
├── supabase/
│   └── schema.sql                      # Vollständiges Datenbankschema mit RLS + Triggern
├── public/                             # Statische Assets
├── components.json                     # shadcn/ui Konfiguration
├── next.config.ts
└── package.json
```

---

## 🗄️ Datenbankschema

Alle Entitäten verwenden **UUIDs** als Primary Keys. Das vollständige Schema liegt in [`supabase/schema.sql`](./supabase/schema.sql).

### Tabellen

```
auth.users                         (Supabase-intern – verwaltet Authentifizierung)
  └── id: UUID (PK)
  └── email, password, ...

profiles                           (Öffentliche Nutzerdaten)
  └── id: UUID (PK, FK → auth.users, CASCADE DELETE)
  └── username: TEXT (UNIQUE, NOT NULL)
  └── display_name: TEXT
  └── avatar_url: TEXT
  └── status: TEXT                 (Statusnachricht, max. 120 Zeichen)
  └── created_at, updated_at: TIMESTAMPTZ

chats
  └── id: UUID (PK)
  └── name: TEXT                   (NULL bei DMs, gesetzt bei Gruppen)
  └── is_group: BOOLEAN
  └── created_by: UUID (FK → profiles, SET NULL bei Löschung)
  └── created_at: TIMESTAMPTZ

chat_members
  └── chat_id: UUID (FK → chats, CASCADE)
  └── user_id: UUID (FK → profiles, CASCADE)
  └── role: TEXT ('admin' | 'member')
  └── joined_at: TIMESTAMPTZ
  [PK: (chat_id, user_id)]

messages
  └── id: UUID (PK)
  └── chat_id: UUID (FK → chats, CASCADE)
  └── sender_id: UUID (FK → profiles, SET NULL)
  └── content: TEXT (NOT NULL)
  └── is_deleted: BOOLEAN
  └── file_url: TEXT               (Storage-Pfad, optional)
  └── file_name: TEXT              (Originaldateiname, optional)
  └── file_type: TEXT              (MIME-Type, optional)
  └── file_size: INTEGER           (Bytes, optional)
  └── created_at, updated_at: TIMESTAMPTZ

locations                          (Live-Standortfreigabe)
  └── id: UUID (PK)
  └── user_id: UUID (FK → profiles, CASCADE)
  └── latitude, longitude: DOUBLE PRECISION
  └── accuracy: DOUBLE PRECISION   (GPS-Genauigkeit in Metern)
  └── is_sharing: BOOLEAN
  └── expires_at: TIMESTAMPTZ      (NULL = unbegrenzt)
  └── chat_id: UUID                (NULL = alle Kontakte, gesetzt = nur dieser Chat)
  └── updated_at: TIMESTAMPTZ
  [UNIQUE: (user_id, chat_id) NULLS NOT DISTINCT]
```

### Row Level Security (RLS)

Alle Tabellen sind mit RLS abgesichert. Keine Datenbankabfrage kann die Grenzen überschreiten:

| Tabelle | Regel |
|---|---|
| `profiles` | Alle können lesen, nur der eigene Eintrag darf bearbeitet werden |
| `chats` | Nur Chat-Mitglieder sehen ihre Chats |
| `chat_members` | Nur Mitglieder sehen die Mitgliederliste; nur Admins dürfen hinzufügen/entfernen |
| `messages` | Nur Chat-Mitglieder können lesen und schreiben |
| `locations` | Nur der eigene Eintrag darf geschrieben werden; sichtbar für Chat-Mitglieder gemäß `chat_id`-Scope |

Hilfsfunktionen `is_chat_member()` und `is_chat_admin()` (beide `SECURITY DEFINER`) verhindern RLS-Rekursion.

### PostgreSQL-Trigger & Funktionen

- **`handle_new_user()`**: Erstellt bei jedem Supabase-Auth-Signup automatisch ein `profiles`-Eintrag (liest `username` und `display_name` aus den User-Metadaten)
- **`update_updated_at_column()`**: Setzt `updated_at` bei jedem UPDATE auf `NOW()`

### Realtime

Sowohl `messages` als auch `locations` sind in der `supabase_realtime`-Publikation eingetragen.

---

## 🔒 Authentifizierung & Session-Management

- **Provider**: Supabase Auth (E-Mail + Passwort)
- **Session-Speicherung**: Cookies via `@supabase/ssr` (kein LocalStorage – funktioniert mit Server Components)
- **Route Guard**: `middleware.ts` prüft bei jedem Request den Session-Status und leitet um

### Auth-Flow

```
Registrierung → signUp() Server Action
  ├── Zod-Validierung (email, username, display_name, password, confirmPassword)
  ├── supabase.auth.signUp()              ← Erstellt Auth-User mit Metadaten
  └── PostgreSQL-Trigger handle_new_user  ← Erstellt automatisch profiles-Eintrag
  → Redirect zu /chat

Login → signIn() Server Action
  ├── Zod-Validierung
  └── supabase.auth.signInWithPassword()
  → Redirect zu /chat

Logout → signOut() Server Action
  └── supabase.auth.signOut()
  → Redirect zu /login
```

---

## 📝 Validierung mit Zod

Alle Eingaben werden **serverseitig** in Server Actions via Zod validiert (`src/lib/validations.ts`):

| Schema | Felder & Regeln |
|---|---|
| `signUpSchema` | email (gültig), username (3–30 Zeichen, `[a-zA-Z0-9_]`), display_name (1–50), password (min. 8), confirmPassword (muss gleich sein) |
| `signInSchema` | email, password (nicht leer) |
| `sendMessageSchema` | content (1–4000 Zeichen), chat_id (UUID) |
| `createChatSchema` | name (optional, max. 100), is_group (boolean), member_ids (Array von UUIDs, min. 1) |
| `updateProfileSchema` | username (3–30, alphanumerisch), display_name (1–50), status (max. 120, optional), avatar_url (gültige HTTP-URL, optional) |
| `sendFileMessageSchema` | chat_id (UUID), file_url (Pfad), file_name (max. 255), file_type (MIME), file_size (max. 20 MB) |

---

## 🔄 Datenfluss & Architektur

```
Browser                          Next.js Server                    Supabase
  │                                    │                               │
  │  GET /chat/[chatId]                │                               │
  │ ──────────────────────────────────►│                               │
  │                                    │  SELECT messages, members     │
  │                                    │ ─────────────────────────────►│
  │                                    │◄─────────────────────────────►│
  │◄──────────────────────────────────│                               │
  │  HTML (ChatContainer als Client   │                               │
  │  Component mit initialMessages)   │                               │
  │                                    │                               │
  │  Supabase Realtime WebSocket       │                               │
  │ ◄══════════════════════════════════════════════════════════════════│
  │  (neue Nachrichten & Standorte    │                               │
  │   kommen in Echtzeit an)          │                               │
  │                                    │                               │
  │  POST sendMessage (Server Action)  │                               │
  │ ──────────────────────────────────►│  INSERT INTO messages         │
  │                                    │ ─────────────────────────────►│
  │                                    │◄──────────────────────────────│
  │                                    │  revalidatePath()             │
  │◄──────────────────────────────────│                               │
```

**Hybridansatz**: Initiale Daten werden über Server Components geladen (schnell, kein Client-Fetch). Danach übernimmt `ChatContainer` als Client Component mit Supabase Realtime-Subscriptions für alle Live-Updates.

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

> Die Zugangsdaten bekommt ihr von Tim/Celina – oder unter [Supabase Dashboard](https://supabase.com/dashboard/project/gpdrvalixxggxhwocwgm) → **Settings › API**.

### 3. Datenbank einrichten

> [!NOTE]
> **Für das aktuelle Projekt `gpdrvalixxggxhwocwgm` ist die Datenbank bereits vollständig eingerichtet.** Dieser Schritt ist nur bei einer Neuinstallation nötig.

Für eine Neuinstallation: Supabase Dashboard → **SQL Editor** → Inhalt von `supabase/schema.sql` ausführen.

Das Skript erstellt alle Tabellen (`profiles`, `chats`, `chat_members`, `messages`, `locations`), RLS-Policies, Indizes, Trigger und aktiviert Realtime.

### 4. Supabase Storage einrichten

Im Supabase Dashboard unter **Storage**: Bucket `chat-files` anlegen (privat). RLS-Policies für authentifizierte Nutzer einrichten.

### 5. Supabase Auth konfigurieren

Im Supabase Dashboard unter **Authentication › Settings**:
- **Site URL**: `http://localhost:3000` (lokal) / `https://chat-dings.vercel.app` (Produktion)
- **Redirect URLs**: `http://localhost:3000/**` und `https://chat-dings.vercel.app/**`
- E-Mail-Bestätigung für Entwicklung deaktivieren: *Authentication › Providers › Email › Confirm email: **OFF***

### 6. Entwicklungsserver starten

```bash
npm run dev
```

App läuft unter: **http://localhost:3000**

---

## 🛠️ Nützliche Befehle

```bash
# Abhängigkeiten installieren
npm install

# Dev-Server starten (mit Hot Reload)
npm run dev

# Produktionsbuild erstellen
npm run build

# TypeScript-Typen prüfen (ohne Build)
npx tsc --noEmit

# Linter ausführen
npm run lint
```

---

## 📖 Projektgeschichte (Git History)

Das Projekt wurde iterativ in Feature-Branches entwickelt und via Pull Requests in `main` gemergt:

| Branch / Commit | Autor | Feature |
|---|---|---|
| `feat: initial commit` | Tim Lachmann | Next.js Messenger-Boilerplate (Auth, DMs, Nachrichten, RLS) |
| `feat: use database trigger` | Tim Lachmann | Automatische Profilerstellung via `handle_new_user`-Trigger |
| `security: update RLS policies` | Tim Lachmann | Moderne Supabase RLS-Patterns (TO authenticated, WITH CHECK) |
| `Gruppenchats(Tim)` | Tim Lachmann | Vollständige Gruppen-Chat-Erstellung + Mitgliederverwaltung (admin/member-Rollen) |
| `TL_chatNamen` | Tim Lachmann | DM-Chats zeigen Namen des Chat-Partners statt „Direkt-Chat" |
| `EJ_Live_Map` | Elias | Live-Standortfreigabe mit Leaflet-Karte, Echtzeit-Updates, Scoped Sharing (Chat vs. alle Kontakte), Ablauf-Timer |
| `CD_Profile_Page` | Celina | Profilseite (`/chat/profile`): Kontoname, Anzeigename, Status, Profilbild bearbeitbar |
| `ChatFileUpload` / `FileUpload2` | Lombartres | Datei-Upload via Supabase Storage, Bildvorschau mit Lightbox, Download-Card für andere Dateitypen, Scroll-Fix |

---

## 🔮 Mögliche Erweiterungen

- **Supabase Storage** direkt für Profilbilder (statt URL-Eingabe)
- **Nachrichten bearbeiten/löschen** (`is_deleted`-Flag + `UPDATE`-Policy bereits vorhanden)
- **Read Receipts** (Lesen-Bestätigungen)
- **Push-Benachrichtigungen** via Web Push API
- **Nutzersuche** in der Sidebar (UI-Placeholder bereits vorhanden)
- **Chatmitglieder verwalten** (Personen nachträglich hinzufügen/entfernen – Backend bereits implementiert via `addChatMember`/`removeChatMember`)
- **Nachrichtenreaktionen** (Emoji-Reactions)

---

*Hochschulprojekt – Next.js 16 · React 19 · Supabase · shadcn/ui · Zod · Leaflet*
