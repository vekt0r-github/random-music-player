import React, { Component } from "react";

import { WithLabel } from "../../utils/components.js";

import { saveAs } from "file-saver";
import JSZip from "jszip";
import MP3Tag from "mp3tag.js";
import { OsuDBParser } from "osu-db-parser";

import { Table } from "./Table.js";

import {
  addDisplayName,
  getMaybeUnicode,
  readFileBinary,
  toBuffer,
  getAudioHandle,
  getAudioPath,
  toSafeFilename,
} from "../../utils/functions.js";

import styles from "./CollectionLoader.css";
import { get } from "../../utils/requests.js";

const Status = Object.freeze({
  NO_SELECT: "no_select",
  LOADING: "loading",
  LOADED: "loaded",
  ERROR: "error",
});

/**
 * render helper for component's current status
 * @param {Status} status
 * @param {{filename: string, progress: float}} loadingStatus
 * @param {bool} loadFromServer
 * @returns string to display
 */
const makeStatusMsg = (status, loadingStatus = undefined, loadFromServer = false) => {
  switch (status) {
    case Status.NO_SELECT:
      return loadFromServer ? "not yet fetched" : "no directory selected";
    case Status.LOADING:
      const loadingMsg = "now loading!!!!";
      if (loadingStatus) {
        const { filename, progress } = loadingStatus;
        return `${loadingMsg} ('${filename}' ${(progress * 100).toFixed(1)}%)`;
      }
      return loadingMsg;
    case Status.LOADED:
      return "collections loaded!";
    case Status.ERROR:
      return "something went wrong" + loadFromServer
        ? ""
        : " (need an osu! installation root directory)";
  }
};

/**
 * uses osu-db-parser to parse osu!.db and collection.db
 * from selected folder
 * @param {Object} { osuFile, collectionFile }
 * @returns {Object} { osuData, collectionData }, where
 * osuData = { beatmaps, folder_count, osuver, username }
 * collectionData = { collection, osuver }
 */
const parseDB = ({ osuFile, collectionFile }) => {
  const osuBuffer = toBuffer(osuFile);
  const collectionBuffer = toBuffer(collectionFile);
  const parser = new OsuDBParser(osuBuffer, collectionBuffer);
  const osuData = parser.getOsuDBData();
  const collectionData = parser.getCollectionData();
  return { osuData, collectionData };
};

/**
 * gets the (rounded to 2 digits) bpm of a map; for now just using the first bpm like site does
 * @param {[Number, Number, boolean][]} timingPoints ms/beat, timestamp, is red
 */
const getBPM = (timingPoints) => {
  if (!timingPoints || !timingPoints[0]) return 0;
  const beatLengthMs = timingPoints[0][0];
  const bpm = Math.round((100 * 60000) / beatLengthMs) / 100;
  return bpm;
};

/**
 * helper to process unicode return values from OsuDBParser, after 2.0.0 update
 * @param {string} input with possibly-garbled unicode text
 * @returns same string, displayed correctly
 */
const processOsuDBString = (input) => {
  if (!input) return input;
  return decodeURIComponent(escape(input));
};

const makeURLForClient = async (osuDirectoryHandle, beatmap) => {
  const handle = await getAudioHandle(osuDirectoryHandle, beatmap);
  if (!handle) return null; // silently remove beatmap
  const url = await handle.getFile().then(URL.createObjectURL);
  return url;
};

const makeURLForServer = (beatmap) => {
  return `/api/osu/songs?path=${getAudioPath(beatmap)}`;
};

export default class CollectionLoader extends Component {
  /**
   * props
   * onCollectionsLoaded: (beatmaps, collections) => {}
   * useUnicode: bool
   * loadFromServer: bool // uses osu instance uploaded to server
   */
  constructor(props) {
    super(props);
    this.state = {
      status: Status.NO_SELECT,
      loadingStatus: undefined,
      osuDirectoryHandle: undefined,
      beatmaps: undefined,
      collections: undefined,
      selectedCollection: undefined,
      useMetadata: false, // for download
    };
  }

  readFileBinaryWithProgress = (file, filename) =>
    readFileBinary(file, (progress) => {
      this.setState({ loadingStatus: { filename, progress } });
    });

  onOsuSelectClick = async () => {
    const osuDirectoryHandle = await window.showDirectoryPicker();
    this.setState({
      status: Status.LOADING,
      osuDirectoryHandle: osuDirectoryHandle,
      beatmaps: undefined,
      collections: undefined,
      selectedCollection: undefined,
    });
    const getBinaryFile = async (fn) => {
      const fileHandle = await osuDirectoryHandle.getFileHandle(fn);
      const file = await fileHandle.getFile();
      return await this.readFileBinaryWithProgress(file, fn);
    };
    const osuFile = await getBinaryFile("osu!.db");
    const collectionFile = await getBinaryFile("collection.db");
    this.setCollectionsFromOsuFiles(osuFile, collectionFile);
  };

  onOsuServerFetchClick = async () => {
    this.setState({
      status: Status.LOADING,
      beatmaps: undefined,
      collections: undefined,
      selectedCollection: undefined,
    });
    const getBinaryFile = async (endpoint) => {
      const file = await get(endpoint, {}, "blob");
      return await this.readFileBinaryWithProgress(file, endpoint);
    };
    const osuFile = await getBinaryFile("/api/osu/db");
    const collectionFile = await getBinaryFile("/api/osu/collections");
    this.setCollectionsFromOsuFiles(osuFile, collectionFile);
  };

  setCollectionsFromOsuFiles = (osuFile, collectionFile) => {
    const { osuData, collectionData } = parseDB({ osuFile, collectionFile });
    if (!osuData || !osuData.beatmaps || !collectionData || !collectionData.collection) {
      this.setState({
        status: Status.ERROR,
      });
      return;
    }
    const beatmaps = osuData.beatmaps;
    let collections = collectionData.collection;
    console.log(osuData);
    console.log(collectionData);

    // preprocess all strings, since unicode text may be garbled
    for (const bm of beatmaps) {
      for (let key in bm) {
        if (bm.hasOwnProperty(key) && typeof bm[key] === "string") {
          bm[key] = processOsuDBString(bm[key]);
        }
      }
    }

    const allSongs = new Map();
    for (const bm of beatmaps) {
      const key = `${bm.artist_name} - ${bm.song_title} | ${bm.folder_name}/${bm.audio_file_name}`;
      allSongs.set(key, bm.md5);
    }
    collections.unshift({
      name: "<all songs>",
      beatmapsCount: allSongs.size,
      beatmapsMd5: [...allSongs.values()],
    });
    this.setState({
      status: Status.LOADED,
      beatmaps: beatmaps,
      collections: collections,
    });
  };

  isLoaded = () => {
    return this.state.status === Status.LOADED;
  };

  /**
   * get all beatmaps in selected collection
   * @returns list of beatmap objects
   */
  selectedBeatmaps = () => {
    if (this.state.selectedCollection === undefined) {
      return null;
    }
    const collection = this.state.collections[this.state.selectedCollection];
    const hashes = new Set(collection.beatmapsMd5);
    return this.state.beatmaps.filter((beatmap) => hashes.has(beatmap.md5));
  };

  /**
   * makes the pool at the current time, with selected collection
   * @returns pool, as [Song]
   */
  makePool = async () => {
    const beatmaps = this.selectedBeatmaps();
    if (beatmaps === null) {
      return;
    }
    const pool = await Promise.all(
      beatmaps.map(async (beatmap) => {
        const song = {
          // fields for searching, but careful with size
          artistUnicode: beatmap.artist_name_unicode,
          titleUnicode: beatmap.song_title_unicode,
          artist: beatmap.artist_name,
          title: beatmap.song_title,
          bpm: getBPM(beatmap.timing_points),
          length: beatmap.total_time / 1000,
          creator_name: beatmap.creator_name,
          difficulty: beatmap.difficulty,
          osu_file_name: beatmap.osu_file_name,
          song_source: beatmap.song_source,
          song_tags: beatmap.song_tags,
        };

        // server uses api for urls; client has to generate them
        if (this.props.loadFromServer) {
          song.path = makeURLForServer(beatmap);
        } else {
          const osuDirectoryHandle = this.state.osuDirectoryHandle;
          song.addPath = async function () {
            console.log(this);
            this.path = await makeURLForClient(osuDirectoryHandle, beatmap);
          };
          song.removePath = function () {
            console.log(this);
            URL.revokeObjectURL(this.path);
            delete this.path;
          };
        }

        return addDisplayName(song);
      })
    );
    return pool.filter((song) => song !== null);
  };

  /**
   * download all beatmaps in selected collection as .zip
   * use unicode must be the same setting as when reading files with s-ul later
   */
  downloadMusic = async () => {
    const pool = await this.makePool();
    if (pool === null) {
      return;
    }
    let zip = new JSZip();
    await Promise.all(
      pool.map(async (song) => {
        const maybeUni = (prop) => getMaybeUnicode(song, prop, this.props.useUnicode);
        await song.addPath();
        const blob = await fetch(song.path).then((r) => r.blob());
        song.removePath();
        const fn = toSafeFilename(song, this.props.useUnicode);
        console.log(blob.size);
        let file = new File([blob], fn);
        if (this.state.useMetadata) {
          // write metadata
          const bin = await readFileBinary(file);
          const mp3tag = new MP3Tag(toBuffer(bin), /* verbose= */ false);
          mp3tag.read();
          if (mp3tag.error !== "") {
            console.log(mp3tag.error);
          } else {
            mp3tag.tags.title = maybeUni("title");
            mp3tag.tags.artist = maybeUni("artist");
            const buf = mp3tag.save();
            file = new File([buf], fn); // convert buffer back into file
          }
        }
        zip.file(fn, file);
      })
    );
    const zipContent = await zip.generateAsync({ type: "blob" });
    const collection = this.state.collections[this.state.selectedCollection];
    saveAs(zipContent, `${collection.name}.zip`);
  };

  downloadMetadata = async () => {
    const pool = await this.makePool();
    pool.map((song) => {
      delete song.path; // for creating .json
    });
    const poolFn = "songs.json";
    const poolFile = new File([JSON.stringify(pool, null, 4)], poolFn, { type: "text/json" });
    saveAs(poolFile, poolFn);
  };

  downloadFileList = async () => {
    // these paths will be relative to the osu! root directory
    const beatmaps = this.selectedBeatmaps();
    const fileList = ["osu!.db", "collection.db", ...beatmaps.map((bm) => getAudioPath(bm))];
    const fileListFn = "filelist.txt";
    const fileListFile = new File([fileList.join("\n")], fileListFn, { type: "text/plain" });
    saveAs(fileListFile, fileListFn);
  };

  render = () => {
    // make the collection table (keeping the outside scroll container in the same place)
    let collectionSelectTable;
    if (this.isLoaded()) {
      const collectionColumns = [
        (collection, index) => ({
          text: `${collection.name} (${collection.beatmapsCount})`,
          onclick: () => {
            this.setState({
              selectedCollection: index,
            });
          },
        }),
      ];
      collectionSelectTable = (
        <Table
          rows={this.state.collections}
          columns={collectionColumns}
          selected={(i) => i === this.state.selectedCollection}
          maxHeight={360}
        />
      );
    }

    return (
      <div id="osu-container" className={styles.loader}>
        <div id="folder-select-container">
          {this.props.loadFromServer ? (
            <button type="button" onClick={this.onOsuServerFetchClick}>
              fetch collections
            </button>
          ) : (
            <button type="button" onClick={this.onOsuSelectClick}>
              select osu! folder
            </button>
          )}
          <span>
            {" "}
            {makeStatusMsg(this.state.status, this.state.loadingStatus, this.props.loadFromServer)}
          </span>
        </div>
        {this.isLoaded() ? (
          <div id="collection-select-container" className={styles.collectionSelectContainer}>
            <label htmlFor="collection-select">collections:</label>
            <div id="collection-select">{collectionSelectTable}</div>
            {!this.props.loadFromServer ? (
              <>
                <WithLabel id="write-metadata-to-audio-files">
                  <input
                    type="checkbox"
                    defaultChecked={this.state.useMetadata}
                    onChange={(e) => {
                      this.setState({
                        useMetadata: e.target.checked,
                      });
                    }}
                  />
                </WithLabel>
                <div>
                  <button
                    type="button"
                    aria-describedby="dl-desc"
                    className={styles.downloadButton}
                    onClick={this.downloadMusic}
                  >
                    download
                  </button>
                  <div role="tooltip" id="dl-desc" className={styles.tooltip}>
                    download all songs in collection as .zip (filenames affected by "use unicode"
                    checkbox)
                  </div>
                  <button
                    type="button"
                    className={styles.downloadButton}
                    onClick={this.downloadMetadata}
                  >
                    dl data file
                  </button>
                  <div role="tooltip" id="dl-rsync-desc" className={styles.tooltip}>
                    this is the songs.json file that s-ul and default modes rely on
                  </div>
                  <button
                    type="button"
                    aria-describedby="dl-rsync-desc"
                    className={styles.downloadButton}
                    onClick={this.downloadFileList}
                  >
                    dl filelist.txt
                  </button>
                  <div role="tooltip" id="dl-rsync-desc" className={styles.tooltip}>
                    this is for rsync to upload for the server-side collection mode
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };
}
