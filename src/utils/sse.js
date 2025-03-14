export function createSSEStream(handler) {
  return new ReadableStream({
    async start(controller) {
      const sendEvent = data => {
        controller.enqueue(`data: ${JSON.stringify({ pub: data })}\n\n`);
      };

      controller.enqueue(`data: ${JSON.stringify({ connect: { time: Date.now() } })}\n\n`);

      const heartbeat = setInterval(() => {
        sendEvent({ heartbeat: Date.now() });
      }, 30000);

      try {
        await handler(sendEvent);
      } catch (error) {
        console.error('[SSE Handler Error]', error);
        sendEvent({ error: error.message || 'Erreur SSE interne' });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });
}
