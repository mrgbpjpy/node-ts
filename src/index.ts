import express from 'express';

const app = express();

console.log(process.env.PORT)
app.get('/ping', (req, res) => {
  res.send('pong');
});
