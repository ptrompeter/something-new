"use strict"

console.log("Using app.js from script folder.")

const zipForm = $("#zip-form")
const zipBox = $("#zip")
const display = $("#display-box")

//handler functions
async function getZipList(zip) {
  const response = await fetch('/zip')
  console.log("zipList output:", response);
  return response;
}
//event listeners
zipForm.submit(async function (event) {
  event.preventDefault();
  console.log("zip code:", zipBox[0].value);
  console.log(event);
  if (zipBox[0].value) return getZipList(zipBox[0].value);
});
