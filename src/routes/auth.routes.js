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
      return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
  })

  .post('/login', async ({ body, jwt, cookie }) => {
    try {
      const user = await loginUser(body);
      const accessToken = await jwt.sign({ id: user.id, role: user.role });
      const refreshToken = await jwt.sign({ id: user.id, role: user.role, exp: '7d' });

      cookie.set('refresh', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return { message: 'Connexion réussie', accessToken, user };
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 401 });
    }
  })

  .post('/refresh', async ({ jwt, cookie }) => {
    const token = cookie.get('refresh');
    if (!token) return new Response(JSON.stringify({ error: 'Token manquant' }), { status: 401 });

    try {
      const decoded = await jwt.verify(token);
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .then(r => r[0]);
      if (!user) throw new Error('Utilisateur introuvable');
      const accessToken = await jwt.sign({ id: user.id, role: user.role });
      return { accessToken };
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Refresh token invalide' }), { status: 401 });
    }
  })

  .get('/me', async ({ jwt, headers }) => {
    const auth = headers['authorization'] || '';
    if (!auth.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });

    try {
      const decoded = await jwt.verify(auth.replace('Bearer ', '').trim());
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .then(r => r[0]);
      if (!user) throw new Error('Utilisateur introuvable');
      return user;
    } catch {
      return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401 });
    }
  })

  .post('/logout', ({ cookie }) => {
    cookie.remove('refresh');
    return { message: 'Déconnexion réussie' };
  });
