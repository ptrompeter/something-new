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

function formatData(dataObj, usrString = "") {
  let article = $("<article></article");
  article.addClass("search-results");
  let titleWrapper = $("<div></div>");
  titleWrapper.addClass("title-wrapper");
  let titleDiv = (usrString) ? $(`<div>Results for ${usrString}</div>`) : $("<div>Your Results</div>")
  titleDiv.addClass("result-title");
  titleWrapper.append(titleDiv);
  article.append(titleWrapper);
  let ul = $("<ul class='result-list'></ul>")
  ul.addClass("result-list");
  dataObj.forEach(function(entry){
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
  article.append(ul);
  return article
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
  let response = (address) ? await getList(false, address) : await getList();
  let formatedData = formatData(response, address);
  if (addDisplay.children().length == 0){
    addDisplay.append(formatedData);
    let delay = 0;
    $.each($('ul.result-list > li'), function(i, el) {
      setTimeout(function() {
        $(el).fadeIn();
      }, i * 100);
    });
  } else {
    addDisplay.children().first().replaceWith(formatedData)
  }
});
