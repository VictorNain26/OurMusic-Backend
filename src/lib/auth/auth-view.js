import { auth } from './auth.js';

const betterAuthView = context => {
  const BETTER_AUTH_ACCEPT_METHODS = ['POST', 'GET'];

  if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
    return auth.handler(context.request);
  } else {
    context.error(405);
  }
};

export default betterAuthView;
