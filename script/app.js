"use strict"

require('dotenv').config();

const zipForm = $("#zip-form")
const zipBox = $("#zip")
const display = $("#display-box")
const serverPort = process.env.DEV_PORT;
//event listeners
zipForm.submit(async function (event) {
  event.preventDefault();
  console.log("zip code:", zipBox[0].value);
  console.log(event);
  let result = await $.get()


})
