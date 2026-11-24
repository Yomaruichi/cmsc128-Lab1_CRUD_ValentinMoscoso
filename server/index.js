require('dotenv').config();

const express = require('express');

const cors = require('cors');

const requireAuth = require('./middleware/requireAuth');

const todosRouter = require('./routes/todos');

const listsRouter = require('./routes/lists');

const errorHandler = require('./middleware/errorHandler');

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Todo API is running' });
});

app.use('/api/todos', requireAuth, todosRouter);

app.use('/api/lists', requireAuth, listsRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
