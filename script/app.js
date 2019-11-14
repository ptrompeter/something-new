"use strict"

console.log("Using app.js from script folder.")

const zipForm = $("#zip-form");
const zipBox = $("#zip");
const display = $("#display-box");
const addForm = $("#address-form");
const addBox = $("#address");
const addDisplay = $("#display-box2");
const streetAddress = $("#address-text");
const city = $("#city-text");
const state = $("#state-text");
const zipCode = $("#zipCode-text");
const country = $("#country-text");
let data;


//handler functions
async function getList(zip = false, address = false) {
  let init = {}
  init.method = 'POST';
  init.mode = 'same-origin';
  init.credentials = 'same-origin';
  init.headers = {
    'Content-Type': 'application/json'
  }
  if (zip) init.body = JSON.stringify({'zip' : zip});
  if (address) init.body = JSON.stringify({'address' : address});
  const response = await fetch('/', init);
  const parsedResponse = await response.json();
  return parsedResponse;
}

function selectFive(array, idx = 0) {
  return array.slice(idx, idx + 5)
}

function addControls(){
  let controlDiv = $("<div id='control-div' idx='0'></div>");
  let prev = $("<a href='#' class='page-control' id='prev'>last page</a>");
  let next = $("<a href='#' class='page-control' id='next'>next page</a>");
  controlDiv.append(prev);
  controlDiv.append(next);
  return controlDiv;
}

function makeFormattedList(array) {
  let ul = $("<ul class='result-list'></ul>");
  ul.addClass("result-list");
  array.forEach(function(entry){
    let li = $("<li></li>");
    li.addClass("result-item translucent");
    li.append($(`<div class='rest-name'>${entry.restaurant.trade_name}</div>`));
    li.append($(`<div class='rest-distance'><span class='distance-flag'>Distance: </span> <span>${entry.distance.toFixed(2)}km</span></div>`));
    li.append($(`<div class='rest-address-1'>${entry.restaurant.street_address}</div>`));
    let line2 = entry.restaurant.city_state_zip + ", " + entry.restaurant.state + ", " + entry.restaurant.zip;
    li.append($(`<div class='rest-address-2'>${line2}</div>`));
    li.append($(`<div class='rest-tel'>${entry.restaurant.business_phone}</div>`));
    ul.append(li);
  })
  return ul;
}

function formatData(dataObj, usrString = "") {
  let article = $("<article></article");
  article.addClass("search-results");
  let titleWrapper = $("<div></div>");
  titleWrapper.addClass("title-wrapper");
  let titleDiv = (usrString) ? $(`<div>Results for ${usrString}</div>`) : $("<div>Your Results</div>")
  titleDiv.addClass("result-title");
  titleWrapper.append(titleDiv);
  article.append(titleWrapper);
  let controls = addControls();
  article.append(controls);
  let formattedList = makeFormattedList(dataObj);
  article.append(formattedList);
  return article
}

//Reveal search results with cascade effect
function revealList(){
  $.each($('ul.result-list > li'), function(i, el) {
    setTimeout(function() {
      $(el).fadeIn();
    }, i * 100);
  });
}

//Add or remove disabled class to controls depending upon index.
function checkControls(idx = 0) {
  (idx <= 0) ? $("#prev").addClass("disabled") : $("#prev").removeClass("disabled");
  (data.length -1 - idx <= 5) ? $("#next").addClass("disabled") : $("#next").removeClass("disabled");
}

//event listeners
zipForm.submit(async function (event) {
  event.preventDefault();
  let response = (zipBox[0].value) ? await getList(zipBox[0].value) : await getList();
  display[0].innerText = JSON.stringify(response);
});

addForm.submit(async function (event) {
  event.preventDefault();
  let address = `${streetAddress[0].value}, ${city[0].value}, ${state[0].value}, ${country[0].value}`
  console.log("address:", address);
  data = (address) ? await getList(false, address) : await getList();
  let formattedData = formatData(selectFive(data), address);
  if (addDisplay.children().length == 0){
    addDisplay.append(formattedData);
    let delay = 0;
    revealList();
  } else {
    addDisplay.children().first().replaceWith(formattedData);
    checkControls();
    revealList();
  }
});


$("#display-box2").on('click', "#next", function(event){
  if ($("#next").hasClass("disabled")) return false;
  let newList;
  let idx = $("#control-div").attr("idx");
  idx = parseInt(idx);
  console.log("idx from control-div:", idx);
  console.log("idx type:", typeof idx);
  if (data.length - idx -1 > 5) idx += 5;
  console.log("BREAKING HERE? idx < data.length -1?:", idx < data.length - 1)
  if (idx < data.length - 1) {
    console.log("INSIDE EVENT LISTENER CONDITIONAL");
    console.log("idx to insert:", idx)
    checkControls(idx);
    $("#control-div").attr("idx", idx.toString());
    console.log("idx after insert:", $("#control-div").attr("idx"));
    newList = (data.length - idx - 1 >= 5) ? selectFive(data, idx): data.slice(idx);
    addDisplay.children().first().replaceWith(formatData(newList));
    revealList();
  }
});

$("#display-box2").on('click', "#prev", function(event){
  if ($("#prev").hasClass("disabled")) return false;
  let newList;
  let controlDiv = $("#control-div");
  let idx = controlDiv.attr("idx");
  idx = parseInt(idx);
  idx = (idx > 4) ? idx - 5 : 0;
  checkControls(idx);
  controlDiv.attr("idx", idx.toString());
  newList = (data.length - idx - 1 >= 5) ? selectFive(data, idx): data.slice(idx);
  addDisplay.children().first().replaceWith(formatData(newList));
  revealList();
});
