"use strict"

console.log("Using app.js from script folder.")

const zipForm = $("#zip-form");
const zipBox = $("#zip");
const display = $("#display-box");

//handler functions
async function getZipList(zip = false) {
  let init = {}
  init.method = 'POST';
  init.mode = 'same-origin';
  init.credentials = 'same-origin';
  init.headers = {
    'Content-Type': 'application/json'
  }
  if (zip) init.body = JSON.stringify({'zip' : zip});
  const response = await fetch('/', init);
  const parsedResponse = await response.json();
  return parsedResponse;
}
//event listeners
zipForm.submit(async function (event) {
  event.preventDefault();
  let response = (zipBox[0].value) ? await getZipList(zipBox[0].value) : await getZipList();
  display[0].innerText = JSON.stringify(response);
});
