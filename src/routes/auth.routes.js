import { Elysia } from 'elysia';
import * as authService from '../services/authService.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/register', ({ body, headers }) =>
    authService.register({ json: async () => body }, headers)
  )
  .post('/login', ({ body, headers }) => authService.login({ json: async () => body }, headers))
  .post('/refresh', ({ headers, request }) => authService.refresh(request, headers))
  .get('/me', ({ headers, request }) => authService.me(request, headers))
  .post('/logout', ({ headers }) => authService.logout({}, headers));
