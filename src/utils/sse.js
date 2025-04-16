export function createSSEStream(handler) {
  let controllerRef;
  let isClosed = false;

  return new ReadableStream({
    start(controller) {
      controllerRef = controller;

      const sendEvent = data => {
        if (isClosed) return;

        try {
          const json = JSON.stringify({ pub: data });
          controller.enqueue(`data: ${json}\n\n`);
          console.log('[SSE]', json);
        } catch (err) {
          console.error('[SSE enqueue error]', err);
          try {
            controller.error(err);
          } catch (e) {
            console.warn('[SSE] Impossible d’envoyer l’erreur, flux déjà fermé.');
          }
          isClosed = true;
        }
      };

      // 🟢 Connexion initiale
      sendEvent({ connect: { time: Date.now() } });

      // ❤️ Battement de cœur toutes les 25s pour éviter timeouts nginx/proxy
      const heartbeat = setInterval(() => {
        if (!isClosed) sendEvent({ heartbeat: Date.now() });
      }, 25000);

      // ⛓️ Appel de ton handler principal
      handler(sendEvent)
        .catch(err => {
          console.error('[SSE handler error]', err);
          sendEvent({ error: err.message || 'Erreur SSE interne' });
        })
        .finally(() => {
          if (!isClosed && !controller.locked) {
            controller.close();
            isClosed = true;
          }
          clearInterval(heartbeat);
          console.log('[SSE] Stream terminé proprement');
        });
    },

    cancel() {
      console.log('[SSE] Annulé par le client (déconnexion)');
      if (controllerRef && !controllerRef.locked && !isClosed) {
        controllerRef.close();
        isClosed = true;
      }
    },
  });
}
