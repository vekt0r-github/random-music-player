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
 * @returns promise containing binary output
 */
export const readFileBinary = (file) => {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
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
