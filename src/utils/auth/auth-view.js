import { auth } from './auth.js';

const betterAuthView = context => {
  // Autorise POST, GET et OPTIONS
  const ACCEPTED = ['POST', 'GET', 'OPTIONS'];

  if (ACCEPTED.includes(context.request.method)) {
    // Si c'est une requête OPTIONS (preflight)
    if (context.request.method === 'OPTIONS') {
      context.set.status = 204; // No Content
      return new Response(null, { status: 204 });
    }

    // Pour GET et POST, on appelle le handler Better Auth
    return auth.handler(context.request);
  } else {
    context.set.status = 405;
    return new Response('Méthode non autorisée', { status: 405 });
  }
};

export default betterAuthView;
