import { OsuDBParser } from "osu-db-parser";

/**
 * helper to process unicode return values from OsuDBParser, after 2.0.0 update
 * @param {string} input with possibly-garbled unicode text
 * @returns same string, displayed correctly
 */
const processOsuDBString = (input) => {
  if (!input) return input;
  try {
    return decodeURIComponent(escape(input));
  } catch (e) {
    console.error(`error ungarbling string \"${input}\":`, e);
    return input;
  }
};

/**
 * uses osu-db-parser to parse osu!.db, discarding unnecessary info
 * original osuData = { beatmaps, folder_count, osuver, username }
 * @param {Buffer} osuBuffer
 * @returns {Object} osuData with required information for client
 */
export const parseOsuData = (osuBuffer) => {
  let parser = new OsuDBParser(osuBuffer, null);
  const osuData = parser.getOsuDBData();
  parser = null;

  // preprocess all strings, since unicode text may be garbled
  for (const bm of osuData.beatmaps) {
    for (let key in bm) {
      if (bm.hasOwnProperty(key) && typeof bm[key] === "string") {
        bm[key] = processOsuDBString(bm[key]);
      }
    }
  }

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
 * uses osu-db-parser to parse collection.db, discarding unnecessary info
 * original collectionData = { collection, osuver }
 * @param {Buffer} collectionBuffer
 * @returns {Object} collectionData with required information for client
 */
export const parseCollectionData = (collectionBuffer) => {
  let parser = new OsuDBParser(null, collectionBuffer);
  const collectionData = parser.getCollectionData();
  parser = null;

  // preprocess all strings, since unicode text may be garbled
  for (const coll of collectionData.collection) {
    for (let key in coll) {
      if (coll.hasOwnProperty(key) && typeof coll[key] === "string") {
        coll[key] = processOsuDBString(coll[key]);
      }
    }
  }

  return {
    collection: collectionData.collection.map((coll) => ({
      name: coll.name,
      beatmapsCount: coll.beatmapsCount,
      beatmapsMd5: coll.beatmapsMd5,
    })),
  };
};
