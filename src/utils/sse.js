export function createSSEStream(handler) {
  return new ReadableStream({
    async start(controller) {
      const sendEvent = data => {
        const json = JSON.stringify({ pub: data });
        controller.enqueue(`data: ${json}\n\n`);
        console.log('[SSE]', json);
      };

      // ✅ Envoi d’un événement de connexion immédiat
      sendEvent({ connect: { time: Date.now() } });

      // ✅ Heartbeat toutes les 25s (plus sûr que 30s pour certains reverse proxies)
      const heartbeat = setInterval(() => {
        sendEvent({ heartbeat: Date.now() });
      }, 25000);

      try {
        await handler(sendEvent);
      } catch (error) {
        console.error('[SSE Handler Error]', error);
        sendEvent({ error: error.message || 'Erreur SSE interne' });
      } finally {
        clearInterval(heartbeat);
        controller.close();
        console.log('[SSE] Stream fermé proprement');
      }
    },
  });
}
