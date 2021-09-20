import { Player, Lists } from "./player.js";
import { newElement, makeTable, scrollIfNeeded } from "./utils.js";

export class PlayerDisplay extends Player {
  constructor(audioElement, displayElement, songsLeftElement, pool) {
    super(audioElement, pool);
    this.displayElement = displayElement;
    this.songsLeftElement = songsLeftElement;
    this.tableContainer = newElement('div');
    this.poolTableContainer = newElement('div', {
      id: "poolcontainer",
      classList: ["scroll-container"],
      style: "height: 360px",
    });
    this.displayElement.replaceChildren(this.tableContainer, this.poolTableContainer);
    // default values
    this._rowsBefore = 0; // number of entries to display before current song
    this._rowsAfter = 0;
  }

  buffer() {
    super.buffer();
    this.refreshPlaylist();
  }

  playSong(song) {
    super.playSong(song);
    this.refreshPlaylist();
  }

  autoplayNext() {
    super.autoplayNext();
    this.songsLeftElement.value = this.songsLeft < 0 ? "" : this.songsLeft;
  }

  refreshPlaylist() {
    const table = this.makePlaylistTable();
    this.tableContainer.replaceChildren(table);
    const poolTable = this.makePoolTable();
    this.poolTableContainer.replaceChildren(poolTable);
    if (this.selectedList === Lists.POOL) { // scroll selected element into view for pool
      const currRow = poolTable.children[this.nowPlaying.index];
      scrollIfNeeded(currRow, this.poolTableContainer);
    }
  }

  /**
   * creates an HTML table showing recent/coming up songs
   */
  makePlaylistTable() {
    let entries = [];
    const makeCell = (text, onclick, selected) => ({text, onclick, selected});
    const fromSong = this.currPlaylistLoc - this._rowsBefore;
    const toSong = this.currPlaylistLoc + this._rowsAfter;
    for (let i = fromSong; i <= toSong; i++) {
      let title = '';
      let onclick = () => {};
      let selected = false;
      if (i >= 0 && i < this.playlist.length) {
        title = this.playlist[i].displayName;
        const diff = i - this.currPlaylistLoc;
        if (diff === 0) {
          selected = this.selectedList === Lists.PLAYLIST;
        } else if (diff < 0) {
          onclick = () => this.playPrev.bind(this)(-diff);
        } else {
          onclick = () => this.playNext.bind(this)(diff);
        }
      }
      let cell = makeCell(title, onclick, selected);

      let xtitle = '';
      let xonclick = () => {};
      if (i > this.currPlaylistLoc && i < this.playlist.length) {
        xtitle = "x";
        const diff = i - this.currPlaylistLoc;
        xonclick = () => this.removeSong.bind(this)(diff);
      }
      let xbutton = makeCell(xtitle, xonclick, selected);
      entries.push([cell, xbutton]);
    }
    return makeTable(entries);
  }

  /**
   * creates an HTML table with the entire pool of songs in order
   */
  makePoolTable() {
    let entries = [];
    const makeCell = (text, onclick, selected) => ({text, onclick, selected});
    for (const song of this.pool) {
      const onclick = () => this.playFromPool(song.index);
      const selected = this.selectedList === Lists.POOL && song.index === this.nowPlaying.index;
      const cell = makeCell(song.displayName, onclick, selected);

      const ponclick = () => { this.insertSong(1, song); };
      const pbutton = makeCell("+", ponclick, selected);
      entries.push([cell, pbutton]);
    }
    return makeTable(entries);
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