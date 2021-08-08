import { PlayerDisplay } from "./playerDisplay.js";
import { splitFilename } from "./utils.js";

const audioPath = 'test/';

function loadData(fn, callback) {
  var oReq = new XMLHttpRequest(); // New request object
  oReq.onload = function() {
    // This is where you handle what to do with the response.
    // The actual data is found on this.responseText
    callback(this.responseText); 
  };
  oReq.open("get", fn, true);
  //                   ^ Don't block the rest of the execution.
  //                     Don't wait until the request finishes to
  //                     continue.
  oReq.send();
}

function executeIfInt(value, callback) {
  if (Number.isInteger(+value)) {
    callback(+value);
  }
}

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
    element.onchange = () => executeIfInt(element.value, callback);
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
    [...files].forEach((file, index) => {
      const {name, ext} = splitFilename(file.name);
      if (!["mp3", "wav", "flac"].includes(ext)) return;
      const url = URL.createObjectURL(file);
      activeURLs.push(url);
      pool.push({
        id: index,
        path: url,
        displayName: name,
      });
    });
    initPlayer(pool);
  }  
};

settingSelect.addEventListener('change', onSettingChange);
startButton.addEventListener('click', onStartClick);