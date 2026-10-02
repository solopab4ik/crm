// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const users=sqliteTable('users',{id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull().unique(),password:text('password').notNull(),role:text('role').notNull(),blocked:integer('blocked').notNull().default(0),created:text('created').notNull(),last_seen:text('last_seen')});
export const clients=sqliteTable('clients',{id:text('id').primaryKey(),user_id:text('user_id').unique().references(()=>users.id,{onDelete:'set null'}),name:text('name').notNull(),email:text('email').notNull(),phone:text('phone').notNull().default(''),company:text('company').notNull().default(''),status:text('status').notNull().default('NEW'),priority:text('priority').notNull().default('NORMAL'),created:text('created').notNull(),updated:text('updated').notNull()});
export const notes=sqliteTable('notes',{id:text('id').primaryKey(),client_id:text('client_id').notNull().references(()=>clients.id,{onDelete:'cascade'}),author:text('author').notNull(),body:text('body').notNull(),visible:integer('visible').notNull().default(0),created:text('created').notNull()});
export const sessions=sqliteTable('sessions',{id:text('id').primaryKey(),user_id:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),expires:integer('expires').notNull()});
export const logs=sqliteTable('logs',{id:text('id').primaryKey(),actor:text('actor').notNull(),action:text('action').notNull(),object:text('object').notNull(),created:text('created').notNull()});
export const settings=sqliteTable('settings',{id:text('id').primaryKey(),value:text('value').notNull()});
export const attempts=sqliteTable('attempts',{id:text('id').primaryKey(),count:integer('count').notNull(),until:integer('until').notNull()});
