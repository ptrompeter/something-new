const express = require('express');
const app = express();
const port = 3000;
const odata = require('odata');

//API endpoint: https://data.seattle.gov/resource/wnbq-64tb.json
//Odata v2 endpoint: https://data.seattle.gov/OData.svc/wnbq-64tb
//Odata v4 endpoint: https://data.seattle.gov/api/odata/v4/wnbq-64tb
//relevant naics codes: "722513", "722511"
const oHandler = odata.o("https://data.seattle.gov/OData.svc/wnbq-64tb", {
  headers: {
    'If-Match': '*'
  }
});

app.get('/', (request, response) => {
  response.send(newTest())
});

app.listen(port, (err) => {
  if (err) {
    return console.log('I guess there was an error.', err)
  }

  console.log(`server is listening on ${port}`)
});

async function newTest(){
  const response = await oHandler.get().query({$top: 3})
  return response;
}
// async function getRestaurants(){
//   // const response = await o(endpoint).get("OData.svc").query({$filter: `naics_code eq "722513"`});
//   const response = await o(endpoint).get("OData.svc").query({$top: 3});
//   return response;
// }
