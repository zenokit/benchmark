import express from 'express';
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ hello: 'world' });
});

app.get('/users/:id', (req, res) => {
  const id = req.params.id;
  res.json({ id, name: `User ${id}` });
});

app.post('/api/data', (req, res) => {
  res.json({ received: true, data: req.body });
});

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});