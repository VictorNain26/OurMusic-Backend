import { pgTable, serial, text, timestamp, integer, varchar } from 'drizzle-orm/pg-core';

/**
 * ✅ Utilisateur unique (Better Auth + application)
 */
export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * 💾 Table des morceaux likés (relation sur user.id)
 */
export const likedTracks = pgTable('liked_tracks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  artwork: text('artwork').notNull(),
  youtubeUrl: text('youtube_url').notNull(),
  userId: integer('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
});

/**
 * 📦 Tables Better Auth (liées à user)
 */
export const session = pgTable('session', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
});

export const account = pgTable('account', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => user.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 64 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 64 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
});

export const verification = pgTable('verification', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});
