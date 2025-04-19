import { runCommand } from './fileUtils.js';
import { createCookieFile } from '../spotify.js';

export async function runCommandWithRetry(cmd, sendEvent) {
  try {
    return await runCommand(cmd);
  } catch (err) {
    const isYoutubeError =
      err.message.includes('confirm you’re not a bot') ||
      err.message.includes('Sign in') ||
      err.message.includes('cookies') ||
      err.message.includes('429');

    if (!isYoutubeError) throw err;

    sendEvent?.({ message: '🔁 Erreur liée à YouTube — régénération du cookie...' });

    try {
      await createCookieFile(sendEvent);
    } catch (e) {
      sendEvent?.({ error: '❌ Impossible de régénérer le cookie YouTube.' });
      throw e;
    }

    sendEvent?.({ message: '🧪 Nouvelle tentative après cookie...' });

    const cmdWithProxy = [...cmd, '--proxy', 'https://us.smartproxy.com:10000'];

    try {
      return await runCommand(cmdWithProxy);
    } catch (errFinal) {
      sendEvent?.({ error: '❌ Commande échouée après régénération du cookie.' });
      throw errFinal;
    }
  }
}
