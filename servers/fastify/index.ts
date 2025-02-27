import fastify from 'fastify';
const app = fastify({ logger: false });
const PORT = process.env.PORT || 3002;

app.get('/', async (request, reply) => {
  return { hello: 'world' };
});

app.get('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  return { id, name: `User ${id}` };
});

app.post('/api/data', async (request, reply) => {
  return { received: true, data: request.body };
});

const start = async () => {
  try {
    await app.listen({ port: Number(PORT) });
    console.log(`Fastify server listening on port ${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();