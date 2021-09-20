import { CollectionLoader } from "./collection-loader.js";
import { PlayerDisplay } from "./player-display.js";
import { splitFilename, get } from "./utils.js";

function initPlayer(pool) {
  // console.log(pool_json);
  const audio = document.getElementById("player");
  const table = document.getElementById("playlists");

  const player = new PlayerDisplay(audio, table, document.getElementById("songsLeft"), pool);
  player.reset();
  player.volume = 0.25;
  player.autoplay = true;
  player.playCurr();
  document.getElementById("refresh").onclick = () => player.refreshPlaylist.bind(player)();
  document.getElementById("prev").onclick = () => player.playPrev.bind(player)();
  document.getElementById("next").onclick = () => player.playNext.bind(player)();
  const setupInput = (elementId, defaultValue, callback) => {
    const element = document.getElementById(elementId);
    element.value = defaultValue;
    callback(defaultValue);
    element.addEventListener('change', () => {
       callback(element.value);
    });
  }
  const checkInt = (x) => Number.isInteger(parseInt(x))
  setupInput("noRepeatNum", Math.min(10, pool.length-1), (x) => {
    if (checkInt(x) && x >= 0) player.noRepeatNum = +x;
  });
  setupInput("rowsBefore", 10, (x) => {
    if (checkInt(x) && x >= 0) player.rowsBefore = +x;
  });
  setupInput("rowsAfter", 10, (x) => {
    if (checkInt(x) && x >= 0) player.rowsAfter = +x;
  });
  setupInput("songsLeft", "", (x) => {
    if (checkInt(x)) player.songsLeft = +x;
    else if (x === "") player.songsLeft = -1;
  });
}

const settingSelect = document.getElementById("setting");
const fileSelect = document.getElementById("fileselect");
const osuContainer = document.getElementById("osucontainer");
const startButton = document.getElementById("start");

const collectionLoader = new CollectionLoader(osuContainer);

let activeURLs = [];

const resetURLs = () => {
  for (const url of activeURLs) URL.revokeObjectURL(url);
  activeURLs = [];
};

const makeAudioURL = (file) => {
  const url = URL.createObjectURL(file);
  activeURLs.push(url);
  return url;
}

const onSettingChange = () => {
  const setting = settingSelect.value;
  fileSelect.hidden = !["folder"].includes(setting);
  osuContainer.hidden = !["osu"].includes(setting);
};

const onStartClick = async () => {
  resetURLs();
  const setting = settingSelect.value;
  if (setting === "default") {
    get('data/songs.json')
      .then((pool) => {
        console.log(pool);
        initPlayer(pool);
      });
  } else if (setting === "folder") {
    const files = [...fileSelect.files];
    let pool = [];
    files.forEach((file) => {
      const {name, ext} = splitFilename(file.name);
      if (!["mp3", "wav", "flac"].includes(ext)) return;
      const url = makeAudioURL(file);
      pool.push({
        path: url,
        displayName: name,
      });
    });
    initPlayer(pool);
  } else if (setting === "osu") {
    const collection = collectionLoader.collections[collectionLoader.selectedCollection];
    const hashes = new Set(collection.beatmapsMd5);
    const beatmaps = collectionLoader.findMaps(hashes);
    const promises = beatmaps.map(async (beatmap) => {
      const handle = await collectionLoader.getAudioHandle(beatmap);
      if (handle === null) return null; // silently remove beatmap
      const url = await handle.getFile().then(makeAudioURL);
      const useUnicode = true;
      const artist = beatmap[`artist_name${(useUnicode && beatmap.artist_name_unicode) ? "_unicode" : ""}`];
      const title = beatmap[`song_title${(useUnicode && beatmap.song_title_unicode) ? "_unicode" : ""}`];
      return {
        path: url,
        displayName: `${artist} - ${title}`,
      };
    });
    const pool = await Promise.all(promises);
    initPlayer(pool.filter(x => x !== null));
  }
};

onSettingChange();
settingSelect.addEventListener('change', onSettingChange);
startButton.addEventListener('click', onStartClick);
