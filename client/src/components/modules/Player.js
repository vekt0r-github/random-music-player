import React, { Component } from "react";
import ReactDOM from "react-dom";

import SettingInput from "../modules/SettingInput.js";
import Table from "./Table.js";

import { randomChoice, mod } from "../../scripts/utils.js";

import styles from "./Player.css";

export const Lists = Object.freeze({
  PLAYLIST: "playlist",
  POOL: "pool",
});

export default class Player extends Component {
  /**
   * typedefs
   * Song: {path, artist, title, displayName ...}
   *    where displayName = `${artist} - ${title}`
   *    or {path, displayName, ...}
   * 
   * props
   * pool: [Song]
   * noRepeatNum: Number
   * rowsBefore: Number
   * rowsAfter: Number
   * useUnicode: Boolean
   */
  constructor(props) {
    super(props);
    this.newDefaultState = () => ({
      playlist: [],
      currPlaylistLoc: 0, // saved when pool is active
      currPoolLoc: 0, // not saved when playlist is active
      selectedList: Lists.PLAYLIST, // PLAYLIST | POOL
      songsLeftActive: false, // controls whether songsLeft applies
      songsLeft: 0, // how many more songs to autoplay before stopping
      poolSearchQuery: "",
    });

    this.state = this.newDefaultState();

    this.songsLeftInput = React.createRef();
  }

  componentDidMount = () => {
    this.reset();
  }

  componentDidUpdate = (oldProps) => {
    if (oldProps.pool !== this.props.pool) {
      this.reset();
    }
    if (oldProps.noRepeatNum !== this.props.noRepeatNum) {
      this.rebuffer();
    }
    if (oldProps.rowsAfter !== this.props.rowsAfter) {
      this.buffer();
    }
  }

  reset = () => {
    this.pool = this.props.pool.map((song, index) => {
      return {...song, index}; 
    });
    this.poolSize = this.pool.length;
    this.availableIndices = new Set(this.props.pool.keys()),
    this.playerInitialized = false;

    this.setState(this.newDefaultState(), () => {
      this.buffer();
      this.playCurr();
    });
  }

  /**
   * toggles availability
   * if oldIndex == newIndex, then it will be not available
   * 
   * @param {Number} oldIndex to be available again (leaving banned region)
   * @param {Number} newIndex to no longer be available (new to banned region)
   */
  replaceAvailableIndex(oldIndex, newIndex) {
    if (oldIndex !== undefined) this.availableIndices.add(oldIndex);
    if (newIndex !== undefined) this.availableIndices.delete(newIndex);
  }

  /**
   * generates future songs, up to buffer specified by this.props.rowsAfter
   */
  buffer = () => {
    const newPlaylist = [...this.state.playlist];
    while (newPlaylist.length - this.state.currPlaylistLoc - 1 < this.props.rowsAfter) {
      console.assert(this.props.noRepeatNum < this.poolSize);
      console.assert(this.availableIndices.size >= this.poolSize - this.props.noRepeatNum);
      const newIndex = randomChoice([...this.availableIndices]);
      if (this.props.noRepeatNum > 0) {
        let oldIndex;
        const addBackIndex = newPlaylist.length - this.props.noRepeatNum;
        if (addBackIndex >= 0) {
          oldIndex = newPlaylist[addBackIndex].index;
        }
        this.replaceAvailableIndex(oldIndex, newIndex);
      }
      newPlaylist.push(this.pool[newIndex]);
    }
    this.setState({
      playlist: newPlaylist,
    });
  }

  /**
   * regenerates everything after currSong if user doesn't like it
   */
  rebuffer = () => {
    const recentCutoff = Math.max(this.state.currPlaylistLoc - this.props.noRepeatNum + 1, 0)
    const recent = this.state.playlist.slice(recentCutoff, this.state.currPlaylistLoc + 1).map(song => song.index);
    this.availableIndices = new Set([...this.pool.keys()].filter(x => !recent.includes(x))),
    this.setState({
      playlist: this.state.playlist.slice(0, this.state.currPlaylistLoc + 1),
    }, this.buffer);
  }

  onAudioChange = (element) => { // dunno why the element param doesn't work
    this.player = ReactDOM.findDOMNode(element);
    if (this.player && !this.playerInitialized) {
      this.player.volume = 0.2;
      this.playerInitialized = true;
    }
  }

  playFrom = (list, index) => { 
    const property = list === Lists.PLAYLIST
      ? 'currPlaylistLoc'
      : 'currPoolLoc'
    this.setState({
      selectedList: list,
      [property]: index,
    }, () => {
      this.buffer();
      this.player.play();
    });
  }

  playPrev = (num = 1, list) => {
    // if (list) {
    //   this.setState({
    //     selectedList: list,
    //   });
    // }
    console.log(list)
    list = list ?? this.state.selectedList;
    console.log(list)
    if (list === Lists.PLAYLIST) {
      const newLoc = Math.max(0, this.state.currPlaylistLoc - num);
      this.playFrom(Lists.PLAYLIST, newLoc);
    } else {
      const newLoc = mod(this.state.currPoolLoc - num, this.poolSize);
      this.playFrom(Lists.POOL, newLoc);
    }
  }

  playCurr = () => {
    this.playPrev(0); // idk man
  }

  playNext = (num = 1, list) => {
    this.playPrev(-num, list);
    // playFrom buffers every time now
  }

  autoplayNext = () => {
    if (!this.state.songsLeftActive) { this.playNext(); return; }
    if (this.state.songsLeft === 0) { return; }
    this.setState({
      songsLeft: this.state.songsLeft - 1,
    }, () => {
      this.songsLeftInput.current.value = this.state.songsLeft;
      this.playNext();
    });
  }

  removeSong = (relativeNum) => { // relative to currSong
    console.assert(relativeNum > 0);
    const index = this.state.currPlaylistLoc + relativeNum;
    const firstBanIndex = this.state.playlist.length - this.props.noRepeatNum;
    if (index >= firstBanIndex) {
      const oldIndex = this.state.playlist[index].index;
      let newIndex;
      if (firstBanIndex > 0) {
        newIndex = this.state.playlist[firstBanIndex - 1].index;
      }
      this.replaceAvailableIndex(oldIndex, newIndex);
    }
    this.state.playlist.splice(index, 1);
    this.buffer();
  }

  insertSong = (relativeNum, song) => { // relative to currSong
    console.assert(relativeNum > 0);
    const index = this.state.currPlaylistLoc + relativeNum;
    const firstBanIndex = this.state.playlist.length + 1 - this.props.noRepeatNum;
    if (index >= firstBanIndex) {
      const newIndex = this.state.playlist[index].index;
      let oldIndex;
      if (firstBanIndex > 0) {
        oldIndex = this.state.playlist[firstBanIndex - 1].index;
      }
      this.replaceAvailableIndex(oldIndex, newIndex);
    }
    this.state.playlist.splice(index, 0, song);
    this.buffer();
  }

  render = () => {
    console.log(this.state)
    console.log(this.props)
    const maybeUni = (song, property) => {
      let title;
      if (this.props.useUnicode) {
        title = song[`${property}Unicode`];
      }
      return title ?? song[property];
    }
    const makeCell = (text, onclick, selected) => ({text, onclick, selected});
    
    // determine current song
    let nowPlaying;
    if (this.state.selectedList === Lists.PLAYLIST) {
      nowPlaying = this.state.playlist[this.state.currPlaylistLoc];
    } else {
      nowPlaying = this.pool[this.state.currPoolLoc];
    }
    if (nowPlaying === undefined) {
      return <></>
    }

    // compute and refresh metadata
    const artist = maybeUni(nowPlaying, 'artist');
    const title = maybeUni(nowPlaying, 'title') ?? maybeUni(nowPlaying, 'displayName');
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({artist, title});
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
    }

    // make playlist entries
    const playlistEntries = (() => {
      let entries = [];
      const fromSong = this.state.currPlaylistLoc - this.props.rowsBefore;
      const toSong = this.state.currPlaylistLoc + this.props.rowsAfter;
      for (let i = fromSong; i <= toSong; i++) {
        let title = '';
        let onclick = () => {};
        let selected = false;
        if (i >= 0 && i < this.state.playlist.length) {
          title = maybeUni(this.state.playlist[i], 'displayName');
          const diff = i - this.state.currPlaylistLoc;
          if (diff === 0) {
            selected = this.state.selectedList === Lists.PLAYLIST;
            if (!selected) {
              onclick = () => this.playCurr();
            }
          } else {
            onclick = () => {
              this[`play${diff > 0 ? 'Next' : 'Prev'}`](Math.abs(diff), Lists.PLAYLIST);
            };
          }
        }
        let cell = makeCell(title, onclick, selected);
  
        let xtitle = '';
        let xonclick = () => {};
        if (i > this.state.currPlaylistLoc && i < this.state.playlist.length) {
          xtitle = "x";
          const diff = i - this.state.currPlaylistLoc;
          xonclick = () => this.removeSong(diff);
        }
        let xbutton = makeCell(xtitle, xonclick, selected);
        entries.push([cell, xbutton]);
      }
      return entries;
    })();

    // make pool table
    const poolEntries = ((query) => {
      let entries = [];
      const songs = this.pool.filter(song => song.displayName.toLowerCase().includes(query.toLowerCase()));
      for (const song of songs) {
        const onclick = () => this.playFrom(Lists.POOL, song.index);
        const selected = this.state.selectedList === Lists.POOL && song.index === this.state.currPoolLoc;
        const cell = makeCell(maybeUni(song, 'displayName'), onclick, selected);
  
        const ponclick = () => { this.insertSong(1, song); };
        const pbutton = makeCell("+", ponclick, selected);
        entries.push([cell, pbutton]);
      }
      return entries;
    })(this.state.poolSearchQuery);

    return (
      <div className={styles.container}>
        <div id="player-container" className={styles.playerContainer}>
          <audio 
            ref={this.onAudioChange} 
            id="player" 
            className="player-audio"
            src={nowPlaying.path}
            onError={() => this.playNext()}
            onEnded={() => this.autoplayNext()}
            controls
          >
            text if audio doesn't work
            {this.state.selectedList}
            {this.state.currPlaylistLoc}
          </audio>
          <br/>
          <p id="nowPlaying">now playing: {artist ? `${artist} - ${title}` : title}</p>
          <div id="player-buttons">
            <button type="button" id="prev" onClick={() => this.playPrev()}>&lt;</button>
            <button type="button" id="next" onClick={() => this.playNext()}>&gt;</button>
          </div>
          <div id="songs-left-container">
            <SettingInput
              id='enable-timer'
              type='checkbox'
              onInput={(e) => {
                this.setState({
                  songsLeftActive: e.target.checked,
                });
              }}
            />
            {this.state.songsLeftActive ?
              <SettingInput
                ref={this.songsLeftInput}
                id='songs-left'
                type='text'
                defaultValue={this.state.songsLeft}
                onInput={(e) => {
                  let value = parseInt(e.target.value);
                  if (isNaN(value)) { return; }
                  this.setState({
                    songsLeft: value,
                  });
                }}
                onBlur={(e) => { e.target.value = this.state.songsLeft }}
              /> : null}
          </div>
        </div>
        <div id="display-container" className={styles.displayContainer}>
          <div className={styles.list}>
            <label htmlFor="playlist">upcoming songs:</label>
            <Table id="playlist" entries={playlistEntries} />
          </div>
          <div className={styles.list}>
            <SettingInput
              id='search-pool'
              type='text'
              onKeyUp={(e) => this.setState({
                poolSearchQuery: e.target.value,
              })}
            />
            <Table id="pool" entries={poolEntries} maxHeight="360px" />
          </div>
        </div>
      </div>
    )
  }
}