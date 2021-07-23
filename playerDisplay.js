import { Player } from "./player.js";

export class PlayerDisplay extends Player {
  constructor(audioElement, displayElement, pool) {
    super(audioElement, pool);
    this.displayElement = displayElement;
    // default values
    this._rowsBefore = 0; // number of entries to display before current song
    this._rowsAfter = 0;
  }

  /**
   * creates an HTML table showing recent/coming up songs
   */
  #makePlaylist() {
    // console.log(this.playlist);
    var output = '<table class="playlist">';
    const fromSong = this.currSong - this._rowsBefore;
    const toSong = this.currSong + this._rowsAfter;
    for (var i = fromSong; i <= toSong; i++) {
      var title = ' ';
      if (i >= 0 && i < this.playlist.length) {
        title = this.playlist[i].displayName;
      }
      const rowClass = i == this.currSong ? ' class="selected"' : '';
      output += `<tr${rowClass}><td>${title}</td></tr>`;
    }
    output += '</table>';
    return output;
  };

  playCurr() {
    super.playCurr();
    this.refreshPlaylist();
  }
  
  refreshPlaylist() {
    // console.log('hi');
    this.displayElement.innerHTML = this.#makePlaylist();
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
    // console.log(this);
    // console.log(super.reset);
    super.reset();
    this.refreshPlaylist();
  }
}