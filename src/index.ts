import express from 'express';

const app = express();

// src/index.ts
app.get('/ping', (req, res) => {
  res.send('pong from my repo! hello world');
});

