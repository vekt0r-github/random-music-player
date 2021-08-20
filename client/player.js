import { randomChoice } from "./utils.js";

export class Player {
  /**
   * Turns audioElement into an audio player which plays
   * random songs from pool
   * @param {Element} audioElement 
   * @param {Array} pool-- each song is {path, displayName, id (optional)}
   * @param {Number} bufferSize 
   */
  constructor(audioElement, pool) {
    this.audioElement = audioElement;
    this.pool = [...pool];
    this.pool.forEach((song, index) => { song.index = index; });
    this.poolSize = pool.length;
    // default values
    this._bufferSize = 0;
    this._autoplay = false;
    this._songsLeft = -1; // negative = no limit
    this._volume = 1.0; 
    this._noRepeatNum = 0;
  }

  bufferOne() {
    console.assert(this._noRepeatNum < this.poolSize);
    console.assert(this.availableIndices.size >= this.poolSize - this._noRepeatNum);
    const newIndex = randomChoice([...this.availableIndices]);
    if (this._noRepeatNum > 0) {
      this.availableIndices.delete(newIndex);
      const addBackIndex = this.playlist.length - this._noRepeatNum;
      if (addBackIndex >= 0) {
        const oldIndex = this.playlist[addBackIndex].index;
        this.availableIndices.add(oldIndex);
      }
    }
    this.playlist.push(this.pool[newIndex]);
    // console.log(this);
  }

  /**
   * generates future songs, up to buffer specified by this.bufferSize
   */
  buffer() {
    while (this.playlist.length - this.currSong - 1 < this.bufferSize) {
      this.bufferOne();
    }
  }

  /**
   * regenerates everything after currSong if user doesn't like it
   */
  rebuffer() {
    this.playlist = this.playlist.slice(0, this.currSong + 1);
    const recentCutoff = Math.max(this.currSong - this._noRepeatNum + 1, 0)
    const recent = this.playlist.slice(recentCutoff, this.currSong + 1).map(song => song.index);
    this.availableIndices = new Set([...this.pool.keys()].filter(x => !recent.includes(x)));
    this.buffer();
  }

  playPrev(num = 1) {
    this.currSong = Math.max(0, this.currSong - num);
    this.playCurr();
  }

  playCurr() {
    const song = this.playlist[this.currSong];
    this.audioElement.src = song.path;
    this.audioElement.play();
  }

  playNext(num = 1) {
    this.currSong += num;
    this.buffer();
    this.playCurr();
  }

  autoplayNext() {
    if (this.songsLeft === 0) return;
    this.songsLeft -= 1;
    this.playNext();
  }

  removeSong(relativeNum) { // relative to currSong
    console.assert(relativeNum > 0);
    const index = this.currSong + relativeNum;
    const firstBanIndex = this.playlist.length - this._noRepeatNum;
    if (index >= firstBanIndex) {
      this.availableIndices.add(this.playlist[index].index);
      if (firstBanIndex > 0) {
        this.availableIndices.delete(this.playlist[firstBanIndex - 1].index);
      }
    }
    this.playlist.splice(index, 1);
    this.buffer();
  }

  get bufferSize() { return this._bufferSize; }

  set bufferSize(value) {
    this._bufferSize = value;
    this.buffer();
  }

  get autoplay() { return this._autoplay; }

  set autoplay(value) {
    this._autoplay = value;
    const operation = (value ? 'add' : 'remove') + 'EventListener';
    this.audioElement[operation]("ended", () => this.autoplayNext.bind(this)());
  }

  get songsLeft() { return this._songsLeft; }

  set songsLeft(value) {
    this._songsLeft = value;
  }

  get volume() { return this._volume; }

  set volume(value) {
    this._volume = value;
    this.audioElement.volume = value;
  }

  get noRepeatNum() { return this._noRepeatNum; }

  set noRepeatNum(value) {
    this._noRepeatNum = value;
    this.rebuffer(); // i guess
  }

  reset() {
    this.playlist = [];
    this.currSong = 0;
    this.songsLeft = -1;
    this.availableIndices = new Set(this.pool.keys());
    this.buffer();
  }
};