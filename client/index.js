import { CollectionLoader } from "./collection-loader.js";
import { PlayerDisplay } from "./player-display.js";
import { splitFilename, get } from "./utils.js";

function initPlayer(pool) {
  // console.log(pool_json);
  const audio = document.getElementById("player");
  const table = document.getElementById("playlist");

  const player = new PlayerDisplay(audio, table, pool);
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
      if (Number.isInteger(+element.value)) callback(+element.value);
    });
  }
  setupInput("noRepeatNum", 10, (x) => player.noRepeatNum = x);
  setupInput("rowsBefore", 10, (x) => player.rowsBefore = x);
  setupInput("rowsAfter", 10, (x) => player.rowsAfter = x);
}

const settingSelect = document.getElementById("setting");
const fileSelect = document.getElementById("fileselect");
const osuContainer = document.getElementById("osucontainer");
const startButton = document.getElementById("start");

var activeURLs = [];

const resetURLs = () => {
  for (const url of activeURLs) URL.revokeObjectURL(url);
  activeURLs = [];
};

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
    var pool = [];
    files.forEach((file) => {
      const {name, ext} = splitFilename(file.name);
      if (!["mp3", "wav", "flac"].includes(ext)) return;
      const url = URL.createObjectURL(file);
      activeURLs.push(url);
      pool.push({
        path: url,
        displayName: name,
      });
    });
    initPlayer(pool);
  } else if (setting === "osu") {
    var pool = [];
  }
};

onSettingChange();
settingSelect.addEventListener('change', onSettingChange);
startButton.addEventListener('click', onStartClick);

const collectionLoader = new CollectionLoader(osuContainer);