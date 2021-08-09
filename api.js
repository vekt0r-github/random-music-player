const express = require("express");

const OsuDBParser = require('osu-db-parser');

const router = express.Router();

toBuffer = (fileStr) => {
  const encoding = 'binary';
  // const file = new File([fileStr], "");
  return Buffer.from(fileStr, encoding);
}

router.post("/parsedb", (req, res) => {
  // console.log(req.body);
  const osuBuffer = toBuffer(req.body.osuFile);
  const collectionBuffer = toBuffer(req.body.collectionFile);
  const parser = new OsuDBParser(osuBuffer, collectionBuffer);
  const osuData = parser.getOsuDBData();
  const collectionData = parser.getCollectionData();
  res.send({osuData, collectionData});
});

module.exports = router;