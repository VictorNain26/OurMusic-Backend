import { Elysia } from 'elysia';
import * as trackService from '../services/trackService.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .post('/like', async ({ body, headers }) => trackService.likeTrack({ json: async () => body, headers }))
  .get('/like', async ({ headers, request }) => trackService.getLikedTracks(request, headers))
  .delete('/like/:id', async ({ params, request, headers }) => {
    request.url += `/${params.id}`;
    return trackService.unlikeTrack(request, headers);
  });