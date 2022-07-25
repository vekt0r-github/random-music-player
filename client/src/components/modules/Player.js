import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { useReducerPromise, useStatePromise } from "../../utils/hooks.js";

import PlayerAudio from "../modules/PlayerAudio.js";
import Table from "./Table.js";

import { randomChoice, mod, getMaybeUnicode, parseQueryString, objectMatchesQueries } from "../../utils/functions.js";
import { WithLabel } from "../../utils/components.js";

import styles from "./Player.css";

export const Lists = Object.freeze({
  PLAYLIST: "playlist",
  POOL: "pool",
});

export const Direction = Object.freeze({
  NEXT: "next",
  PREV: "prev",
});

/**
 * toggles availability
 * if oldIndex == newIndex, then it will be not available
 * 
 * @param {Set<Number>} availableIndices complement of banned region
 * @param {Number} oldIndex to be available again (leaving banned region)
 * @param {Number} newIndex to no longer be available (new to banned region)
 */
const replaceAvailableIndex = (availableIndices, oldIndex, newIndex) => {
  if (oldIndex !== undefined) availableIndices.add(oldIndex);
  if (newIndex !== undefined) availableIndices.delete(newIndex);
}

/**
 * seeks to strictly next or previous entry in results, cyclically
 * 
 * @param {Number} value integer
 * @param {Direction} direction to seek
 * @param {Number[]} results must be sorted integers (and nonempty if originalResults is unset)
 * @returns value
 */
const seekToResult = (value, direction, results) => {
  const isNext = direction === Direction.NEXT;
  value += isNext ? 0.5 : -0.5; // avoid collisions
  const first = results[0], last = results[results.length - 1];
  if (value < first || value > last) {
    return isNext ? first : last;
  }
  let low = 0;
  let high = results.length - 1;
  while (high - low > 1) {
    const split = Math.floor((low + high) / 2);
    const splitValue = results[split]; // integer
    if (value > splitValue) {
      low = split;
    } else { // there is no equality
      high = split;
    } 
  }
  return results[isNext ? high : low];
}

const Player = (props) => {
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
  const poolSearchResults = useRef();

  const [playlist, setPlaylist] = useStatePromise([]);
  const [currLoc, dispatchCurrLoc] = useReducerPromise((state, action) => {
    // action type:
    // {seek: {direction}} OR
    // {set: {list?, index}}
    let newList = state.list;
    let newIndex = state.index;
    if (action.set) {
      if (action.set.list) newList = action.set.list;
      newIndex = action.set.index;
    } else {
      if (state.list === Lists.PLAYLIST) {
        newIndex = action.seek.direction === Direction.NEXT
          ? state.index + 1
          : Math.max(state.index - 1, 0)
      } else {
        newIndex = seekToResult(state.index, action.seek.direction, poolSearchResults.current);
      }
    }
    return {
      list: newList,
      index: newIndex,
      playlistIndex: newList === Lists.PLAYLIST ? newIndex : state.playlistIndex,
    };
  }, {
    list: Lists.PLAYLIST, // active list
    index: 0, // index on current list
    playlistIndex: 0, // index on playlist, for when pool is playing
  }); 
  const [poolSearchQuery, setPoolSearchQuery] = useStatePromise("");
  const [filterToQuery, setFilterToQuery] = useStatePromise(false); // whether rng pulls from search results
  const playerAudio = useRef();
  const availableIndices = useRef(new Set(props.pool.keys()));
  console.log(currLoc)

  const pool = useMemo(() => {
    return props.pool.map((song, index) => {
      const maybeUni = (property) => (useUnicode) => 
        getMaybeUnicode(song, property, useUnicode);
      return {
        ...song,
        index: index,
        getArtist: maybeUni('artist'),
        getTitle: maybeUni('title'),
        getDisplayName: maybeUni('displayName'),
      }; 
    });
  }, [props.pool]);

  poolSearchResults.current = useMemo(() => {
    // find current search results to display
    // should preserve index order
    const queryString = poolSearchQuery.toLowerCase();
    const queries = parseQueryString(queryString);
    if (queries === undefined) return [];
    return pool.filter(song => {
      return objectMatchesQueries(song, queries, { 
        fields: [
          "artist",
          "title",
          "displayName",
          "creator_name", // for osu
          "difficulty",
          "folder_name",
          "mode",
          "osu_file_name",
          "song_source",
          "song_tags",
        ] 
      });
    }).map(song => song.index);
  }, [pool, poolSearchQuery]); // [number] indices filtered from pool

  // determine current song
  const nowPlaying = (currLoc.list === Lists.PLAYLIST ? playlist : pool)[currLoc.index];

  /**
   * generates future songs, up to buffer specified by props.rowsAfter
   * then sets the resulting playlist
   * 
   * @param {Song[]?} newPlaylist rebuffer from this state
   * @param {boolean} remakeAvailableIndices recompute before buffering
   */
  const buffer = useCallback((newPlaylist, remakeAvailableIndices = false) => {
    const currPlaylistLoc = currLoc.playlistIndex;
    const noRepeatNum = props.noRepeatNum;
    newPlaylist = newPlaylist ?? playlist.slice();
    if (remakeAvailableIndices) { 
      const recentCutoff = Math.max(newPlaylist.length - noRepeatNum, 0);
      const recent = newPlaylist.slice(recentCutoff).map(song => song.index);
      availableIndices.current = new Set([...pool.keys()].filter(x => !recent.includes(x)));
    } 
    console.log('buffering', currPlaylistLoc, newPlaylist)
    while (newPlaylist.length - currPlaylistLoc - 1 < props.rowsAfter) {
      console.assert(noRepeatNum < pool.length);
      console.log(availableIndices.current, pool.length, noRepeatNum)
      console.assert(availableIndices.current.size >= pool.length - noRepeatNum);
      let indices = availableIndices.current;
      if (filterToQuery) {
        indices = poolSearchResults.current.filter(i => indices.has(i));
      }
      // choose a new random song
      const newSongDefault = newPlaylist[newPlaylist.length - poolSearchResults.current.length];
      let newIndexDefault;
      if (newSongDefault) { newIndexDefault = newSongDefault.index; }
      const newIndex = randomChoice([...indices]) ?? newIndexDefault;
      if (newIndex === undefined) { return; } // failsafes

      if (props.noRepeatNum > 0) {
        let oldIndex;
        const addBackIndex = newPlaylist.length - noRepeatNum;
        if (addBackIndex >= 0) {
          oldIndex = newPlaylist[addBackIndex].index;
        }
        replaceAvailableIndex(availableIndices.current, oldIndex, newIndex);
      }
      newPlaylist.push(pool[newIndex]);
    }
    return setPlaylist(newPlaylist); // promise
  });
  useEffect(buffer, [currLoc, props.rowsAfter]);

  const rebuffer = useCallback(() => {
    const newPlaylist = playlist.slice(0, currLoc.playlistIndex + 1);
    return buffer(newPlaylist, true); // promise
  });
  useEffect(rebuffer, [props.noRepeatNum]);

  const playCurr = () => {
    playerAudio.current.play();
  };

  const playFrom = (list, index) => {
    dispatchCurrLoc({
      set: {list, index},
    }).then(() => {
      playCurr();
    });
  };

  const playPrev = () => {
    dispatchCurrLoc({
      seek: {direction: Direction.PREV},
    }).then(() => {
      playCurr();
    });
  };

  const playNext = () => {
    dispatchCurrLoc({
      seek: {direction: Direction.NEXT},
    }).then(() => {
      playCurr();
    });
  };

  const removeSong = useCallback((relativeNum) => { // relative to currSong
    console.assert(relativeNum > 0);
    const index = currLoc.playlistIndex + relativeNum;
    const firstBanIndex = playlist.length - props.noRepeatNum;
    if (index >= firstBanIndex) {
      const oldIndex = playlist[index].index;
      let newIndex;
      if (firstBanIndex > 0) {
        newIndex = playlist[firstBanIndex - 1].index;
      }
      replaceAvailableIndex(availableIndices.current, oldIndex, newIndex);
    }
    const newPlaylist = [...playlist];
    newPlaylist.splice(index, 1);
    buffer(newPlaylist);
  }, [playlist, currLoc, buffer, props.noRepeatNum]);

  const insertSong = useCallback((relativeNum, song) => { // relative to currSong
    console.assert(relativeNum > 0);
    const index = currLoc.playlistIndex + relativeNum;
    const firstBanIndex = playlist.length + 1 - props.noRepeatNum;
    if (index >= firstBanIndex) {
      const newIndex = playlist[index].index;
      let oldIndex;
      if (firstBanIndex > 0) {
        oldIndex = playlist[firstBanIndex - 1].index;
      }
      replaceAvailableIndex(availableIndices.current, oldIndex, newIndex);
    }
    const newPlaylist = [...playlist];
    newPlaylist.splice(index, 0, song);
    setPlaylist(newPlaylist);
  }, [playlist, currLoc, props.noRepeatNum]);

  const reset = async () => {
    availableIndices.current = new Set(props.pool.keys());
    setPoolSearchQuery("");
    setFilterToQuery(false);
    await dispatchCurrLoc({
      set: {
        list: Lists.PLAYLIST,
        index: 0,
      }
    });
    await buffer([]);
    playCurr();
  };
  useEffect(reset, [props.pool]);

  const makeCell = (text, onclick, selected) => ({text, onclick, selected});
  
  // make playlist entries
  const playlistEntries = (() => {
    const currPlaylistLoc = currLoc.playlistIndex;
    let entries = [];
    const fromSong = currPlaylistLoc - props.rowsBefore;
    const toSong = currPlaylistLoc + props.rowsAfter;
    for (let i = fromSong; i <= toSong; i++) {
      let title = '';
      let onclick = () => playFrom(Lists.PLAYLIST, i);
      let selected = false;
      if (i >= 0 && i < playlist.length) {
        title = playlist[i].getDisplayName(props.useUnicode);
        if (i === currPlaylistLoc && currLoc.list === Lists.PLAYLIST) {
          selected = true;
          onclick = () => {};
        }
      }
      let cell = makeCell(title, onclick, selected);

      let xtitle = '';
      let xonclick = () => {};
      if (i > currPlaylistLoc && i < playlist.length) {
        xtitle = "x";
        const diff = i - currPlaylistLoc;
        xonclick = () => removeSong(diff);
      }
      let xbutton = makeCell(xtitle, xonclick, selected);
      entries.push([cell, xbutton]);
    }
    return entries;
  })();

  // make pool table
  const poolEntries = (() => {
    let entries = [];
    poolSearchResults.current.forEach((poolIndex, index) => {
      const song = pool[poolIndex];
      let onclick = () => playFrom(Lists.POOL, poolIndex);
      let selected = false;
      if (currLoc.list === Lists.POOL && nowPlaying && poolIndex === nowPlaying.index) {
        selected = true;
        onclick = () => {};
      }
      const cell = makeCell(song.getDisplayName(props.useUnicode), onclick, selected);

      const ponclick = () => { insertSong(1, song); };
      const pbutton = makeCell("+", ponclick, selected);
      entries.push({
        key: poolIndex,
        cellEntries: [cell, pbutton],
      });
    });
    return entries;
  })();

  if (!nowPlaying) return <></>

  return (
    <div className={styles.playerDisplayContainer}>
      <div id="player-container" className={styles.playerContainer}>
        <PlayerAudio
          ref={playerAudio}
          nowPlaying={nowPlaying}
          playPrev={playPrev}
          playNext={playNext}
          useUnicode={props.useUnicode}
        />
      </div>
      <div id="display-container" className={styles.displayContainer}>
        <div id="playlist-container" className={styles.list}>
          <button className={styles.refreshButton} onClick={rebuffer}>regenerate</button>
          <label htmlFor="playlist" id={styles.playlistLabel}>upcoming songs:</label>
          <Table id="playlist" entries={playlistEntries} maxHeight="360px" />
        </div>
        <div id="pool-container" className={styles.list}>
          <WithLabel id='filter-pool-to-query'>
            <input
              type='checkbox'
              onInput={(e) => setFilterToQuery(e.target.checked)} />
          </WithLabel>
          <WithLabel id='search'>
            <>
              <input
                className={styles.poolSearchBar}
                type='text'
                onKeyUp={(e) => setPoolSearchQuery(e.target.value)}
                />
              &nbsp;({poolEntries.length})
            </>
          </WithLabel>
          <Table id="pool" entries={poolEntries} maxHeight="360px" />
        </div>
      </div>
    </div>
  )
}

export default Player;