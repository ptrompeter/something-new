"use strict"

const zipForm = $("#zip-form")
const zipBox = $("#zip")
const display = $("#display-box")
//event listeners
zipForm.submit(async function (event) {
  event.preventDefault();
  console.log("zip code:", zipBox[0].value);
  console.log(event);
  let result = await $.get()


})
