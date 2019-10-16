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
mongoose.connect('mongodb://localhost/restaurants', {
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

//writing a schema to hold the date of last update from Seattle
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
//testing insertion
let sampleDate = new Date("2019-06-01T00:00:00.000");
// const sampleRest = new Testrestaurant({
//   business_legal_name:"ABACUS HOSPITALITY LLC",
//   trade_name:"FRESH TASTE CAFE",
//   ownership_type:"LLC - Single Member",
//   naics_code:"722513",
//   "naics_description":"Limited-Service Restaurants",
//   license_start_date: sampleDate,
//   street_address:"700 STEWART ST",
//   city_state_zip:"SEATTLE",
//   state:"WA",
//   zip:"98101",
//   business_phone:"360-553-3087",
//   city_account_number:"0008291010752342",
//   ubi:"603416636"
// });
// sampleRest.save(function (err) {
//   if (err) return handleError(err);
// });



//Write a generalized function for db queries
async function dbQuery(model, query = {}, message = false) {
  if (message) console.log("message:", message);
  let dbReturn = await model.find(query, function(err, restaurants){
    return restaurants;
  })
  console.log("Count:", dbReturn.length);
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
//calling the function


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
  let query = await dbQuery(Restaurant, {lat: ""});
  console.log("HOPING FOR ZERO UNENCODED ENTRIES:", query);
}
//running function
testWrapper()
.catch(function(err){
  console.log("I'm an error log in testWapper's catch", err);
});

//Testing on sample data.
//sample data for batch insertion.
const sampleDataArray = [
  {"business_legal_name":"ABACUS HOSPITALITY LLC","trade_name":"FRESH TASTE CAFE","ownership_type":"LLC - Single Member","naics_code":"722513","naics_description":"Limited-Service Restaurants","license_start_date":"2019-06-01T00:00:00.000","street_address":"700 STEWART ST","city_state_zip":"SEATTLE","state":"WA","zip":"98101","business_phone":"360-553-3087","city_account_number":"0008291010752342","ubi":"603416636"},
  {"business_legal_name":"CRAB POT RESTAURANTS INC","trade_name":"THE CRAB POT","ownership_type":"Corporation","naics_code":"722511","naics_description":"Full-Service Restaurants","license_start_date":"2019-01-01T00:00:00.000","street_address":"1301 ALASKAN WAY","city_state_zip":"SEATTLE","state":"WA","zip":"98101","business_phone":"206-623-8600","city_account_number":"0008308990745210","ubi":"6042822600010001"},
  {"business_legal_name":"PREMIER MEAT PIES LLC","trade_name":"PREMIER MEAT PIES LLC","ownership_type":"LLC - Multi Member","naics_code":"722513","naics_description":"Limited-Service Restaurants","license_start_date":"2018-11-01T00:00:00.000","street_address":"1001 ALASKAN WAY # 105","city_state_zip":"SEATTLE","state":"WA","zip":"98101","business_phone":"206-619-0499","city_account_number":"0007842320744027","ubi":"603512468"},
  {"business_legal_name":"SAI RESTAURANTS ENTERPRISE INC","trade_name":"ZAIKA RESTAURANT AND LOUNGE","ownership_type":"Corporation","naics_code":"722511","naics_description":"Full-Service Restaurants","license_start_date":"2019-09-11T00:00:00.000","street_address":"1100 PIKE ST","city_state_zip":"SEATTLE","state":"WA","zip":"98101","business_phone":"206-499-4949","city_account_number":"0007312120755875","ubi":"6030512120010002"},
  {"business_legal_name":"SCHWARTZ BROTHERS RESTAURANTS","trade_name":"DANIELS BROILER DOWNTOWN SEATTLE","ownership_type":"General Partnership","naics_code":"722511","naics_description":"Full-Service Restaurants","license_start_date":"2018-12-01T00:00:00.000","street_address":"808 HOWELL ST #200","city_state_zip":"SEATTLE","state":"WA","zip":"98101","business_phone":"425-455-3948","city_account_number":"0005724290742676","ubi":"6024090030010016"},
  {"business_legal_name":"WASHINGTON TAPROOMS LLC","trade_name":"LOCUST CIDER","ownership_type":"LLC - Multi Member","naics_code":"722511","naics_description":"Full-Service Restaurants","license_start_date":"2019-09-12T00:00:00.000","street_address":"1222 POST ALY","city_state_zip":"SEATTLE","state":"WA","zip":"98101","business_phone":"646-783-9267","city_account_number":"0008416520756455","ubi":"6044539810010001"}
];

//update the 722513 records to be more than one year old
async function makeSomeOld() {
  let allRecords = await getSampleOutput(Testrestaurant);
  console.log("allRecords:", allRecords);
  async function transform(entries) {
    entries.forEach(async function(entry) {
      if (entry.naics_code === '722513'){
        entry.license_start_date.setFullYear(entry.license_start_date.getFullYear() - 1);
        await entry.markModified('license_start_date');
        await entry.save();
      }
    })
    let changeFiles = await getSampleOutput(Testrestaurant, {naics_code: '722513'});
    return changeFiles;
    // console.log("MODIFIED FILES:", changeFiles);
  }
  await transform(allRecords);
  let oldRecords = await getSampleOutput(Testrestaurant, {naics_code: '722513'}, "If these have old dates, you win.");
  // await removeTestRestaurants();
  return oldRecords;
}

//Write a basic query that returns the contents of testrestaurants
async function getSampleOutput(model, query = {}, message = "No message passed") {
  console.log("message:", message);
  let rawResponse = await model.find(query, function(err, restaurants) {
    return restaurants;
  });
  console.log("response from getSampleOutput", rawResponse);
  console.log("Count:", rawResponse.length);
  return rawResponse;
};


//empty testrestaurants
async function removeTestRestaurants(){
  let response = await Testrestaurant.remove({});
  console.log("Records deleted:", response.deletedCount);
}

//Composite testing function
async function runTestCode() {
  mongoose.connect('mongodb://localhost/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
  });
  await insertRestaurant(sampleDataArray, Testrestaurant);
  let oldRecords = await makeSomeOld();
  await removeTestRestaurants();
  mongoose.connect('mongodb://localhost/restaurants', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
  });
  return oldRecords;
}

//run test code
// runTestCode()
// .catch(function(err){
//   console.log("I'm an error log in runTestCode's catch", err);
// });



//ROUTES
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
  // url +=limit;
  let response = await fetch(url, newInit);
  let parsedRes = await response.json();
  console.log("return count:", parsedRes.length)
  return parsedRes;
}

//take an instance of the restaurant model, get lat and long from geoencode API
async function geoEncode(restaurant) {
  console.log("Hit geoEncode");
  let address = restaurant.street_address + ", " + restaurant.city_state_zip + ", " + restaurant.state + ", " + restaurant.zip;
  console.log("address:", address);
  let url = geoApi.replace("SEARCH_STRING", address);
  let init = {};
  let headers = {
    "async": true,
    "crossDomain": true,
    "url": url,
    "method": "GET",
    // "format": "json"
  }
  init.headers = headers;
  try {
    let response = await fetch(url, init);
    let output = await response.json();
    console.log("this is the output log in geoEncode", output);
    return output;
  } catch(err){
    console.log("this log an error in geoEncode", err);
  }
}
//Function to try to match a search result to an instance
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
  // console.log("Return from addLatLong:", restaurant);
  return restaurant;
}

//Get all restaurants lacking geoEncoding, encode them, save.
async function encodeAll(){
  let unEncodedRests = await dbQuery(Restaurant, {lat: ""}, "getting unencoded restaurants");
  let counter = 0;
  let restsLength = unEncodedRests.length;
  // console.log("unEncodedRests", unEncodedRests);
  console.log("unEncodedRests.length:", unEncodedRests.length);
  console.log("unEncodedRests[0]", unEncodedRests[0]);
  // console.log("unEcodedRests[5]", unEncodedRests[5]);
    //Attempting to regulate calls via setInterval
    try {
      let promise = new Promise((resolve, reject) => {
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
            resolve("interval cleared.");
          };
        }, 1000);
      });
    } catch(err) {
      console.log("err in encodeAll", err);
    }

}

async function testGeoEncode() {
  let allRestaurants = await dbQuery(Restaurant, {}, "getting all restaurants");
  console.log("to be encoded:", allRestaurants[0]);
  let response = await geoEncode(allRestaurants[0]);
  console.log("Response from API:", response);
  let singleRes = await parseGeoResponse(allRestaurants[0], response);
  console.log("Matched response to be added to instance:", singleRes);
  if (singleRes) {
    console.log("lat / long to insert:", singleRes.lat, singleRes.lon)
    allRestaurants[0].lat = singleRes.lat;
    allRestaurants[0].markModified("lat");
    allRestaurants[0].long = singleRes.lon;
    allRestaurants[0].markModified("long");
    // await allRestaurants[0].markModified("long");
    await allRestaurants[0].save();
    console.log("What is allrestaurants[0]?", typeof allRestaurants[0])
    console.log("Item should now be updated", allRestaurants[0].lat, allRestaurants[0].long);
    let query = await dbQuery(Restaurant, {trade_name: allRestaurants[0].trade_name});
    console.log("Final Request from db - should have coords", query);
    return query;
  }
}

// testGeoEncode();

async function proveAPIWorks(){
  let url = geoApi.replace("SEARCH_STRING", "Empire%20State%20Building");
  console.log("url:", url);
  console.log("this log is in proveAPIWorks - typeof url", typeof url);
  let init = {};
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
    console.log("this is the output log in proveAPIWorks", output);
  } catch(err){
    console.log("this log an error in proveAPIWorks", err);
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
