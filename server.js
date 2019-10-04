//API endpoint: https://data.seattle.gov/resource/wnbq-64tb.json
//Odata v2 endpoint: https://data.seattle.gov/OData.svc/wnbq-64tb
//Odata v4 endpoint: https://data.seattle.gov/api/odata/v4/wnbq-64tb
//relevant naics codes: "722513", "722511", "722330" (food trucks - location may be unreliable)

//SAMPLE FUNCTIONING SODE REQUEST FOR FOOD TRUCKS IN SEATTLE OPENED WITHIN THE LAST YEAR:
//https://data.seattle.gov/resource/wnbq-64tb.json?naics_code=722330&city_state_zip=SEATTLE&$where=license_start_date>'2018-09-24T16:00:00'

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const odata = require('odata');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const router = express.Router();
dotenv.config();
const port = process.env.DEV_PORT;
const geoApi = process.env.GEO_API;
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
//add the router
app.use(express.static(__dirname + '/view'));
//Store all HTML files in view folder.
app.use(express.static(__dirname + '/script'));
//Store all JS and CSS in Scripts folder.
app.use('/', router);
// app.listen(process.env.port || 3000);

/*
example of restaurant data (for schema formatting):
{
  "business_legal_name":"ABACUS HOSPITALITY LLC",
  "trade_name":"FRESH TASTE CAFE",
  "ownership_type":"LLC - Single Member",
  "naics_code":"722513",
  "naics_description":"Limited-Service Restaurants",
  "license_start_date":"2019-06-01T00:00:00.000",
  "street_address":"700 STEWART ST",
  "city_state_zip":"SEATTLE",
  "state":"WA",
  "zip":"98101",
  "business_phone":"360-553-3087",
  "city_account_number":"0008291010752342",
  "ubi":"603416636"
}
*/

//configure db;
mongoose.connect('mongodb://localhost/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function(){
  console.log('hit open!  Thats good, right?');
});

//configure schema
const Schema = mongoose.Schema;
const restaurantSchema = new Schema({
  business_legal_name: String,
  trade_name: String,
  ownership_type: String,
  naics_code: String,
  naics_description: String,
  license_start_date: Date,
  street_address: String,
  city: String,
  state: String,
  zip: String,
  business_phone: String,
  city_account_number: String,
  ubi: String,
  lat: String,
  long: String
});
restaurantSchema.index({trade_name: 1, license_start_date: 1, zip: 1, ubi: 1});
//TODO: consider writing a static model method to purge restaurants more than a year old.

//configure model
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
//writing a test model to practice.
const Testrestaurant = mongoose.model('Testrestaurant', restaurantSchema);
//testing insertion
let sampleDate = new Date("2019-06-01T00:00:00.000");
const sampleRest = new Testrestaurant({
  business_legal_name:"ABACUS HOSPITALITY LLC",
  trade_name:"FRESH TASTE CAFE",
  ownership_type:"LLC - Single Member",
  naics_code:"722513",
  "naics_description":"Limited-Service Restaurants",
  license_start_date: sampleDate,
  street_address:"700 STEWART ST",
  city_state_zip:"SEATTLE",
  state:"WA",
  zip:"98101",
  business_phone:"360-553-3087",
  city_account_number:"0008291010752342",
  ubi:"603416636"
});

sampleRest.save(function (err) {
  if (err) return handleError(err);
});

router.get('/', function(req,res){
  res.sendFile(path.join(__dirname+'/index.html'));
  //__dirname : It will resolve to your project folder.
});

//Send to DOM a list of recently opened restaurants filtered by zipcode.
app.post('/', async function(req,res){
  let zip = false;
  let zipRestaurants = false;
  if (req.body.zip) zip = req.body.zip;
  zipRestaurants = await sodaCall(zip);
  res.send(zipRestaurants);
})

//render a main page.
app.get('/zip', async function(req,res){
  let zip = false;
  let zipRestaurants = false;
  if (req.query.zipbox) zip = req.query.zipbox;
  zipRestaurants = await sodaCall(zip);
  res.send(zipRestaurants);
})

app.listen(port, (err) => {
  if (err) {
    return console.log('I guess there was an error.', err)
  }

  console.log(`server is listening on ${port}`)
});

async function sodaCall(zipcode=false) {
  let newInit = {};
  let headers = {};
  headers['Accept-Encoding'] = 'gzip'
  newInit.method = 'GET';
  newInit.mode = 'cors';
  newInit.credentials = 'include';
  newInit.redirect = 'follow';
  newInit.headers = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Host': 'data.seattle.gov',
    'cache-control': 'no-cache',
  }
  let url = "https://data.seattle.gov/resource/wnbq-64tb.json";
  let naics = "?$where=(naics_code == '722513' OR naics_code == '722530' OR naics_code == '722511')";
  let time = new Date();
  time.setMonth(time.getMonth() - 12);
  let zip = zipcode;
  url += naics;
  url += ` AND license_start_date>'${time.toISOString().slice(0, time.toISOString().length -1)}'`;
  if (zip) url += ` AND zip == '${zip}'`;
  let response = await fetch(url, newInit);
  let parsedRes = await response.json();
  return parsedRes;
}
//
// async function encodeAddress(address){
//
// }

async function proveAPIWorks(){
  let url = geoApi.replace("SEARCH_STRING", "Empire%20State%20Building");
  console.log(typeof url);
  let init = {};
  console.log(url);
  let headers = {
    "async": true,
    "crossDomain": true,
    "url": url,
    "method": "GET"
  }
  init.headers = headers
  try {
    let response = await fetch(url, init);
    let output = await response.json();
    console.log(output);
  } catch(err){
    console.log(err);
  }

//
//   // $.ajax(settings).done(function (response) {
//   //   console.log(response);
//   // });
}

// proveAPIWorks();
/*
I'm keeping my homemade filter function for now (below), in case I decide to implement
a single daily call to the seattle API, then filter and serve requests myself.
*/
// async function getData(){
//   try {
//     const response = await oHandler.get().query();
//     const filteredArray = response.filter(item => item.naics_code == '722513' || item.naics_code == '722511');
//      let timeFilter = filteredArray.filter(function(item){
//        let startDate = new Date(item.license_start_date);
//        let now = new Date();
//        return (now.getTime() - startDate.getTime() < 86400000 * 365) ? true : false;
//      });
//     return timeFilter;
//   } catch(err){
//     console.log(err);
//   }
// }
