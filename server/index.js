require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Todo API is running' });
});
 
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});