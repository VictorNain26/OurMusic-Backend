// src/db/schema.js
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// 🧑 Table utilisateurs (Better Auth + custom)
export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(), // ✅ ajout pour audit
});

// 💖 Table morceaux likés
export const likedTracks = pgTable(
  'liked_tracks',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    artwork: text('artwork').notNull(),
    youtubeUrl: text('youtube_url').notNull(),
    userId: integer('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
  },
  table => ({
    uniqueLike: unique('unique_user_track').on(table.userId, table.artist, table.title), // ✅ empêche les doublons
  })
);

// 🔐 Sessions (Better Auth)
export const session = pgTable(
  'session',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
  },
  table => ({
    userIdIndex: index('session_user_id_idx').on(table.userId), // ✅ pour lookup rapide
  })
);

// 🔗 Comptes externes (OAuth)
export const account = pgTable(
  'account',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => user.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 64 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 64 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
  },
  table => ({
    providerAccountUnique: unique('provider_account_unique').on(
      table.provider,
      table.providerAccountId
    ), // ✅ sécurité multi-comptes
  })
);

// 📧 Vérifications email & reset password
export const verification = pgTable(
  'verification',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  table => ({
    tokenUnique: unique('verification_token_unique').on(table.token), // ✅ empêche collision
    expiresIndex: index('verification_expires_idx').on(table.expiresAt), // ✅ pour nettoyage automatique
  })
);
