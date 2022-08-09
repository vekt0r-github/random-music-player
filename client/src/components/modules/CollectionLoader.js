import React, { Component } from "react";

import { WithLabel } from "../../utils/components.js";

import { saveAs } from "file-saver";
import JSZip from "jszip";
import MP3Tag from "mp3tag.js";
import OsuDBParser from "osu-db-parser";

import Table from "./Table.js";

import { 
  addDisplayName,
  getMaybeUnicode,
  readFileBinary,
  toBuffer,
  getAudioHandle
} from "../../utils/functions.js";

import styles from "./CollectionLoader.css";

const Messages = Object.freeze({
  NOSELECT: "no directory selected",
  LOADING: "now loading!!!!",
  LOADED: "collections loaded!",
  ERROR: "something went wrong (need an osu! installation root directory)"
});

const makeLoadingMsg = (fn, progress) => `${Messages.LOADING} ('${fn}' ${(progress*100).toFixed(1)}%)`

/**
 * uses osu-db-parser to parse osu!.db and collection.db
 * from selected folder
 * @param {Object} { osuFile, collectionFile } 
 * @returns {Object} { osuData, collectionData }, where
 * osuData = { beatmaps, folder_count, osuver, username }
 * collectionData = { collection, osuver }
 */
const parseDB = ({osuFile, collectionFile}) => {
  const osuBuffer = toBuffer(osuFile);
  const collectionBuffer = toBuffer(collectionFile);
  const parser = new OsuDBParser(osuBuffer, collectionBuffer);
  const osuData = parser.getOsuDBData();
  const collectionData = parser.getCollectionData();
  return {osuData, collectionData};
}

/**
 * gets the (rounded to 2 digits) bpm of a map; for now just using the first bpm like site does
 * @param {[Number, Number, boolean][]} timingPoints ms/beat, timestamp, is red
 */
const getBPM = (timingPoints) => {
  if (!timingPoints || !timingPoints[0]) return 0;
  const beatLengthMs = timingPoints[0][0];
  const bpm = Math.round(100 * 60000 / beatLengthMs) / 100;
  return bpm;
}

export default class CollectionLoader extends Component {
  /**
   * props
   * onCollectionsLoaded: (beatmaps, collections) => {}
   * useUnicode: bool
   */
  constructor(props) {
    super(props);
    this.state = {
      status: Messages.NOSELECT,
      osuDirectoryHandle: undefined,
      beatmaps: undefined,
      collections: undefined,
      selectedCollection: undefined,
      useMetadata: false, // for download
    };
  }

  onOsuSelectClick = async () => {
    const osuDirectoryHandle = await window.showDirectoryPicker();
    this.setState({ 
      status: Messages.LOADING,
      osuDirectoryHandle: osuDirectoryHandle,
    });
    const getBinaryFile = async (fn) => {
      const fileHandle = await osuDirectoryHandle.getFileHandle(fn);
      const file = await fileHandle.getFile();
      return await readFileBinary(file, (progress) => {
        this.setState({status: makeLoadingMsg(fn, progress)});
      });
    }
    const osuFile = await getBinaryFile("osu!.db");
    const collectionFile = await getBinaryFile("collection.db");
    
    const {osuData, collectionData} = parseDB({osuFile, collectionFile});
    if (!osuData || !osuData.beatmaps || !collectionData || !collectionData.collection) {
      this.setState({ 
        status: Messages.ERROR,
      });
      return;
    } 
    const beatmaps = osuData.beatmaps;
    let collections = collectionData.collection;
    console.log(osuData);
    console.log(collectionData);

    const allSongs = new Map();
    for (const bm of beatmaps) {
      const key = `${bm.artist_name} - ${bm.song_title} | ${bm.folder_name}/${bm.audio_file_name}`;
      allSongs.set(key, bm.md5);
    }
    collections.unshift({
      name: "<all songs>",
      beatmapsCount: allSongs.size,
      beatmapsMd5: [...allSongs.values()]
    });
    this.setState({
      status: Messages.LOADED,
      beatmaps: beatmaps,
      collections: collections,
    });
  };

  isLoaded = () => {
    return this.state.status === Messages.LOADED;
  }

  /**
   * get all beatmaps in selected collection
   * @returns list of beatmap objects
   */
  selectedBeatmaps = () => {
    if (this.state.selectedCollection === undefined) { return null; }
    const collection = this.state.collections[this.state.selectedCollection];
    const hashes = new Set(collection.beatmapsMd5);
    return this.state.beatmaps.filter((beatmap) => hashes.has(beatmap.md5));
  }

  /**
   * makes the pool at the current time, with selected collection
   * @returns pool, as [Song]
   */
  makePool = async () => {
    const beatmaps = this.selectedBeatmaps();
    if (beatmaps === null) { return; }
    const pool = await Promise.all(beatmaps.map(async (beatmap) => {
      const makeURL = async () => {
        const handle = await getAudioHandle(this.state.osuDirectoryHandle, beatmap);
        if (!handle) return null; // silently remove beatmap
        const url = await handle.getFile().then(URL.createObjectURL);
        return url;
      }
      const song = {
        async addPath() {
          this.path = await makeURL();
        },
        removePath() {
          URL.revokeObjectURL(this.path);
          delete this.path;
        },
        artistUnicode: beatmap.artist_name_unicode,
        titleUnicode: beatmap.song_title_unicode,
        artist: beatmap.artist_name,
        title: beatmap.song_title,
        bpm: getBPM(beatmap.timing_points),
        length: beatmap.total_time / 1000,
        ...beatmap // throw in everything else for searching purposes
      }
      return addDisplayName(song);
    }));
    return pool.filter(song => song !== null);
  }

  /**
   * download all beatmaps in selected collection as .zip
   */
  downloadMusic = async () => {
    const pool = await this.makePool();
    if (pool === null) { return; }
    let zip = new JSZip();
    await Promise.all(pool.map(async (song) => {
      const maybeUni = (prop) => getMaybeUnicode(song, prop, this.props.useUnicode);
      const blob = await fetch(song.path).then(r => r.blob());
      const fn = `${maybeUni('displayName')}.mp3`;
      let file = new File([blob], fn);
      if (this.state.useMetadata) { // write metadata
        const bin = await readFileBinary(file);
        const mp3tag = new MP3Tag(toBuffer(bin), /* verbose= */ false);
        mp3tag.read();
        if (mp3tag.error !== '') {
          console.log(mp3tag.error);
        } else { 
          mp3tag.tags.title = maybeUni('title');
          mp3tag.tags.artist = maybeUni('artist');
          const buf = mp3tag.save();
          file = new File([buf], fn); // convert buffer back into file
        }
      }
      zip.file(fn, file);
    }));
    const zipContent = await zip.generateAsync({ type: "blob" })
    const collection = this.state.collections[this.state.selectedCollection];
    saveAs(zipContent, `${collection.name}.zip`);
  }

  downloadMetadata = async () => {
    const pool = await this.makePool();
    pool.map((song) => {
      delete song.path; // for creating .json
    });
    const poolFn = "songs.json";
    const poolFile = new File([JSON.stringify(pool, null, 4)], poolFn, {type: "text/json"});
    saveAs(poolFile, poolFn);
  }

  render = () => {
    // make the collection table (keeping the outside scroll container in the same place)
    let collectionSelectTable;
    if (this.isLoaded()) {
      const entries = this.state.collections.map((collection, index) => [{
        text: `${collection.name} (${collection.beatmapsCount})`,
        onclick: () => {
          this.setState({
            selectedCollection: index,
          });
        },
        selected: this.state.selectedCollection === index,
      }]);
      collectionSelectTable = <Table entries={entries} maxHeight="360px"/>;
    }

    return (
      <div id="osu-container" className={styles.loader}>
        <div id="folder-select-container">
          <button type="button" onClick={this.onOsuSelectClick}>select osu! folder</button>
          <span> {this.state.status}</span>
        </div>
        {this.isLoaded() ? 
          <div id="collection-select-container">
            <label htmlFor="collection-select">collections:</label>
            <div id="collection-select">{collectionSelectTable}</div>
            <WithLabel id='write-metadata-to-audio-files'>
              <input
                type='checkbox'
                defaultChecked={this.state.useMetadata}
                onChange={(e) => {
                  this.setState({
                    useMetadata: e.target.checked,
                  });
                }} />
            </WithLabel>
            <div>
              <button
                type="button"
                aria-describedby="dl-desc"
                className={styles.downloadButton}
                onClick={this.downloadMusic}
                >download</button>
              <button
                type="button"
                aria-describedby="dl-desc"
                className={styles.downloadButton}
                onClick={this.downloadMetadata}
                >dl data file</button>
            </div>
            <div role="tooltip" id="dl-desc" className={styles.tooltip}>
              download all songs in collection as .zip 
              (filenames affected by "use unicode" checkbox)
            </div> 
          </div> : null}
      </div>
    );
  }
}