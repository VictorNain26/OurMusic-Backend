export function createSSEStream(handler) {
  return new ReadableStream({
    start(controller) {
      const sendEvent = data => {
        try {
          const json = JSON.stringify({ pub: data });
          controller.enqueue(`data: ${json}\n\n`);
          console.log('[SSE]', json);
        } catch (err) {
          console.error('[SSE enqueue error]', err);
        }
      };

      // ✅ Envoi d’un événement de connexion immédiat
      sendEvent({ connect: { time: Date.now() } });

      const heartbeat = setInterval(() => {
        sendEvent({ heartbeat: Date.now() });
      }, 25000);

      // ⚠️ Pas d'`await` ici : on utilise `.then` pour ne pas sortir du scope
      handler(sendEvent)
        .catch(error => {
          console.error('[SSE Handler Error]', error);
          sendEvent({ error: error.message || 'Erreur SSE interne' });
        })
        .finally(() => {
          clearInterval(heartbeat);
          controller.close();
          console.log('[SSE] Stream fermé proprement');
        });
    },
  });
}
