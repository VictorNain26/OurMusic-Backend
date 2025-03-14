// src/routes/auth.routes.js
import { Elysia } from 'elysia';
import { registerUser, loginUser } from '../services/authService.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/register', async ({ body }) => {
    try {
      const user = await registerUser(body);
      return { message: 'Inscription réussie', user };
    } catch (err) {
      console.error('[Register Error]', err);
      return new Response(
        JSON.stringify({ error: "Échec de l'inscription. Veuillez réessayer." }),
        { status: 400 }
      );
    }
  })

  .post('/login', async ctx => {
    try {
      const user = await loginUser(ctx.body);
      const accessToken = await ctx.jwt.sign({ id: user.id, role: user.role });
      const refreshToken = await ctx.jwt.sign({ id: user.id, role: user.role, exp: '7d' });

      ctx.setCookie('refresh', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return { message: 'Connexion réussie', accessToken, user };
    } catch (err) {
      console.error('[Login Error]', err);
      return new Response(JSON.stringify({ error: 'Échec de la connexion. Veuillez réessayer.' }), {
        status: 401,
      });
    }
  })

  .post('/refresh', async ctx => {
    const token = ctx.cookie.get('refresh');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token manquant' }), { status: 401 });
    }

    try {
      const decoded = await ctx.jwt.verify(token);
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .then(r => r[0]);

      if (!user) throw new Error('Utilisateur introuvable');

      const accessToken = await ctx.jwt.sign({ id: user.id, role: user.role });
      return { accessToken };
    } catch (err) {
      console.error('[Refresh Token Error]', err);
      return new Response(JSON.stringify({ error: 'Refresh token invalide' }), { status: 401 });
    }
  })

  .get('/me', async ctx => {
    const auth = ctx.headers['authorization'] || '';
    if (!auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });
    }

    try {
      const decoded = await ctx.jwt.verify(auth.replace('Bearer ', '').trim());
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .then(r => r[0]);

      if (!user) throw new Error('Utilisateur introuvable');
      return user;
    } catch (err) {
      console.error('[Me Error]', err);
      return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401 });
    }
  })

  .post('/logout', ctx => {
    // ✅ Correction ici : ctx.removeCookie() au lieu de ctx.cookie.remove()
    ctx.removeCookie('refresh');
    return { message: 'Déconnexion réussie' };
  });
