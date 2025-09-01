import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm/relations';

export const users = sqliteTable('users', {
  spotifyId: text('spotify_id').primaryKey(),
  displayName: text('display_name').notNull(),
  profileImageUrl: text('profile_image_url'),
  refreshToken: text('refresh_token'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const tracks = sqliteTable('tracks', {
  spotifyTrackId: text('spotify_track_id').primaryKey(),
  trackName: text('track_name').notNull(),
  artistName: text('artist_name').notNull(),
  albumName: text('album_name').notNull(),
  albumImageUrl: text('album_image_url').notNull(),
});

export const landmarks = sqliteTable('landmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  type: text('type'),
});

export const ashioto = sqliteTable('ashioto', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.spotifyId, { onDelete: 'cascade' }),
  trackId: text('track_id').notNull().references(() => tracks.spotifyTrackId, { onDelete: 'cascade' }),
  landmarkId: integer('landmark_id').notNull().references(() => landmarks.id, { onDelete: 'set null' }),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull(),
  comment: text('comment'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true).notNull(),
});

export const ashiotoRelations = relations(ashioto, ({ one }) => ({
  user: one(users, {
    fields: [ashioto.userId],
    references: [users.spotifyId],
  }),
  track: one(tracks, {
    fields: [ashioto.trackId],
    references: [tracks.spotifyTrackId],
  }),
  landmark: one(landmarks, {
    fields: [ashioto.landmarkId],
    references: [landmarks.id],
  }),
}));
