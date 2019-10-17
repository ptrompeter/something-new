"use strict"

console.log("Using app.js from script folder.")

const zipForm = $("#zip-form");
const zipBox = $("#zip");
const display = $("#display-box");
const addForm = $("#address-form");
const addBox = $("#address");
const addDisplay = $("#display-box2");

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

//event listeners
zipForm.submit(async function (event) {
  event.preventDefault();
  let response = (zipBox[0].value) ? await getList(zipBox[0].value) : await getList();
  display[0].innerText = JSON.stringify(response);
});

addForm.submit(async function (event) {
  event.preventDefault();
  let response = (addBox[0].value) ? await getList(false, addBox[0].value) : await getList();
  addDisplay[0].innerText = JSON.stringify(response);
});
