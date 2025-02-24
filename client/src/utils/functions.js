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
  let dot = fn.lastIndexOf(".");
  let ext = fn.substring(dot + 1);
  let name = fn.substring(0, dot);
  return { name, ext };
};

export const addDisplayName = (song) => ({
  ...song,
  displayName: `${song.artist} - ${song.title}`,
  displayNameUnicode: song.artistUnicode
    ? `${song.artistUnicode} - ${song.titleUnicode}`
    : undefined,
});

// update later if other edge cases come up
// escape sequences should be idempotent
// must stay consistent with the backend algorithm in api.js
export const toSafeFilename = (song, useUnicode) => {
  const fn = `${getMaybeUnicode(song, "displayName", useUnicode)}.mp3`;
  return fn.replace(/[\/\\:*]/gi, "_");
};

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
  if (useUnicode) {
    value = song[`${property}Unicode`];
  }
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
      r.readAsArrayBuffer(blob);
    };

    // now let's start the read with the first block
    chunkReaderBlock(offset, chunkSize, file);
  });
};

export const toBuffer = (fileStr) => {
  const encoding = "binary";
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

/**
 * same as above, but just getting the path itself
 */
export const getAudioPath = (beatmap) => {
  return ["Songs", beatmap.folder_name, beatmap.audio_file_name].join("/");
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
};

export const isAudioExtension = (ext) => ["mp3", "wav", "flac"].includes(ext);

/**
 * helper for generating queries for objectMatchesQueries
 *
 * @param {string} queryString full string to parse
 * @returns list of objects [{ field?, op?, value }]
 */
export const parseQueryString = (queryString) => {
  const querySegments = [];
  const quote = /['"`]/;
  const oper = /[=<>]/;
  let lock = null;
  let currQuery = "";
  for (const c of (queryString + " ").split("")) {
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
  const queries = querySegments.map((query) => {
    const operMatch = query.match(oper);
    let field,
      op,
      valueString = query;
    if (operMatch) {
      const { 0: opStr, index } = operMatch;
      const maybeField = query.slice(0, index);
      if (!maybeField.match(quote)) {
        field = maybeField;
        op = opStr;
        valueString = query.slice(index + 1);
      }
    }
    let value;
    const cFirst = valueString.charAt(0);
    if (!valueString.match(quote)) {
      value = valueString;
    } else if (cFirst.match(quote) && valueString.endsWith(cFirst)) {
      value = valueString.slice(1, -1);
    }
    if (value) return { field, op, value };
    return undefined; // will invalidate entire list
  });
  if (queries.includes(undefined)) return undefined;
  return queries;
};

export class SearchField {
  ops = Object.freeze({
    in: (a, b) => a.includes(b),
    "=": (a, b) => a === b,
    ">": (a, b) => a > b,
    "<": (a, b) => a < b,
  });
  constructor(options = {}) {
    this.keywordOnly = options.kwarg ?? false;
    this.numberField = options.number ?? false;
    this.process = this.numberField
      ? (value) => parseFloat(`${value}`)
      : (value) => `${value}`.toLowerCase();
  }
  isMatch = (value, queryValue, op = "=") => {
    if (typeof value === "function") return false;
    // for text searches "=" means contains instead
    if (!this.numberField && op === "=") op = "in";
    return this.ops[op](this.process(value), this.process(queryValue));
  };
}

/**
 * checks if each query can be found in the object's values
 *
 * @param {Object} obj the object
 * @param {Query[]} queries list of objects [{ field?, op?, value }]
 * @param options object { fields?, ignoreFields? }
 * - fields: map from fields to check to SearchField objects (overrules ignoreFields)
 * - ignoreRest: bool; whether to ignore everything not in fields
 * - ignoreFields: list of fields to ignore
 * @returns bool
 */
export const objectMatchesQueries = (obj, queries, options = {}) => {
  const { fields, ignoreRest, ignoreFields } = options;
  const getSearchField = (field) => {
    // determines how to handle a field
    if (fields && field in fields) return fields[field];
    if (ignoreRest || (ignoreFields && field in ignoreFields)) return undefined;
    return new SearchField(); // default options
  };
  // succeeds if each portion matches
  for (const { field, op, value } of queries) {
    if (field !== undefined) {
      // check specific field matches value
      const searchField = getSearchField(field);
      console.log(obj[field], value, op);
      if (!searchField || !searchField.isMatch(obj[field], value, op)) return false;
    } else {
      // search all keys for value
      let found = false;
      for (const [key, val] of Object.entries(obj)) {
        const searchField = getSearchField(key);
        if (!searchField || searchField.keywordOnly) continue;
        if (searchField.isMatch(val, value)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
  }
  return true; // all portions matched
};

/**
 * converts all urls in pool to be reverse proxied through backend
 * @param {Song[]} pool
 * @returns pool with each song having a reverse proxied path
 */
export const attachReverseProxy = (pool) => {
  console.log(pool);
  const host = `${window.location.protocol}//${window.location.host}`;
  return pool.map((song) => ({
    ...song,
    path: `${host}/api/proxy?src=${encodeURIComponent(song.path)}`,
  }));
};
