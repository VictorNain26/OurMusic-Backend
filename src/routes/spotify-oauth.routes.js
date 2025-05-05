// src/routes/spotify-oauth.routes.js
import { Elysia } from 'elysia';
import { getSpotifyAuthorizeURL, exchangeCodeForToken } from '../services/spotifyOauthService.js';
import { auth } from '../lib/auth/index.js';
import { db } from '../db/index.js';
import { account } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

export const spotifyOauthRoutes = new Elysia({ prefix: '/api/spotify' })
  .macro({
    auth: {
      async resolve({ error, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return error(401);
        return { user: session.user, session: session.session };
      },
    },
  })

  // 🔗 Étape 1 : récupérer l’URL d’auth Spotify
  .get(
    '/authorize',
    ({ user }) => {
      const state = user.id; // sécurise contre CSRF si besoin
      const url = getSpotifyAuthorizeURL(state);
      return { url };
    },
    { auth: true }
  )

  // 🔁 Étape 2 : traitement du callback avec le code
  .get('/callback', async ({ query }) => {
    const { code, state } = query;
    if (!code || !state) return { status: 400, error: 'Code ou état manquant' };

    const tokenData = await exchangeCodeForToken(code);
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!refresh_token) return { status: 400, error: 'refresh_token manquant' };

    // Vérifie si l’entrée Spotify existe déjà
    const existing = await db.query.account.findFirst({
      where: and(eq(account.userId, state), eq(account.providerId, 'spotify')),
    });

    const now = new Date();
    const expiryDate = new Date(now.getTime() + expires_in * 1000);

    if (existing) {
      await db
        .update(account)
        .set({
          accessToken: access_token,
          refreshToken: refresh_token,
          accessTokenExpiresAt: expiryDate,
          updatedAt: now,
        })
        .where(eq(account.id, existing.id));
    } else {
      await db.insert(account).values({
        id: randomUUID(),
        userId: state,
        providerId: 'spotify',
        accountId: 'spotify_user', // ou null, on peut le mettre à jour plus tard
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenExpiresAt: expiryDate,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Redirige vers le frontend (succès)
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${env.FRONTEND_BASE_URL}?spotify_linked=success`,
      },
    });
  });
