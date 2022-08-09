import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { useReducerPromise, useStatePromise } from "../../utils/hooks.js";

import PlayerAudio from "../modules/PlayerAudio.js";
import Table from "./Table.js";

import { randomChoice, getMaybeUnicode, SearchField, parseQueryString, objectMatchesQueries } from "../../utils/functions.js";
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

export const Status = Object.freeze({
  QUEUED: "playqueued",
  PLAYING: "playing",
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
  const [selectedLoc, dispatchSelectedLoc] = useReducerPromise((state, action) => {
    // action type:
    // {seek: {direction}} OR
    // {set: {list?, index?}}
    let {list, index, playlistIndex} = {...state, ...action.set};
    if (action.seek) {
      if (state.list === Lists.PLAYLIST) {
        index = (action.seek.direction === Direction.NEXT)
          ? state.index + 1
          : Math.max(state.index - 1, 0)
      } else {
        index = seekToResult(state.index, action.seek.direction, poolSearchResults.current);
      }
    }
    if (list === Lists.PLAYLIST) playlistIndex = index;
    return {list, index, playlistIndex};
  }, {
    list: Lists.PLAYLIST, // active list
    index: 0, // index on current list
    playlistIndex: 0, // index on playlist, for when pool is playing
  }); 
  const [playerState, setPlayerState] = useStatePromise({
    song: undefined,
    status: Status.QUEUED,
  });
  const [poolSearchQuery, setPoolSearchQuery] = useStatePromise("");
  const [filterToQuery, setFilterToQuery] = useStatePromise(false); // whether rng pulls from search results
  
  const availableIndices = useRef(new Set(props.pool.keys()));
  const nowPlaying = playerState.song;
  const setPlayerStatus = (status) => {
    return setPlayerState((state) => ({...state, status}));
  };
  
  useEffect(() => {
    console.log(selectedLoc);
    const song = (selectedLoc.list === Lists.PLAYLIST ? playlist : pool)[selectedLoc.index];
    const promises = [];
    if (song && !song.path) promises.push(song.addPath());
    console.log(song, promises)
    Promise.all(promises).then(() => {
      console.log(song, promises)
      setPlayerState({
        song: song,
        status: Status.QUEUED,
      });
    });
    console.log('it was my fault')
    if (song && song.removePath) {
      return song.removePath.bind(song); // cleans up path to prevent memory leak
    }
  }, [selectedLoc]);

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
      // console.log(song);
      return objectMatchesQueries(song, queries, { 
        fields: {
          artist: new SearchField(),
          title: new SearchField(),
          displayName: new SearchField(),
          creator_name: new SearchField({kwarg: true}), // for osu
          difficulty: new SearchField({kwarg: true}),
          folder_name: new SearchField(),
          mode: new SearchField({kwarg: true, number: true}),
          osu_file_name: new SearchField(),
          song_source: new SearchField(),
          song_tags: new SearchField(),
          length: new SearchField({kwarg: true, number: true}),
          bpm: new SearchField({kwarg: true, number: true}),
        },
        ignoreRest: true,
      });
    }).map(song => song.index);
  }, [pool, poolSearchQuery]); // [number] indices filtered from pool

  /**
   * generates future songs, up to buffer specified by props.rowsAfter
   * then sets the resulting playlist
   * 
   * param object options with the following:
   * @param {Song[]?} playlist rebuffer from this state
   * @param {Number} index overrides the index to rebuffer from (but doesn't set the index)
   * @param {boolean?} remakeAvailableIndices recompute before buffering
   */
  const buffer = useCallback((options = {}) => {
    const newPlaylist = options.playlist ?? playlist.slice();
    const currPlaylistLoc = options.index ?? selectedLoc.playlistIndex;
    const noRepeatNum = props.noRepeatNum;
    if (options.remakeAvailableIndices) { 
      const recentCutoff = Math.max(newPlaylist.length - noRepeatNum, 0);
      const recent = newPlaylist.slice(recentCutoff).map(song => song.index);
      availableIndices.current = new Set([...pool.keys()].filter(x => !recent.includes(x)));
    } 
    while (newPlaylist.length - currPlaylistLoc - 1 < props.rowsAfter) {
      console.assert(noRepeatNum < pool.length);
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
  useEffect(buffer, [selectedLoc, props.rowsAfter]);

  const rebuffer = useCallback(() => {
    const newPlaylist = playlist.slice(0, selectedLoc.playlistIndex + 1);
    return buffer({
      playlist: newPlaylist,
      remakeAvailableIndices: true,
    }); // promise
  });
  useEffect(rebuffer, [props.noRepeatNum]);

  const playCurr = () => setPlayerStatus(Status.QUEUED);

  const playFrom = (list, index) => {
    dispatchSelectedLoc({
      set: {list, index},
    });
  };

  const playPrev = () => {
    dispatchSelectedLoc({
      seek: {direction: Direction.PREV},
    });
  };

  const playNext = () => {
    dispatchSelectedLoc({
      seek: {direction: Direction.NEXT},
    });
  };

  const removeSong = useCallback((relativeNum) => { // relative to currSong
    console.assert(relativeNum > 0);
    const index = selectedLoc.playlistIndex + relativeNum;
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
    buffer({playlist});
  }, [playlist, selectedLoc, buffer, props.noRepeatNum]);

  const insertSong = useCallback((relativeNum, song) => { // relative to currSong
    console.assert(relativeNum > 0);
    const index = selectedLoc.playlistIndex + relativeNum;
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
  }, [playlist, selectedLoc, props.noRepeatNum]);

  const reset = async () => {
    availableIndices.current = new Set(props.pool.keys());
    setPoolSearchQuery("");
    setFilterToQuery(false);
    await buffer({
      playlist: [],
      index: 0,
    });
    await dispatchSelectedLoc({
      set: {
        list: Lists.PLAYLIST,
        index: 0,
      },
    });
  };
  useEffect(reset, [props.pool]);


  // make playlist/pool tables
  const makeCell = (text, onclick, selected) => ({text, onclick, selected});
  const playlistEntries = (() => {
    const currPlaylistLoc = selectedLoc.playlistIndex;
    let entries = [];
    const fromSong = currPlaylistLoc - props.rowsBefore;
    const toSong = currPlaylistLoc + props.rowsAfter;
    for (let i = fromSong; i <= toSong; i++) {
      let title = '';
      let onclick = () => playFrom(Lists.PLAYLIST, i);
      let selected = false;
      if (i >= 0 && i < playlist.length) {
        title = playlist[i].getDisplayName(props.useUnicode);
        if (i === currPlaylistLoc && selectedLoc.list === Lists.PLAYLIST) {
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

  const poolEntries = (() => {
    let entries = [];
    poolSearchResults.current.forEach((poolIndex, index) => {
      const song = pool[poolIndex];
      let onclick = () => playFrom(Lists.POOL, poolIndex);
      let selected = false;
      if (selectedLoc.list === Lists.POOL && nowPlaying && poolIndex === nowPlaying.index) {
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
          nowPlaying={nowPlaying}
          playPrev={playPrev}
          playNext={playNext}
          useUnicode={props.useUnicode}
          status={playerState.status}
          setStatus={setPlayerStatus}
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
              checked={filterToQuery}
              onChange={(e) => setFilterToQuery(e.target.checked)}
            />
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