const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const krogerRoutes = require('./routes/kroger.routes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api/kroger', krogerRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
