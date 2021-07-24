import { PlayerDisplay } from "./playerDisplay.js";

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
  const box = document.getElementById("hellosu");
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

const startButton = document.getElementById("start")

const start = () => {
  loadData('songs.json', (pool_json) => initPlayer(JSON.parse(pool_json)));
  startButton.removeEventListener('click', start);
};
startButton.addEventListener('click', start);