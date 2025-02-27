import { Hono } from 'hono';
import { serve } from '@hono/node-server';
const PORT = process.env.PORT || 3003;

const app = new Hono();

app.get('/', (c) => {
  return c.json({ hello: 'world' });
});

app.get('/users/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ id, name: `User ${id}` });
});

app.post('/api/data', async (c) => {
  const data = await c.req.json();
  return c.json({ received: true, data });
});

serve({
  fetch: app.fetch,
  port: Number(PORT)
}, () => {
  console.log(`Hono server listening on port ${PORT}`);
});