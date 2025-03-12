// src/db/schema.js
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('user'),
});

export const likedTracks = pgTable('liked_tracks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  artwork: text('artwork').notNull(),
  youtubeUrl: text('youtube_url').notNull(),
  userId: serial('user_id').references(() => users.id),
});
