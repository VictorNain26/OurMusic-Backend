export const sendSSE = async (request, handlerFn) => {
  const stream = new ReadableStream({
    start(controller) {
      const send = data => {
        try {
          const payload = `data: ${JSON.stringify({ pub: data })}\n\n`;
          controller.enqueue(new TextEncoder().encode(payload));
        } catch (err) {
          console.error('[sendSSE → enqueue failed]', err);
        }
      };

      Promise.resolve()
        .then(() => handlerFn(send))
        .then(() => {
          controller.close();
        })
        .catch(err => {
          console.error('[sendSSE → handler error]', err);
          send({ message: '❌ Une erreur est survenue.', error: err.message });
          controller.close();
        });
    },

    cancel() {
      console.info('[sendSSE] Fermeture de la connexion.');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
