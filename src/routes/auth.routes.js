// src/routes/auth.routes.js
import { Elysia } from 'elysia';
import { auth } from '../plugins/auth.js';
import { jsonResponse, createError } from '../lib/response.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })

  // 🔐 Login
  .post('/login', async ctx => {
    const { email, password } = ctx.body || {};
    if (!email || !password) return createError('Email et mot de passe requis', 400);

    const result = await auth.signInWithPassword({ email, password });

    if (result?.error) return createError(result.error, 401);
    return jsonResponse(result);
  })

  // 🆕 Register
  .post('/register', async ctx => {
    const { email, username, password } = ctx.body || {};
    if (!email || !username || !password)
      return createError('Email, nom d’utilisateur et mot de passe requis', 400);

    const result = await auth.createUser({
      email,
      username,
      password,
      autoConfirm: true, // 📩 mettre à false si tu veux activer la vérification email
    });

    if (result?.error) return createError(result.error, 400);
    return jsonResponse(result, 201);
  })

  // 📩 Vérification de l'email
  .get('/verify-email', async ctx => {
    const { token } = ctx.query;
    if (!token) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${ctx.env.FRONTEND_BASE_URL}/verify-email?error=token_missing`,
        },
      });
    }

    const result = await auth.verifyEmail(token);

    if (result?.error) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${ctx.env.FRONTEND_BASE_URL}/verify-email?error=${encodeURIComponent(result.error)}`,
        },
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${ctx.env.FRONTEND_BASE_URL}/verify-email?success=true`,
      },
    });
  })

  // 📩 Demande de reset password
  .post('/request-password-reset', async ctx => {
    const { email } = ctx.body || {};
    if (!email) return createError('Email requis', 400);

    const result = await auth.requestResetPassword(email);
    if (result?.error) return createError(result.error, 400);

    return jsonResponse({ message: 'E-mail de réinitialisation envoyé' });
  })

  // 🔑 Réinitialisation avec token
  .get('/reset-password', async ctx => {
    const { token } = ctx.query;
    if (!token) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${ctx.env.FRONTEND_BASE_URL}/reset-password?error=token_missing`,
        },
      });
    }

    // ✅ Redirige vers le frontend avec le token dans l'URL
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${ctx.env.FRONTEND_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`,
      },
    });
  })

  // 🔐 Routes protégées
  .guard(auth.guard(), app =>
    app
      .get('/me', async ctx => {
        return jsonResponse({ user: ctx.user, session: ctx.session });
      })

      .post('/logout', async ctx => {
        await auth.revokeSession(ctx.session.id);
        return jsonResponse({ message: 'Déconnecté avec succès' });
      })
  );
