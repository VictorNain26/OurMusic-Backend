import { auth } from './auth.js';

const betterAuthView = async context => {
  console.log('=== betterAuthView CALLED ===', context.request.method, context.request.url);

  const BETTER_AUTH_ACCEPT_METHODS = ['POST', 'GET'];
  if (!BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
    context.error(405);
    return;
  }

  // Ajoute un log de debug pour voir ce que Better Auth renvoie
  const response = await auth.handler(context.request);
  console.log('=== Better Auth response ===', response);
  return response;
};

export default betterAuthView;
