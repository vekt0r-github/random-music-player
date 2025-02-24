var path = require("path");
const fs = require("fs/promises");
const { OsuDBParser } = require("osu-db-parser");

/**
 * uses osu-db-parser to parse osu!.db
 * @param {Buffer} osuBuffer
 * @returns {Object} osuData with required information for client
 */
const fetchOsuData = async () => {
  const osuPath = path.join(process.env.SERVER_OSU_DIR, "osu!.db");
  let parser = new OsuDBParser(await fs.readFile(osuPath), null);
  const osuData = parser.getOsuDBData();
  console.log("fetched data");
  parser = null;
  return {
    beatmaps: osuData.beatmaps.map((bm) => ({
      md5: bm.md5,
      folder_name: bm.folder_name,
      audio_file_name: bm.audio_file_name,
      artist_name_unicode: bm.artist_name_unicode,
      song_title_unicode: bm.song_title_unicode,
      artist_name: bm.artist_name,
      song_title: bm.song_title,
      timing_points: bm.timing_points,
      total_time: bm.total_time,
      creator_name: bm.creator_name,
      difficulty: bm.difficulty,
      osu_file_name: bm.osu_file_name,
      song_source: bm.song_source,
      song_tags: bm.song_tags,
    })),
  };
};

/**
 * uses osu-db-parser to parse collection.db
 * @param {Buffer} collectionBuffer
 * @returns {Object} collectionData with required information for client
 */
const fetchCollectionData = async () => {
  const collectionsPath = path.join(process.env.SERVER_OSU_DIR, "collection.db");
  let parser = new OsuDBParser(null, await fs.readFile(collectionsPath));
  const collectionData = parser.getCollectionData();
  parser = null;
  return {
    collection: collectionData.collection.map((coll) => ({
      name: coll.name,
      beatmapsCount: coll.beatmapsCount,
      beatmapsMd5: coll.beatmapsMd5,
    })),
  };
};

module.exports = { fetchOsuData, fetchCollectionData };
