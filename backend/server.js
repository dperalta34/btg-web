'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5500';

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['POST', 'OPTIONS'],
}));

app.use(express.json());
app.use('/api', uploadRouter);

app.listen(PORT, () => {
  console.log(`[BTG] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`[BTG] Origen permitido: ${ALLOWED_ORIGIN}`);
});
