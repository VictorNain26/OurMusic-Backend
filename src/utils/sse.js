export function createSSEStream(handler) {
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ connect: { time: Date.now() } })}\n\n`);
      const heartbeat = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ pub: { heartbeat: Date.now() } })}\n\n`);
      }, 30000);

      const sendEvent = data => controller.enqueue(`data: ${JSON.stringify({ pub: data })}\n\n`);

      try {
        await handler(sendEvent);
      } catch (e) {
        sendEvent({ error: e.message });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });
}
