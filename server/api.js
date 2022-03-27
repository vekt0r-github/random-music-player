/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");
const puppeteer = require("puppeteer");
// const fetch = require("node-fetch");
const request = require('request');

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

router.get("/songs/default", async (req, res) => {
  data = await fetch("./data/songs.json");
  res.send(data);
});

router.get("/songs/poollink", async (req, res) => {
  const poolLink = req.query.poolLink;
  request.get(poolLink, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      res.status(200).send(body);
    }
  });
});

router.post("/songs/sul", async (req, res) => {
  const {username, password} = req.body;
  const browser = await puppeteer.launch({args: ["--single-process", "--no-sandbox"]});
  const page = await browser.newPage();

  // Login
  await page.goto("https://s-ul.eu/log-in");
  await page.type('[id=username]', username);
  await page.type('[id=password]', password);
  await page.keyboard.press('Enter');
  await page.waitForNavigation();
  
  // Get cookies
  // const cookies = await page.cookies();

  // get file list
  await page.goto("https://s-ul.eu/files");
  // console.log(await page.evaluate(() => document.body.innerHTML));
  const songs = await page.evaluate((username) => {
    let elements = document.querySelectorAll(`a[href^="https://${username}.s-ul.eu"]`);
    elements = Array.prototype.slice.call(elements);
    return elements.map((element) => ({
      url: element.href,
      fileName: element.innerText,
    }))
  }, username);
  res.status(200).send({songs: songs});
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
