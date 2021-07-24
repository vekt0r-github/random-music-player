import { randomChoice } from "./utils.js";

export class Player {
  /**
   * Turns audioElement into an audio player which plays
   * random songs from pool
   * @param {HTML element} audioElement 
   * @param {list} pool-- each song is {path, displayName, id}
   * @param {int} bufferSize 
   */
  constructor(audioElement, pool) {
    this.audioElement = audioElement;
    this.pool = pool;
    this.poolSize = pool.length;
    // default values
    this._bufferSize = 0;
    this._autoplay = false; 
    this._volume = 1.0; 
    this._noRepeatNum = 0;
  }

  #bufferOne() {
    console.assert(this._noRepeatNum < this.poolSize);
    const newIndex = randomChoice([...this.availableIndices]);
    if (this._noRepeatNum > 0) {
      const addBackIndex = this.playlist.length - this._noRepeatNum;
      if (addBackIndex >= 0) {
        const oldIndex = this.playlist[addBackIndex].id;
        this.availableIndices.add(oldIndex);
      }
      this.availableIndices.delete(newIndex);
    }
    this.playlist.push(this.pool[newIndex]);
    // console.log(this);
  }

  /**
   * generates future songs, up to buffer specified by this.bufferSize
   */
  buffer() {
    while (this.playlist.length - this.currSong - 1 < this.bufferSize) {
      this.#bufferOne();
    }
  }

  /**
   * regenerates everything after currSong if user doesn't like it
   */
  rebuffer() {
    this.playlist = this.playlist.slice(0, this.currSong + 1);
    this.buffer();
  }

  playPrev(num = 1) {
    this.currSong = Math.max(0, this.currSong - num);
    this.playCurr();
  }

  playCurr() {
    // console.log(this);
    const song = this.playlist[this.currSong];
    this.audioElement.src = song.path;
    this.audioElement.play();
  }

  playNext(num = 1) {
    this.currSong += num;
    this.buffer();
    this.playCurr();
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
    this.audioElement[operation]("ended", () => this.playNext.bind(this)());
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
    this.availableIndices = new Set(this.pool.keys());
    this.buffer();
  }
};