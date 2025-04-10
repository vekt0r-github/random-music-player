import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { useReducerPromise, useStatePromise } from "../../utils/hooks.js";

import PlayerAudio from "../modules/PlayerAudio.js";
import { Table, VirtualizedTable, CellStyles } from "./Table.js";

import {
  randomChoice,
  getMaybeUnicode,
  SearchField,
  parseQueryString,
  objectMatchesQueries,
} from "../../utils/functions.js";
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
};

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
  const first = results[0],
    last = results[results.length - 1];
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
    } else {
      // there is no equality
      high = split;
    }
  }
  return results[isNext ? high : low];
};

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
  const selectedLocReducerHandler = (state, action) => {
    // action type:
    // {seek: {direction}} OR
    // {set: {list?, index?}}
    let { list, index, playlistIndex } = { ...state, ...action.set };
    if (action.seek) {
      if (state.list === Lists.PLAYLIST) {
        index =
          action.seek.direction === Direction.NEXT ? state.index + 1 : Math.max(state.index - 1, 0);
      } else {
        index = seekToResult(state.index, action.seek.direction, poolSearchResults.current);
      }
    }
    if (list === Lists.PLAYLIST) playlistIndex = index;
    const newState = { list, index, playlistIndex };
    if (Object.keys(newState).every((k) => Object.is(state[k], newState[k]))) {
      return state; // bail out of state update
    }
    return newState;
  };
  const [selectedLoc, dispatchSelectedLoc] = useReducerPromise(selectedLocReducerHandler, {
    list: Lists.PLAYLIST, // active list
    index: 0, // index on current list
    playlistIndex: 0, // index on playlist, for when pool is playing
    nowPlaying: undefined, // computed field
  });
  const [poolSearchQuery, setPoolSearchQuery] = useStatePromise("");
  const [filterToQuery, setFilterToQuery] = useStatePromise(false); // whether rng pulls from search results

  const audioRef = useRef();
  const poolTableRef = useRef();
  const availableIndices = useRef(new Set(props.pool.keys()));

  // computes extra properties on each song in pool
  const pool = useMemo(() => {
    return props.pool.map((song, index) => {
      const maybeUni = (property) => (useUnicode) => getMaybeUnicode(song, property, useUnicode);
      return {
        ...song,
        index: index,
        getArtist: maybeUni("artist"),
        getTitle: maybeUni("title"),
        getDisplayName: maybeUni("displayName"),
      };
    });
  }, [props.pool]);

  const currentList = selectedLoc.list === Lists.PLAYLIST ? playlist : pool;
  const nowPlaying = currentList[selectedLoc.index];

  // try to prefetch next song, in ideal case
  const nextSelectedLoc = selectedLocReducerHandler(selectedLoc, {
    seek: { direction: Direction.NEXT },
  });
  const nextPlaying = currentList[nextSelectedLoc.index]; // list shouldn't change
  useEffect(async () => {
    if (!nextPlaying) return;
    const audio = new Audio();
    if (!nextPlaying.path) {
      // warning: may leak a bit of memory
      await nextPlaying.addPath();
    }
    audio.src = nextPlaying?.path;
    audio.preload = "auto";
    audio.load();
  }, [nextPlaying]);

  /**
   * whenever the song changes, this is responsible for playing it
   * both arguments are required, currently
   */
  const onSelectedLocChange = useCallback(
    async (newSelectedLoc, newPlaylist) => {
      // play() must be invoked as a direct result of onclick/onended
      // to appease iOS, and nowPlaying.path must be computed before that,
      // so this cannot be part of a useEffect()
      const currentList = newSelectedLoc.list === Lists.PLAYLIST ? newPlaylist : pool;
      const nowPlaying = currentList[newSelectedLoc.index];
      if (nowPlaying && !nowPlaying.path) {
        await nowPlaying.addPath(); // compute current song path, if necessary
      }
      if (nowPlaying) {
        audioRef.current.src = nowPlaying.path;
        audioRef.current.preload = "auto";
        audioRef.current.load();
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    },
    [selectedLoc, pool]
  );

  // checks if previous song needed any cleanup
  useEffect(() => {
    // clean up path to prevent memory leak
    if (nowPlaying && nowPlaying.removePath) {
      return nowPlaying.removePath.bind(nowPlaying);
    }
  }, [nowPlaying]);

  poolSearchResults.current = useMemo(() => {
    // find current search results to display
    // should preserve index order
    const queryString = poolSearchQuery.toLowerCase();
    const queries = parseQueryString(queryString);
    if (queries === undefined) return [];
    return pool
      .filter((song) => {
        // console.log(song);
        return objectMatchesQueries(song, queries, {
          fields: {
            artist: new SearchField(),
            title: new SearchField(),
            displayName: new SearchField(),
            creator_name: new SearchField({ kwarg: true }), // for osu
            difficulty: new SearchField({ kwarg: true }),
            folder_name: new SearchField(),
            mode: new SearchField({ kwarg: true, number: true }),
            osu_file_name: new SearchField(),
            song_source: new SearchField(),
            song_tags: new SearchField(),
            length: new SearchField({ kwarg: true, number: true }),
            bpm: new SearchField({ kwarg: true, number: true }),
          },
          ignoreRest: true,
        });
      })
      .map((song) => song.index);
  }, [pool, poolSearchQuery]); // [number] indices filtered from pool

  useEffect(() => {
    if (!(poolSearchResults.current && poolTableRef.current)) return;
    poolTableRef.current.scrollIntoView({
      index: poolSearchResults.current.indexOf(selectedLoc.index),
    });
  }, [pool, poolSearchQuery]);

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
      const recent = newPlaylist.slice(recentCutoff).map((song) => song.index);
      availableIndices.current = new Set([...pool.keys()].filter((x) => !recent.includes(x)));
    }
    while (newPlaylist.length - currPlaylistLoc - 1 < props.rowsAfter) {
      console.assert(noRepeatNum < pool.length);
      console.assert(availableIndices.current.size >= pool.length - noRepeatNum);
      let indices = availableIndices.current;
      if (filterToQuery) {
        indices = poolSearchResults.current.filter((i) => indices.has(i));
      }
      // choose a new random song
      const newSongDefault = newPlaylist[newPlaylist.length - poolSearchResults.current.length];
      let newIndexDefault;
      if (newSongDefault) {
        newIndexDefault = newSongDefault.index;
      }
      const newIndex = randomChoice([...indices]) ?? newIndexDefault;
      if (newIndex === undefined) {
        return;
      } // failsafes

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

  const playFrom = (list, index) => {
    // handle bailing out of state updates manually
    // otherwise callback will still replay the song
    if (list == selectedLoc.list && index == selectedLoc.index) return;
    dispatchSelectedLoc({
      set: { list, index },
    }).then((selectedLoc) => onSelectedLocChange(selectedLoc, playlist));
  };

  const playPrev = () => {
    if (selectedLoc.list == Lists.PLAYLIST && selectedLoc.index == 0) return;
    dispatchSelectedLoc({
      seek: { direction: Direction.PREV },
    }).then((selectedLoc) => onSelectedLocChange(selectedLoc, playlist));
  };

  const playNext = () => {
    dispatchSelectedLoc({
      seek: { direction: Direction.NEXT },
    }).then((selectedLoc) => onSelectedLocChange(selectedLoc, playlist));
  };

  const removeSong = useCallback(
    (relativeNum) => {
      // relative to currSong
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
      buffer({ playlist: newPlaylist });
    },
    [playlist, selectedLoc, buffer, props.noRepeatNum]
  );

  const insertSong = useCallback(
    (relativeNum, song) => {
      // relative to currSong
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
    },
    [playlist, selectedLoc, props.noRepeatNum]
  );

  const reset = async () => {
    availableIndices.current = new Set(props.pool.keys());
    setPoolSearchQuery("");
    setFilterToQuery(false);
    const newPlaylist = await buffer({
      playlist: [],
      index: 0,
    });
    const newSelectedLoc = await dispatchSelectedLoc({
      set: {
        list: Lists.PLAYLIST,
        index: 0,
      },
    });
    onSelectedLocChange(newSelectedLoc, newPlaylist);
  };
  useEffect(reset, [props.pool]);

  // setup for playlist/pool tables
  const currPlaylistLoc = selectedLoc.playlistIndex;
  const playlistSlice = (() => {
    const fromSong = currPlaylistLoc - props.rowsBefore;
    const toSong = currPlaylistLoc + props.rowsAfter;
    if (fromSong >= 0) return playlist.slice(fromSong, toSong + 1);
    const padding = new Array(-fromSong).fill(null);
    return [...padding, ...playlist.slice(0, toSong + 1)];
  })();

  const blankCell = { text: "", onclick: () => {} };
  const playlistColumns = [
    (song, tableIndex) => {
      // song name
      const i = tableIndex + currPlaylistLoc - props.rowsBefore; // playlist index
      if (!song) return blankCell;
      return {
        text: song.getDisplayName(props.useUnicode),
        onclick: () => playFrom(Lists.PLAYLIST, i),
      };
    },
    (song, tableIndex) => {
      // delete button
      const diff = tableIndex - props.rowsBefore;
      if (diff <= 0) return blankCell;
      return {
        text: "x",
        onclick: () => removeSong(diff),
        classes: [CellStyles.THIN],
      };
    },
  ];

  const poolColumns = [
    (song) => {
      // song name
      return {
        text: song.getDisplayName(props.useUnicode),
        onclick: () => playFrom(Lists.POOL, song.index),
      };
    },
    (song) => {
      // add button
      return {
        text: "+",
        onclick: () => insertSong(1, song),
        classes: [CellStyles.THIN],
      };
    },
  ];

  if (!nowPlaying) return <></>;

  return (
    <div className={styles.playerDisplayContainer}>
      <div id="player-container" className={styles.playerContainer}>
        <PlayerAudio
          nowPlaying={nowPlaying}
          playPrev={playPrev}
          playNext={playNext}
          useUnicode={props.useUnicode}
          audioRef={audioRef}
        />
      </div>
      <div id="display-container" className={styles.displayContainer}>
        <div id="playlist-container" className={styles.list}>
          <button className={styles.refreshButton} onClick={rebuffer}>
            regenerate
          </button>
          <label htmlFor="playlist" id={styles.playlistLabel}>
            upcoming songs:
          </label>
          <Table
            id="playlist"
            rows={playlistSlice}
            columns={playlistColumns}
            selected={(i) => selectedLoc.list === Lists.PLAYLIST && i === props.rowsBefore}
            maxHeight={360}
          />
        </div>
        <div id="pool-container" className={styles.list}>
          <WithLabel id="filter-pool-to-query">
            <input
              type="checkbox"
              checked={filterToQuery}
              onChange={(e) => setFilterToQuery(e.target.checked)}
            />
          </WithLabel>
          <WithLabel id="search">
            <>
              <input
                className={styles.poolSearchBar}
                type="text"
                onKeyUp={(e) => setPoolSearchQuery(e.target.value)}
              />
              &nbsp;({poolSearchResults.current.length})
            </>
          </WithLabel>
          <VirtualizedTable
            ref={poolTableRef}
            id="pool"
            rows={pool}
            columns={poolColumns}
            filter={(row, index) => poolSearchResults.current.includes(index)}
            selected={(i) => {
              if (selectedLoc.list !== Lists.POOL) return false;
              // bad and also assumes search results are in order
              return poolSearchResults.current[i] === selectedLoc.index;
            }}
            maxHeight={360}
          />
        </div>
      </div>
    </div>
  );
};

export default Player;
