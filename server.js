const express = require('express');
const app = express();
const port = 3000;

app.get('/', (request, response) => {
  response.send('Hey this express server is running.')
});

app.listen(port, (err) => {
  if (err) {
    return console.log('I guess there was an error.', err)
  }

  console.log(`server is listening on ${port}`)
});
