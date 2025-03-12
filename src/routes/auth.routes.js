import { Elysia } from 'elysia';
import * as authService from '../services/authService.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/register', async ({ body, headers }) => authService.register({ json: async () => body, headers }))
  .post('/login', async ({ body, headers }) => authService.login({ json: async () => body, headers }))
  .post('/refresh', async ({ headers, request }) => authService.refresh(request, headers))
  .get('/me', async ({ headers, request }) => authService.me(request, headers))
  .post('/logout', async ({ headers }) => authService.logout({}, headers));