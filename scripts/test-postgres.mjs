import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const postgres = new PGlite();
await postgres.exec(await readFile(new URL('../netlify/database/migrations/001_create-crm/migration.sql', import.meta.url), 'utf8'));
const pool = {
  query: (sql, values = []) => postgres.query(sql, values),
  async connect() { return { query: this.query, release() {} }; },
};
globalThis.__crmTestDatabase = () => ({ pool });

function moduleUrl(source) {
  const code = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  } }).outputText;
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
const databaseUrl = moduleUrl((await readFile(new URL('../lib/database.ts', import.meta.url), 'utf8'))
  .replace("import { getDatabase } from '@netlify/database';", 'const getDatabase = globalThis.__crmTestDatabase;'));
const crmUrl = moduleUrl((await readFile(new URL('../lib/crm.ts', import.meta.url), 'utf8'))
  .replaceAll("'./database'", JSON.stringify(databaseUrl)));
const route = await import(moduleUrl((await readFile(new URL('../app/api/[[...path]]/route.ts', import.meta.url), 'utf8'))
  .replace("'../../../lib/crm'", JSON.stringify(crmUrl))));
const { db } = await import(databaseUrl);
await assert.rejects(db().batch([
  db().prepare('INSERT INTO settings VALUES (?,?)').bind('rollback-check', 'test'),
  db().prepare('INSERT INTO settings VALUES (?,?)').bind('rollback-check', 'duplicate'),
]));
assert.equal(await db().prepare('SELECT * FROM settings WHERE id=?').bind('rollback-check').first(), null);

const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const method = incoming.method;
    const request = new Request(`http://${incoming.headers.host}${incoming.url}`, {
      method, headers: incoming.headers,
      ...(['GET', 'HEAD'].includes(method) ? {} : { body: Buffer.concat(chunks) }),
    });
    const response = await route[method](request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
process.env.CRM_TEST_URL = `http://127.0.0.1:${server.address().port}`;
try {
  await import('./test-api.mjs');
  await db().prepare('INSERT INTO clients VALUES (?,NULL,?,?,?,?,?,?,?,?)')
    .bind('search-check', 'MixedCase Search', 'mixed@example.com', '', '', 'NEW', 'NORMAL', 'now', 'now').run();
  assert.equal((await db().prepare('SELECT id FROM clients WHERE name LIKE ?').bind('%mixedcase%').all()).results.length, 1);
  await db().prepare('INSERT INTO clients VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind('cascade-client', 'demo-employee', 'Cascade', 'cascade@example.com', '', '', 'NEW', 'NORMAL', 'now', 'now').run();
  await db().prepare('INSERT INTO notes VALUES (?,?,?,?,?,?)').bind('cascade-note', 'cascade-client', 'test', 'test', 0, 'now').run();
  await db().prepare('DELETE FROM users WHERE id=?').bind('demo-employee').run();
  assert.equal((await db().prepare('SELECT user_id FROM clients WHERE id=?').bind('cascade-client').first()).user_id, null);
  await db().prepare('DELETE FROM clients WHERE id=?').bind('cascade-client').run();
  assert.equal(await db().prepare('SELECT * FROM notes WHERE id=?').bind('cascade-note').first(), null);
  console.log('PASS: PostgreSQL migration, rollback, case-insensitive search and foreign keys');
  process.env.CRM_PUBLIC_URL = 'https://crm.example.test';
  try {
    const proxyLogin = await route.POST(new Request('http://internal.netlify/api/auth/login', {
      method: 'POST', headers: { Origin: process.env.CRM_PUBLIC_URL, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mini-crm.test', password: 'CrmDemo!2026' }),
    }));
    assert.equal(proxyLogin.status, 200);
    assert.match(proxyLogin.headers.get('set-cookie'), /Secure/);
    const rejectedOrigin = await route.POST(new Request('http://internal.netlify/api/auth/login', {
      method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mini-crm.test', password: 'CrmDemo!2026' }),
    }));
    assert.equal(rejectedOrigin.status, 403);
    console.log('PASS: trusted public origin behind proxy and Secure cookies');
  } finally { delete process.env.CRM_PUBLIC_URL; }
} finally {
  await new Promise(resolve => server.close(resolve));
  await postgres.close();
  delete globalThis.__crmTestDatabase;
}
