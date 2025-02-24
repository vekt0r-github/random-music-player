const { OsuDBParser } = require("osu-db-parser");

/**
 * uses osu-db-parser to parse osu!.db and collection.db
 * and extract required information for client
 * @param {Buffer} osuBuffer
 * @param {Buffer} collectionBuffer
 * @returns {Object} { osuData, collectionData }, where
 * osuData = { beatmaps }
 * collectionData = { collection }
 */
const parseDB = (osuBuffer, collectionBuffer) => {
  const parser = new OsuDBParser(osuBuffer, collectionBuffer);
  const osuData = parser.getOsuDBData();
  const collectionData = parser.getCollectionData();
  return {
    osuData: {
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
    },
    collectionData: {
      collection: collectionData.collection.map((coll) => ({
        name: coll.name,
        beatmapsCount: coll.beatmapsCount,
        beatmapsMd5: coll.beatmapsMd5,
      })),
    },
  };
};

module.exports = { parseDB };
