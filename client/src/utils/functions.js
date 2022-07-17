// randrange [min, max)
const random = (min, max) => Math.floor(Math.random() * (max - min)) + min; 

/**
 * @param {Array} x 
 * @returns a random element from x
 */
export const randomChoice = (x) => x[random(0, x.length)];

// for negative numbers
export const mod = (m, n) => ((m % n) + n) % n;

/**
 * splits a string by the dot before file extension
 * @param {String} fn 
 * @returns object {name, ext}
 */
export const splitFilename = (fn) => {
  let dot = fn.lastIndexOf('.');
  let ext = fn.substring(dot + 1);
  let name = fn.substring(0, dot);
  return {name, ext};
};

export const addDisplayName = (song) => ({
  ...song,
  displayName: `${song.artist} - ${song.title}`,
  displayNameUnicode: song.artistUnicode ? 
    `${song.artistUnicode} - ${song.titleUnicode}` : undefined,
});

/**
 * gets property from song, using the unicode version if
 * desired and available
 * @param {Song} song 
 * @param {String} property 
 * @param {Boolean} useUnicode 
 * @returns value of the property
 */
export const getMaybeUnicode = (song, property, useUnicode) => {
  let value;
  if (useUnicode) { value = song[`${property}Unicode`]; }
  return value ?? song[property];
};

/**
 * async function to read file as binary
 * @param {File | Blob} file 
 * @param {(number) => void} onProgress
 * @returns promise containing binary output
 */
export const readFileBinary = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const fileSize = file.size;
    const chunkSize = 1024 * 1024; // bytes
    let offset = 0;
    let outputBuffer = toBuffer("");

    const chunkReaderBlock = (_offset, length, _file) => {
      const r = new FileReader();
      const blob = _file.slice(_offset, length + _offset);
      r.onload = (evt) => {
        if (evt.target.error == null) {
          offset += chunkSize;
          outputBuffer = Buffer.concat([outputBuffer, toBuffer(evt.target.result)]);
          onProgress(offset / fileSize);
        } else {
          reject("Read error: " + evt.target.error);
          return;
        }
        if (offset >= fileSize) {
          resolve(outputBuffer);
          return;
        }
        chunkReaderBlock(offset, chunkSize, file); // next chunk
      };
      r.readAsBinaryString(blob);
    }

    // now let's start the read with the first block
    chunkReaderBlock(offset, chunkSize, file);
  });
};

export const toBuffer = (fileStr) => {
  const encoding = 'binary';
  // const file = new File([fileStr], "");
  return Buffer.from(fileStr, encoding);
};

/**
 * gets an audio file for a beatmap
 * @param {FileSystemDirectoryHandle} osuDirectoryHandle
 * @param {Object} beatmap osu! beatmap info object
 * @returns handle for the audio file
 */
export const getAudioHandle = async (osuDirectoryHandle, beatmap) => {
  try {
    const songsHandle = await osuDirectoryHandle.getDirectoryHandle("Songs");
    const folderHandle = await songsHandle.getDirectoryHandle(beatmap.folder_name);
    return await folderHandle.getFileHandle(beatmap.audio_file_name);
  } catch (error) {
    console.log(error, beatmap);
    return null;
  }
};

export const scrollIfNeeded = (element, container) => {
  if (element.offsetTop < container.scrollTop) {
    container.scrollTop = element.offsetTop;
  } else {
    const offsetBottom = element.offsetTop + element.offsetHeight;
    const scrollBottom = container.scrollTop + container.offsetHeight;
    if (offsetBottom > scrollBottom) {
      container.scrollTop = offsetBottom - container.offsetHeight;
    }
  }
}

export const isAudioExtension = (ext) => ["mp3", "wav", "flac"].includes(ext);

/**
 * helper for generating queries for objectMatchesQueries
 * 
 * @param {string} queryString full string to parse
 * @returns list of objects [{ field?, value }]
 */
export const parseQueryString = (queryString) => {
  const querySegments = [];
  const quote = /['"`]/;
  let lock = null;
  let currQuery = "";
  for (const c of (queryString+" ").split('')) {
    if (lock === null) {
      if (c.match(/\s/)) {
        if (currQuery.length) querySegments.push(currQuery);
        currQuery = "";
      } else {
        if (c.match(quote)) lock = c;
        currQuery += c;
      }
    } else {
      currQuery += c;
      if (lock === c) {
        lock = null;
        querySegments.push(currQuery);
        currQuery = "";
      }
    }
  }
  if (currQuery.length) return undefined; // bad query
  const queries = querySegments.map(query => {
    const splitByEquals = query.split("=");
    if (splitByEquals.length > 1) {
      const field = splitByEquals[0];
      const rest = splitByEquals.slice(1).join("=");
      if (!query.endsWith(rest)) throw new Error();
      let value;
      const cAfter = rest.charAt(0);
      if (!query.match(quote)) { // field=value
        value = rest;
      } else if (cAfter.match(quote) && query.endsWith(cAfter)) {
        // field="value"
        value = rest.slice(1, -1);
      }
      if (value) return { field, value };
    }
    let value;
    const cFirst = query.charAt(0);
    if (!query.match(quote)) { // value
      value = query;
    } else if (cFirst.match(quote) && query.endsWith(cFirst)) {
      // "value"
      value = query.slice(1, -1);
    }
    if (value) return { value };
    return undefined; // will invalidate entire list
  });
  if (queries.includes(undefined)) return undefined;
  return queries;
}

const fieldMatchesQuery = (value, queryValue) => {
  // helper for the below
  if (typeof value === 'function') return false;
  return `${value}`.toLowerCase().includes(queryValue.toLowerCase());
}

/**
 * checks if each query can be found in the object's values
 * 
 * @param {Object} obj the object
 * @param {Query[]} queries list of objects [{ field?, value }]
 * @param options object { fields?, ignoreFields? }
 * - fields: list of fields to check
 * - ignoreFields: the complement
 * @returns bool
 */
export const objectMatchesQueries = (obj, queries, options={}) => {
  // succeeds if each portion matches
  for (const { field, value } of queries) {
    if (field !== undefined) {
      // check specific field matches value
      if (!fieldMatchesQuery(obj[field], value)) return false;
    } else {
      // search all keys for value
      let found = false;
      for (const [key, val] of Object.entries(obj)) {
        if (options.ignoreFields && options.ignoreFields.includes(key)) continue;
        if (options.fields && !options.fields.includes(key)) continue;
        if (fieldMatchesQuery(val, value)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
  }
  return true; // all portions matched
}