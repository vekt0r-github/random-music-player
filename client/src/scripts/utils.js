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
    // var form = new FormData();
    // form.append('file', file);
    // const url = URL.createObjectURL(file);
    // var xhr = new XMLHttpRequest();
    // xhr.open('GET', url);
    // xhr.onload = function () {
    //   if (xhr.status >= 200 && xhr.status < 300) {
    //     resolve(toBuffer(xhr.response));
    //   } else {
    //     reject({
    //       status: xhr.status,
    //       statusText: xhr.statusText
    //     });
    //   }
    // };
    // xhr.onerror = function () {
    //   reject({
    //     status: xhr.status,
    //     statusText: xhr.statusText
    //   });
    // };
    // xhr.send();
    
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

// ex: formatParams({ some_key: "some_value", a: "b"}) => "some_key=some_value&a=b"
function formatParams(params) {
  // iterate of all the keys of params as an array,
  // map it to a new array of URL string encoded key,value pairs
  // join all the url params using an ampersand (&).
  return Object.keys(params)
    .map((key) => key + "=" + encodeURIComponent(params[key]))
    .join("&");
}

// convert a fetch result to a JSON object with error handling for fetch and json errors
function convertToJSON(res) {
  if (!res.ok) {
    throw `API request failed with response status ${res.status} and text: ${res.statusText}`;
  }

  return res
    .clone() // clone so that the original is still readable for debugging
    .json() // start converting to JSON object
    .catch((error) => {
      // throw an error containing the text that couldn't be converted to JSON
      return res.text().then((text) => {
        throw `API request's result could not be converted to a JSON object: \n${text}`;
      });
    });
}

// Helper code to make a get request. Default parameter of empty JSON Object for params.
// Returns a Promise to a JSON Object.
export function get(endpoint, params = {}) {
  const fullPath = endpoint + "?" + formatParams(params);
  return fetch(fullPath)
    .then(convertToJSON)
    .catch((error) => {
      // give a useful error message
      throw `GET request to ${fullPath} failed with error:\n${error}`;
    });
}

// Helper code to make a post request. Default parameter of empty JSON Object for params.
// Returns a Promise to a JSON Object.
export function post(endpoint, params = {}) {
  return fetch(endpoint, {
    method: "post",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(params),
  })
    .then(convertToJSON) // convert result to JSON object
    .catch((error) => {
      // give a useful error message
      throw `POST request to ${endpoint} failed with error:\n${error}`;
    });
}
