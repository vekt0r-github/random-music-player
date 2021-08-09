import { Player } from "./player.js";

export class PlayerDisplay extends Player {
  constructor(audioElement, displayElement, pool) {
    super(audioElement, pool);
    this.displayElement = displayElement;
    // default values
    this._rowsBefore = 0; // number of entries to display before current song
    this._rowsAfter = 0;
  }

  buffer() {
    super.buffer();
    this.refreshPlaylist();
  }

  playCurr() {
    super.playCurr();
    this.refreshPlaylist();
  }
  
  /**
   * creates an HTML table showing recent/coming up songs
   */
  refreshPlaylist() {
    var table = document.createElement('table');
    table.classList.add("playlist");
    const fromSong = this.currSong - this._rowsBefore;
    const toSong = this.currSong + this._rowsAfter;
    for (var i = fromSong; i <= toSong; i++) {
      var row = document.createElement('tr');
      var cell = document.createElement('td');
      var title = '';
      if (i >= 0 && i < this.playlist.length) {
        title = this.playlist[i].displayName;
        const diff = i - this.currSong;
        if (diff === 0) {
          row.classList.add("selected");
        } else if (diff < 0) {
          // console.log(i + ' is less than ' + this.currSong);
          cell.onclick = () => this.playPrev.bind(this)(-diff);
        } else {
          // console.log(i + ' is more than ' + this.currSong);
          cell.onclick = () => this.playNext.bind(this)(diff);
        }
      }
      cell.innerHTML = title;
      row.appendChild(cell);
      table.appendChild(row);
    }
    const oldChild = this.displayElement.firstChild;
    if (oldChild === null) {
      this.displayElement.appendChild(table);
    } else {
      this.displayElement.replaceChild(table, oldChild);
    }
  }

  get rowsBefore() { return this._rowsBefore; }

  set rowsBefore(value) {
    this._rowsBefore = value;
    this.refreshPlaylist();
  }

  get rowsAfter() { return this._rowsAfter; }

  set rowsAfter(value) {
    this._rowsAfter = value;
    this.bufferSize = value;
    this.refreshPlaylist();
  }

  reset() {
    super.reset();
    this.refreshPlaylist();
  }
}