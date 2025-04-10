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
const request = require("request");
var path = require("path");
var fs = require("fs");
var fsPromises = require("fs/promises");
require("dotenv").config();

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

// just sends out a get request to src
router.get("/proxy", async (req, res) => {
  req.pipe(request.get(req.query.src)).pipe(res);
});

// the assumption is that filenames on the server will be japanese
// beyond that, must stay consistent with the frontend algorithm in utils/functions.js
// filenames in the persistent dir might have to update if this is changed
const toSafeFilename = (song) => {
  const fn = `${song.displayNameUnicode}.mp3`;
  return fn.replace(/[\/\\:*]/gi, "_");
};

// no args: get songs.json file
// args: get specific song (by index in songs.json)
router.get("/songs/default", async (req, res) => {
  fs.readFile(process.env.DEFAULT_DATA_FILE, (error, data) => {
    if (error) {
      res.status(500).send({ msg: error.message });
    } else {
      let songsList = JSON.parse(data);
      if (req.query.song) {
        const song = songsList[parseInt(req.query.song)];
        const songPath = path.join(process.env.DEFAULT_DATA_DIR, toSafeFilename(song));
        fs.readFile(songPath, (songError, songData) => {
          if (songError) {
            res.status(500).send({ msg: songError.message });
          } else {
            res.setHeader("content-type", "audio/mpeg");
            res.status(200).send(songData);
          }
        });
      } else {
        songsList = songsList.map((song, i) => ({ ...song, path: `/api/songs/default?song=${i}` }));
        res.setHeader("content-type", "application/json");
        res.status(200).send(songsList);
      }
    }
  });
});

router.post("/songs/sul", async (req, res) => {
  try {
    const { username, password } = req.body;
    const browser = await puppeteer.launch({ args: ["--single-process", "--no-sandbox"] });
    const page = await browser.newPage();

    // Login
    await page.goto("https://s-ul.eu/log-in");
    await page.type("[id=username]", username);
    await page.type("[id=password]", password);
    await page.keyboard.press("Enter");
    await page.waitForNavigation();

    // Get cookies
    // const cookies = await page.cookies();

    // get file list
    let songs = [];
    for (let i = 1; ; i++) {
      await page.goto(`https://s-ul.eu/files?page=${i}`);
      // console.log(await page.evaluate(() => document.body.innerHTML));
      const currSongs = await page.evaluate((username) => {
        let elements = document.querySelectorAll(`a[href^="https://${username}.s-ul.eu"]`);
        elements = Array.prototype.slice.call(elements);
        return elements.map((element) => ({
          url: element.href,
          fileName: element.innerText,
        }));
      }, username);
      const songsUrls = songs.map((s) => s.url);
      if (currSongs.length && currSongs.every((song) => !songsUrls.includes(song.url))) {
        songs = [...songs, ...currSongs];
      } else {
        break;
      }
    }
    res.status(200).send({ songs: songs });
  } catch (error) {
    res.status(504);
  }
});

router.get("/osu/metadata", async (req, res) => {
  try {
    const osuPath = path.join(process.env.SERVER_OSU_DIR, "osu!.json");
    const osuData = JSON.parse(await fsPromises.readFile(osuPath, { encoding: "utf-8" }));
    const collectionPath = path.join(process.env.SERVER_OSU_DIR, "collection.json");
    const collectionData = JSON.parse(
      await fsPromises.readFile(collectionPath, { encoding: "utf-8" })
    );
    res.setHeader("content-type", "application/json");
    res.status(200).send({ osuData, collectionData });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});

router.get("/osu/songs", async (req, res) => {
  if (!req.query.path) {
    res.status(400).send({ msg: "please provide a filepath" });
  } else {
    try {
      const songPath = path.join(process.env.SERVER_OSU_DIR, req.query.path);
      const stats = await fsPromises.stat(songPath); // Get file stats asynchronously
      const fileSize = stats.size; // File size in bytes
      const data = await fsPromises.readFile(songPath); // Read the file asynchronously
      // ogg and mp3 only file types supported for now
      const contentType = songPath.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", fileSize);
      res.status(200).send(data);
    } catch (error) {
      res.status(500).send({ msg: error.message });
    }
  }
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
