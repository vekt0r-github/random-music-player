import React, { Component } from "react";

import PlayerAudio from "../modules/PlayerAudio.js";
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
      currPlaylistLoc: 0, // saved when pool is active, unlike currPoolLoc
      currPoolLoc: 0, // position in *display* pool-- possibly NOT an integer!
      selectedList: Lists.PLAYLIST, // PLAYLIST | POOL
      poolSearchQuery: "",
      filterToQuery: false, // whether rng pulls from search results
    });

    this.state = this.newDefaultState();

    this.playerAudio = React.createRef();
    this.nowPlaying = undefined;
  }

  componentDidMount = () => {
    this.reset();
  }

  componentDidUpdate = (oldProps) => {
    const diffProps = (prop) => oldProps[prop] !== this.props[prop];
    if (diffProps('pool')) {
      this.reset();
      return;
    }
    if (diffProps('noRepeatNum')) {
      this.rebuffer();
    } 
    if (diffProps('rowAfter')) {
      this.buffer();
    }
  }

  reset = () => {
    this.pool = this.props.pool.map((song, index) => {
      return {...song, index}; 
    });
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
   * find current search results to display
   * should preserve index order
   * @returns [Song] filtered from pool
   */
  poolSearchResults(newQuery) {
    const query = (newQuery ?? this.state.poolSearchQuery).toLowerCase();
    return this.pool.filter(song => {
      return song.displayName.toLowerCase().includes(query); // not unicode
    });
  }

  /**
   * recomputes pool loc for the search query
   */
  onQueryChange(newQuery) {
    if (newQuery === this.state.poolSearchQuery) { return; }
    let indices = this.poolSearchResults(newQuery);
    indices = indices.filter(song => song.index <= this.nowPlaying.index);
    let newLoc;
    console.log(indices)
    console.log(indices.slice(-1).index, this.nowPlaying.index)
    if (indices.length && indices.slice(-1)[0].index === this.nowPlaying.index) {
      newLoc = indices.length - 1; // on an entry
    } else {
      newLoc = indices.length - 0.5; // between entries
    }
    this.setState({
      currPoolLoc: newLoc,
      poolSearchQuery: newQuery,
    });
  }

  /**
   * generates future songs, up to buffer specified by this.props.rowsAfter
   */
  buffer = () => {
    const poolResults = this.poolSearchResults();
    const noRepeatNum = this.props.noRepeatNum;
    const newPlaylist = [...this.state.playlist];
    while (newPlaylist.length - this.state.currPlaylistLoc - 1 < this.props.rowsAfter) {
      console.assert(noRepeatNum < this.pool.length);
      console.assert(this.availableIndices.size >= this.pool.length - noRepeatNum);
      let indices = this.availableIndices;
      if (this.state.filterToQuery) {
        indices = poolResults.map(song => song.index).filter(i => indices.has(i));
      }
      // choose a new random song
      const newSongDefault = newPlaylist[newPlaylist.length - poolResults.length];
      let newIndexDefault;
      if (newSongDefault) { newIndexDefault = newSongDefault.index; }
      const newIndex = randomChoice([...indices]) ?? newIndexDefault;
      if (newIndex === undefined) { return; } // failsafes

      if (this.props.noRepeatNum > 0) {
        let oldIndex;
        const addBackIndex = newPlaylist.length - noRepeatNum;
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

  playFrom = (list, index) => { 
    const property = list === Lists.PLAYLIST
      ? 'currPlaylistLoc'
      : 'currPoolLoc'
    this.setState({
      selectedList: list,
      [property]: index,
    }, () => {
      this.buffer();
      this.playerAudio.current.play();
    });
  }

  playPrev = (num = 1, list) => {
    list = list ?? this.state.selectedList;
    if (list === Lists.PLAYLIST) {
      const newLoc = Math.max(0, this.state.currPlaylistLoc - num);
      this.playFrom(Lists.PLAYLIST, newLoc);
    } else {
      const poolLoc = Math.ceil(this.state.currPoolLoc);
      const newLoc = mod(poolLoc - num, this.poolSearchResults().length);
      this.playFrom(Lists.POOL, newLoc);
    }
  }

  playCurr = () => {
    const list = this.state.selectedList;
    if (list === Lists.PLAYLIST) {
      this.playFrom(Lists.PLAYLIST, this.state.currPlaylistLoc);
    } else {
      const poolLoc = this.state.currPoolLoc;
      if (!Number.isInteger(poolLoc)) { return; }
      this.playFrom(Lists.POOL, poolLoc);
    }
  }

  playNext = (num = 1, list) => {
    list = list ?? this.state.selectedList;
    if (list === Lists.PLAYLIST) {
      const newLoc = Math.max(0, this.state.currPlaylistLoc + num);
      this.playFrom(Lists.PLAYLIST, newLoc);
    } else {
      const poolLoc = Math.floor(this.state.currPoolLoc);
      const newLoc = mod(poolLoc + num, this.poolSearchResults().length);
      this.playFrom(Lists.POOL, newLoc);
    }
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
    if (!this.pool) { return <></>; }

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
    console.log(this.nowPlaying);
    console.log(this.state.currPoolLoc)
    if (this.state.selectedList === Lists.PLAYLIST) {
      this.nowPlaying = this.state.playlist[this.state.currPlaylistLoc];
    } else if (Number.isInteger(this.state.currPoolLoc)) {
      this.nowPlaying = this.poolSearchResults()[this.state.currPoolLoc];
    } // else current song is not in current pool view-- do not change
    if (!this.nowPlaying) { return <></>; }
    const nowPlaying = this.nowPlaying;

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
    const poolEntries = (() => {
      let entries = [];
      this.poolSearchResults().forEach((song, index) => {
        const onclick = () => this.playFrom(Lists.POOL, index);
        const selected = this.state.selectedList === Lists.POOL && index === this.state.currPoolLoc;
        const cell = makeCell(maybeUni(song, 'displayName'), onclick, selected);
  
        const ponclick = () => { this.insertSong(1, song); };
        const pbutton = makeCell("+", ponclick, selected);
        entries.push([cell, pbutton]);
      });
      return entries;
    })();

    return (
      <div className={styles.playerDisplayContainer}>
        <div id="player-container" className={styles.playerContainer}>
          <PlayerAudio
            ref={this.playerAudio}
            nowPlaying={nowPlaying}
            playPrev={() => this.playPrev()}
            playNext={() => this.playNext()}
            useUnicode={this.props.useUnicode}
          />
        </div>
        <div id="display-container" className={styles.displayContainer}>
          <div id="playlist-container" className={styles.list}>
            <button className={styles.refreshButton} onClick={() => this.rebuffer()}>regenerate</button>
            <label htmlFor="playlist" id={styles.playlistLabel}>upcoming songs:</label>
            <Table id="playlist" entries={playlistEntries} maxHeight="360px" />
          </div>
          <div id="pool-container" className={styles.list}>
            <SettingInput
              id='filter-to-query'
              type='checkbox'
              onInput={(e) => {
                this.setState({
                  filterToQuery: e.target.checked,
                });
              }}
            />
            <SettingInput
              id='search-pool'
              type='text'
              onKeyUp={(e) => this.onQueryChange(e.target.value)}
            />
            <Table id="pool" entries={poolEntries} maxHeight="360px" />
          </div>
        </div>
      </div>
    )
  }
}