/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");

const OsuDBParser = require('osu-db-parser');

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

//initialize socket
const socketManager = require("./server-socket");

router.post("/initsocket", (req, res) => {
  // do nothing if user not logged in
  if (req.user) socketManager.addUser(req.user, socketManager.getSocketFromSocketID(req.body.socketid));
  res.send({});
});

router.get("/songs/default", async (req, res) => {
  // do nothing if user not logged in
  data = await fetch("./data/songs.json");
  res.send(data);
});

router.post("/parsedb", (req, res) => {
  const toBuffer = (fileStr) => {
    const encoding = 'binary';
    // const file = new File([fileStr], "");
    return Buffer.from(fileStr, encoding);
  }

  // console.log(req.body);
  const osuBuffer = toBuffer(req.body.osuFile);
  const collectionBuffer = toBuffer(req.body.collectionFile);
  const parser = new OsuDBParser(osuBuffer, collectionBuffer);
  const osuData = parser.getOsuDBData();
  const collectionData = parser.getCollectionData();
  res.send({osuData, collectionData});
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
