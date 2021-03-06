//API endpoint: https://data.seattle.gov/resource/wnbq-64tb.json
//Odata v2 endpoint: https://data.seattle.gov/OData.svc/wnbq-64tb
//Odata v4 endpoint: https://data.seattle.gov/api/odata/v4/wnbq-64tb
//relevant naics codes: "722513", "722511", "722330" (food trucks - location may be unreliable)

//SAMPLE FUNCTIONING SODE REQUEST FOR FOOD TRUCKS IN SEATTLE OPENED WITHIN THE LAST YEAR:
//https://data.seattle.gov/resource/wnbq-64tb.json?naics_code=722330&city_state_zip=SEATTLE&$where=license_start_date>'2018-09-24T16:00:00'

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
const port = process.env.PORT;
const geoApi = process.env.GEO_API;
const dbLocation = process.env.DB_LOC;
const { URL } = require('url');
const utf8 = require('utf8');
const querystring = require('querystring')
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
//add the router
app.use(express.static(__dirname + '/view'));
//Store all HTML files in view folder.
app.use(express.static(__dirname + '/script'));
//Store all JS and CSS in Scripts folder.
app.use(express.static(__dirname + '/public'));
//Put css pages and static assets in public
app.use('/', router);
// app.listen(process.env.port || 3000);


//configure db;
mongoose.connect(dbLocation, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function(){
  console.log('hit open!  Thats good, right?');
});

//configure schema for restaurants
const Schema = mongoose.Schema;
const restaurantSchema = new Schema({
  business_legal_name: String,
  trade_name: String,
  ownership_type: String,
  naics_code: String,
  naics_description: String,
  license_start_date: Date,
  street_address: String,
  city_state_zip: String,
  state: String,
  zip: String,
  business_phone: String,
  city_account_number: String,
  ubi: String,
  lat: String,
  long: String
});
restaurantSchema.index({trade_name: 1, license_start_date: 1, zip: 1, ubi: 1});

//Configure schema to hold the date of last update from Seattle
const lastupdateSchema = new Schema ({
  updated: Date,
})
//TODO: consider writing a static model method to purge restaurants more than a year old.

//configure model
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
//writing a test model to practice.
const Testrestaurant = mongoose.model('Testrestaurant', restaurantSchema);
//writing model for last update
const Lastupdate = mongoose.model('Lastupdate', lastupdateSchema);


//ROUTES

router.get('/', function(req,res){
  res.sendFile(path.join(__dirname+'/index.html'));
  //__dirname : It will resolve to your project folder.
});

//Send to DOM a list of recently opened restaurants filtered by zipcode.
app.post('/', async function(req,res){
  let zip = false;
  let output = false;
  let address = false;
  let lastUpdate = await dbQuery(Lastupdate, {});
  lastUpdate = lastUpdate[0].updated;
  if (req.body.zip) zip = req.body.zip;
  if (req.body.address) address = req.body.address;
  if (zip) output = await dbQuery(Restaurant, {zip: zip})
  if (address) {
    let searchRes = await geoEncode(false, address);
    let userCoords;
    //TODO: Think of a better way to choose a search result?
    userCoords = (searchRes.length > 0) ? searchRes[0] : false;
    if (userCoords) output = await getRestaurantsByDistance(userCoords);

  }
  res.send(output);
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


//DATABASE FUNCTIONS

//Return a date object for previous years (defaults to one)
function oldDate(numOfYears = 1){
  let time = new Date();
  time.setMonth(time.getMonth() - 12 * numOfYears);
  return time;
}

//Write a generalized function for db queries
async function dbQuery(model, query = {}, message = false) {
  if (message) console.log("message:", message);
  let dbReturn = await model.find(query, function(err, restaurants){
    return restaurants;
  })
  console.log("db Query Count:", dbReturn.length);
  return dbReturn;
}

//insert an array of restaurants
async function insertRestaurant(data, collection) {
  console.log("insertRestaurant data:", data);
  if (data) {
    data.forEach(function(item){
      if (!item.lat) item.lat = "";
      if (!item.long) item.long = "";
    })
    let response = await collection.create(data, function(err, data){ console.log("I'm an error log in the create method", err)});
    if (response) console.log("Think it worked!");
    return response;
  }
}

//Write a function to populate db
async function callSeattle() {
  let response;
  let now = new Date();
  let updateReturn = await dbQuery(Lastupdate, {}, "requesting lastupdate data");
  let updateNeeded = false;
  let firstUpdate = false;
  if (updateReturn.length < 1) {
    updateNeeded = true;
    firstUpdate = true;
  } else {
    if (now.getTime() - updateReturn[0].updated.getTime() > 86400000 / 2 ) {
      updateNeeded = true;
    }
  }
  if (updateNeeded && firstUpdate) {
    response = await sodaCall();
  }
  if (updateNeeded && !firstUpdate){
    response = await sodaCall(false, updateReturn[0].updated);
    removeDupes();
  }

  await insertRestaurant(response, Restaurant);
  let dbReturn = await dbQuery(Restaurant, {}, "Trying to get All restaurants");
  if (firstUpdate && response) {
    let update = new Lastupdate({
      updated: now,
    });
    update.save();
  } else if (updateNeeded && response){
    updateReturn[0].updated = now;
    updateReturn[0].markModified("updated");
    updateReturn[0].save();
  } else {
    console.log("database did not update.")
  }
  console.log("db length:", dbReturn.length);
  return dbReturn;
}

//Return a list of restaurants sorted by distance from user coordinates
async function getRestaurantsByDistance(locationObj, years = 1){
  console.log("locationObj:", locationObj);
  const newBusinessDate = oldDate(years);
  const allRestaurants = await dbQuery(Restaurant, {license_start_date: { $gte: newBusinessDate }});
  let outputArray = [];
  allRestaurants.forEach(function(restaurant) {
    let distance = calcDistanceInKm(restaurant, locationObj)
    let restObj = {
      'restaurant': restaurant,
      'distance': distance,
    }
    outputArray.push(restObj);
  });
  outputArray.sort((a, b) => a.distance - b.distance);
  // console.log(outputArray);
  return outputArray;
}

//remove duplicate entries from the database
async function removeDupes() {
  let ubiHash = {}
  let dbReturn = await dbQuery(Restaurant, {}, "Trying to get All restaurants");
  dbReturn.forEach(function(restaurant) {
    ubiHash[restaurant.ubi] = (ubiHash[restaurant.ubi]) ? ubiHash[restaurant.ubi] + 1 : 1;
  })
  for (let [key, value] of Object.entries(ubiHash)) {
    for (let i = 0; i < value -1; i++) {
      await Restaurant.deleteOne({ubi: key});
    }
  }
  console.log("Dupes hash:", ubiHash);
  return ubiHash;
}


//API CALL FUNCTIONS

//Query open database for restaurant data
async function sodaCall(zipcode=false, lastUpdate = false) {
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
    'limit': '10000',
  }
  let url = "https://data.seattle.gov/resource/wnbq-64tb.json";
  let naics = "?$where=(naics_code == '722513' OR naics_code == '722530' OR naics_code == '722511')";
  let time;
  if (lastUpdate) {
    time = lastUpdate;
  } else {
    time = new Date();
    time.setMonth(time.getMonth() - 12);
  }
  let zip = zipcode;
  let limit = "$limit=10000";
  url += naics;
  url += ` AND license_start_date>'${time.toISOString().slice(0, time.toISOString().length -1)}'`;
  if (zip) url += ` AND zip == '${zip}'`;
  let response = await fetch(url, newInit);
  let parsedRes = await response.json();
  console.log("return count:", parsedRes.length)
  return parsedRes;
}

/*Take either a restaurant instance as a first param, or a string as a second param
and return search results with lat and long from an api.*/
async function geoEncode(restaurant = false, string = false) {
  let address;
  address = (string) ? string : querystring.escape(`${restaurant.street_address}, ${restaurant.city_state_zip}, ${restaurant.state}, ${restaurant.zip}`);
  let url = await geoApi.replace("SEARCH_STRING", address);
  url = utf8.encode(url);
  url = url.trim();
  let encodedURL = new URL(url);
  let init = {};
  let headers = {
    "async": true,
    "crossDomain": true,
    "method": "GET",
    "Host": "us1.locationiq.com",
  }
  init.headers = headers;
  try {
    let response = await fetch(encodedURL.href, init);
    let output = await response.json();
    return output;
  } catch(err){
    console.log("this log an error in geoEncode", err);
  }
}

//Match a geoencoding search result to a restaurant instance
/* TODO: Add a second filter to look for 'washington' in display_name if
matching name fails...I've gotten my first encoded result in south africa.*/

async function parseGeoResponse(instance, geoArray){
  if (geoArray.length == 0) return false;
  let name = instance.trade_name.toLowerCase()
  let target = false;
  geoArray.forEach(function(item){
    let displayName = item.display_name.toLowerCase();
    if (displayName.includes(name)) target = item;
  })
  return (target) ? target : geoArray[0];
}

//Add the lat and long from a search result to a restaurant instance
async function addLatLong(restaurant, singleResult) {
  restaurant.lat = singleResult.lat;
  await restaurant.markModified("lat");
  restaurant.long = singleResult.lon;
  await restaurant.markModified("long");
  await restaurant.save();
  return restaurant;
}

//Get all restaurants lacking geoEncoding from DB, encode them, save.
async function encodeAll(){
  let unEncodedRests = await dbQuery(Restaurant, {lat: ""}, "getting unencoded restaurants");
  let counter = 0;
  let restsLength = unEncodedRests.length;
  console.log("unEncodedRests.length:", unEncodedRests.length);
    //Attempting to regulate calls via setInterval
    try {
      let promise = new Promise((resolve, reject) => {
        if (restsLength != 0) {
          const interval = setInterval(async function() {
            console.log("in the interval. Counter is: ", counter);
            let thisRest = unEncodedRests[counter];
            console.log("thisRest:", thisRest.trade_name);
            let searchRes = await geoEncode(thisRest);
            console.log("SearchRes:", searchRes);
            let geoObj = await parseGeoResponse(thisRest, searchRes);
            let encodedRest = await addLatLong(thisRest, geoObj);
            console.log("encoded lat / long:", encodedRest.lat, encodedRest.long);
            ++counter;
            if (counter >= restsLength - 1) {
              clearInterval(interval);
            };
          }, 1000);
        };
        resolve("Promise resolved.");
      });
    } catch(err) {
      console.log("err in encodeAll", err);
    }

}

//FUNCTIONS TO COMPUTE DISTANCE
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function calcDistanceInKm(address1, address2) {
  const earthRadiusKm = 6371;

  let dLat = degreesToRadians(address2.lat - address1.lat);
  let dLon;
  //TODO: Fix this formatting.  Somehow.
  if (address2.long) {
    dLon = degreesToRadians(address2.long - address1.long);
  } else {
    dLon = degreesToRadians(address2.lon - address1.long);
  }

  let lat1 = degreesToRadians(address1.lat);
  let lat2 = degreesToRadians(address2.lat);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return earthRadiusKm * c;
}

async function testDistance() {
  let testQuery = await dbQuery(Restaurant, {});
  let result = calcDistanceInKm(testQuery[0], testQuery[1]);
  console.log("distance calc:", result);
}
//MANAGE STARTUP FUNCTION EXECUTIONS

//wrapper function for testing async functions on launch
async function testWrapper() {
  await callSeattle()
  .catch(function(err){
    console.log("I'm an error log in callSeattle's catch", err);
  });
  await encodeAll()
  .catch(function(err){
    console.log("I'm an error log in endcodeAll's catch", err);
  });
}

//running function
testWrapper()
.catch(function(err){
  console.log("I'm an error log in testWapper's catch", err);
});

removeDupes();
