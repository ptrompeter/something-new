const express = require('express');
const app = express();
const odata = require('odata');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');

const router = express.Router();
dotenv.config();
console.log(`Your port is ${process.env.DEV_PORT}`);
const port = process.env.DEV_PORT;
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
//add the router
app.use(express.static(__dirname + '/view'));
//Store all HTML files in view folder.
app.use(express.static(__dirname + '/script'));
//Store all JS and CSS in Scripts folder.
app.use('/', router);
// app.listen(process.env.port || 3000);


router.get('/', function(req,res){
  res.sendFile(path.join(__dirname+'/index.html'));
  //__dirname : It will resolve to your project folder.
});

app.post('/', async function(req,res){
  console.log('Hit /zip route.')
  // console.log("req:", req);
  // console.log("res", res);
  console.log("body.zip: ", req.body.zip)
  let zip = false;
  let zipRestaurants = false;
  if (req.body.zip) zip = req.body.zip;
  zipRestaurants = await sodaCall(zip);
  res.send(zipRestaurants);
  // console.log(zipRestaurants);
})

//Return a list of restaurants filtered by zipcode.
//Refactor to pull all filtering into a separate file.

app.get('/zip', async function(req,res){
  console.log('Hit /zip route.')
  console.log("req:", req);
  // console.log("res", res);
  let zip = false;
  let zipRestaurants = false;
  if (req.query.zipbox) zip = req.query.zipbox;
  zipRestaurants = await sodaCall(zip);
  res.send(zipRestaurants);
  console.log(zipRestaurants);
})

// app.get('/zip', async function(req,res){
//   console.log('Hit /zip route.')
//   console.log("req:", req);
//   // console.log("res", res);
//   const allNewRestaurants = await getData();
//   console.log(allNewRestaurants);
//   let zip = false;
//   let zipRestaurants = false;
//   if (req.query.zipbox) zip = req.query.zipbox;
//   if (zip) {
//     zipRestaurants = allNewRestaurants.filter(function(item) {
//       console.log("I don't know when this fires.")
//       zip === item.zip.slice(0,5)});
//   }
//   if (zipRestaurants) {
//     res.send(zipRestaurants);
//   } else {
//     res.send("enter a 5 digit zipcode.")
//   }
//   // console.log("req.query:", req.query);
//   // res.send(allNewRestaurants);
// })

// router.get('/about',function(req,res){
//   res.sendFile(path.join(__dirname+'/about.html'));
// });
//
// router.get('/sitemap',function(req,res){
//   res.sendFile(path.join(__dirname+'/sitemap.html'));
// });





//API endpoint: https://data.seattle.gov/resource/wnbq-64tb.json
//Odata v2 endpoint: https://data.seattle.gov/OData.svc/wnbq-64tb
//Odata v4 endpoint: https://data.seattle.gov/api/odata/v4/wnbq-64tb
//relevant naics codes: "722513", "722511", "722330" (food trucks - location may be unreliable)

//SAMPLE FUNCTIONING SODE REQUEST FOR FOOD TRUCKS IN SEATTLE OPENED WITHIN THE LAST YEAR:
//https://data.seattle.gov/resource/wnbq-64tb.json?naics_code=722330&city_state_zip=SEATTLE&$where=license_start_date>'2018-09-24T16:00:00'
const oHandler = odata.o("https://data.seattle.gov/api/odata/v4/wnbq-64tb", {
  headers: {
    // 'If-Match': '*'
  }
});

// app.get('/', (request, response) => {
//   response.send(filterData())
// });

app.listen(port, (err) => {
  if (err) {
    return console.log('I guess there was an error.', err)
  }

  console.log(`server is listening on ${port}`)
});

async function getData(){
  try {
    const response = await oHandler.get().query();
    console.log("Response full length:", response.length);
    console.log("milliseconds in a year:", 86400000 * 365)
    // const data = JSON.parse(response);
    const filteredArray = response.filter(item => item.naics_code == '722513' || item.naics_code == '722511');
    // console.log(filteredArray[0].license_start_date);
    // let sampleDate = new Date(filteredArray[0].license_start_date);
    // console.log("sampleDate.getTime() output:", sampleDate.getTime());
    // let now = new Date();
    // console.log("now:", now.getTime());
    // console.log("difference", now.getTime() - sampleDate.getTime())
    // console.log("less than a year?", (now.getTime() - sampleDate.getTime() < 86400000 * 365))
     let timeFilter = filteredArray.filter(function(item){
       let startDate = new Date(item.license_start_date);
       let now = new Date();
       return (now.getTime() - startDate.getTime() < 86400000 * 365) ? true : false;
     });
     console.log("timeFilter's length:", timeFilter.length);
    // console.log(filteredArray);
    return timeFilter;
  } catch(err){
    console.log(err);
  }
}

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
  console.log("url", url);
  let response = await fetch(url, newInit);
  let parsedRes = await response.json();
  // console.log("parsedRes", parsedRes);
  return parsedRes;
}


async function filterData(){
  const data = await getData();
  console.log(data);
  return data
}

async function newTest(){
  try {
    // const response = await oHandler.get().query({$filter: "naics_code eq 722513"});
    // const response = await oHandler.get().query({$filter: `naics_code%20eq%20'722513'%20or%20naics_code%20eq%20'722511'`});
    const response = await oHandler.get().query({$filter: "naics_code eq '722513'"});
    // const response = await oHandler.get().query({$filter: `naics_code eq '722513'`});
    // const response = await oHandler.get().query({$filter: `contains(naics_description, 'Restaurant')`});
    // const response = await oHandler.get().query({$filter: `zip eq 98117`});
    // const response = await oHandler.get().query({$filter: `zip eq '98117'`});
    // const response = await oHandler.get().query({$top: 3});

    console.log(response);
    return response;
  } catch(err) {
    console.log("Promise returned error.");
    console.log(err);
    return err;
  }

}

// async function getRestaurants(){
//   // const response = await o(endpoint).get("OData.svc").query({$filter: `naics_code eq "722513"`});
//   const response = await o(endpoint).get("OData.svc").query({$top: 3});
//   return response;
// }
// newTest();
// getData();
// filterData();
// console.log("test w/o zip");
// sodaCall();
// console.log("test w 98101");
// let test = sodaCall('98101');
// console.log("test", test);
