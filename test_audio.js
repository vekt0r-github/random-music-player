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

function initPlayer(pool_json) {
  // console.log(pool_json);
  const pool = JSON.parse(pool_json);
  const box = document.getElementById("hellosu");
  const audio = document.getElementById("player");
  const table = document.getElementById("playlist");
  // const poolSize = pool.length;
  // const playlistSize = 50;
  // const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;
  // var playlist = [];
  // for (i = 0; i < playlistSize; i++) {
  //   playlist.push(random(0, poolSize));
  // }
  // // box.innerHTML = playlist.toString();
  // // box.innerHTML = poolSize;

  // function playSong() {
  //   audio.src = audioPath + pool[playlist.shift()];
  //   playlist.push(random(0, poolSize));
  //   audio.play();
  // }

  // audio.addEventListener("ended", playSong);

  // playSong();
  const player = new PlayerDisplay(audio, table, pool);
  player.reset();
  player.volume = 0.25;
  player.autoplay = true;
  player.noRepeatNum = 2;
  player.rowsBefore = 2;
  player.rowsAfter = 10;
  player.playCurr();
  document.getElementById("prev").onclick = () => player.playPrev.bind(player)();
  document.getElementById("next").onclick = () => player.playNext.bind(player)();
  box.innerHTML = player.playlist.map(x => x.id).toString();
}

const start = () => {
  loadData("get_songs.php", initPlayer);
  document.body.removeEventListener('click', start);
};
document.body.addEventListener('click', start);