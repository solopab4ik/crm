CREATE TABLE users (
  id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL,
  password text NOT NULL, role text NOT NULL,
  blocked integer NOT NULL DEFAULT 0,
  created text NOT NULL, last_seen text
);
CREATE TABLE clients (
  id text PRIMARY KEY,
  user_id text UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL, email text NOT NULL,
  phone text NOT NULL DEFAULT '', company text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'NEW', priority text NOT NULL DEFAULT 'NORMAL',
  created text NOT NULL, updated text NOT NULL
);
CREATE TABLE notes (
  id text PRIMARY KEY, client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author text NOT NULL, body text NOT NULL,
  visible integer NOT NULL DEFAULT 0, created text NOT NULL
);
CREATE TABLE sessions (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires bigint NOT NULL
);
CREATE TABLE logs (
  id text PRIMARY KEY, actor text NOT NULL, action text NOT NULL,
  object text NOT NULL, created text NOT NULL
);
CREATE TABLE settings (id text PRIMARY KEY, value text NOT NULL);
CREATE TABLE attempts (id text PRIMARY KEY, count integer NOT NULL, until bigint NOT NULL);
CREATE INDEX notes_client_id_idx ON notes(client_id);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_idx ON sessions(expires);
