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
          controller.error(err); // ⛔ Stoppe le flux SSE côté client
        }
      };

      sendEvent({ connect: { time: Date.now() } });

      const heartbeat = setInterval(() => {
        sendEvent({ heartbeat: Date.now() });
      }, 25000);

      handler(sendEvent)
        .catch(err => {
          console.error('[SSE handler error]', err);
          sendEvent({ error: err.message || 'Erreur SSE interne' });
        })
        .finally(() => {
          clearInterval(heartbeat);
          if (!controller.locked) controller.close();
          console.log('[SSE] Stream fermé proprement');
        });
    },
  });
}
