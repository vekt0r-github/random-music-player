import { PlayerDisplay } from "./playerDisplay.js";
import { splitFilename, loadData } from "./utils.js";

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
const startButton = document.getElementById("start");

var activeURLs = []

const resetURLs = () => {
  for (const url of activeURLs) URL.revokeObjectURL(url);
  activeURLs = [];
}

const onSettingChange = () => {
  const setting = settingSelect.value;
  fileSelect.hidden = (setting !== "folder");
}

const onStartClick = () => {
  resetURLs();
  const setting = settingSelect.value;
  if (setting === "default") {
    loadData('songs.json', (pool_json) => initPlayer(JSON.parse(pool_json)));
  } else if (setting === "folder") {
    const files = fileSelect.files;
    var pool = [];
    [...files].forEach((file) => {
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
  }  
};

settingSelect.addEventListener('change', onSettingChange);
startButton.addEventListener('click', onStartClick);