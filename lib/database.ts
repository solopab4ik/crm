import { getDatabase } from '@netlify/database';

// Keep the existing parameterized query interface while using durable Postgres.
function postgresQuery(sql: string) {
  let index = 0;
  const ignore = /^INSERT OR IGNORE /i.test(sql);
  const query = sql.replace(/^INSERT OR IGNORE /i, 'INSERT ')
    .replace(/\?/g, () => `$${++index}`)
    .replace(/\bLIKE\b/g, 'ILIKE');
  return ignore ? `${query} ON CONFLICT DO NOTHING` : query;
}

class Statement {
  constructor(readonly sql: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.sql, values); }
  async all() {
    const result = await getDatabase().pool.query(postgresQuery(this.sql), this.values);
    return { results: result.rows };
  }
  async first<T = Record<string, unknown>>() {
    const { results } = await this.all();
    return (results[0] as T | undefined) ?? null;
  }
  async run() { return this.all(); }
}

const database = {
  prepare(sql: string) { return new Statement(sql); },
  async batch(statements: Statement[]) {
    const client = await getDatabase().pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const statement of statements) {
        results.push(await client.query(postgresQuery(statement.sql), statement.values));
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

export const db = () => database;
