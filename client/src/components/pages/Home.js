import React, { Component } from "react";
import CollectionLoader from "../modules/CollectionLoader.js";

import Player from "../modules/Player.js";
import SettingInput from "../modules/SettingInput.js";

import { splitFilename, getAudioHandle } from "../../scripts/utils.js";

import defaultPool from '../../data/songs.json';

import "../../utilities.css";
import styles from "./Home.css";

const Modes = Object.freeze({
  DEFAULT: "default",
  FOLDER: "folder",
  OSU: "osu",
});

/**
 * Define the "Home" component as a class.
 */
export default class Home extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    this.state = {
      mode: Modes.DEFAULT,
      activeURLs: [], // folder select
      osuData: undefined, // osu
      // ({osuDirectoryHandle, beatmaps, collections, selectedCollection})
      pool: [], // props for Player.js
      noRepeatNum: 100,
      rowsBefore: 1,
      rowsAfter: 10,
      useUnicode: true,
    };

    this.fileSelect = React.createRef();
    this.collectionLoader = React.createRef();
    this.noRepeatNumInput = React.createRef();
  }

  onModeChange = (e) => {
    this.setState({
      mode: e.target.value,
    });
  };

  start = async () => {
    for (const url of this.state.activeURLs) {
      URL.revokeObjectURL(url);
    }
    let activeURLs = [];
    let pool = [];
    const mode = this.state.mode;
    if (mode === Modes.DEFAULT) {
      pool = defaultPool;
    } else if (mode === Modes.FOLDER) {
      const files = [...this.fileSelect.current.files];
      files.forEach((file) => {
        const {name, ext} = splitFilename(file.name);
        if (!["mp3", "wav", "flac"].includes(ext)) return;
        const url = URL.createObjectURL(file);
        activeURLs.push(url);
        pool.push({
          path: url,
          displayName: name,
        });
      });
    } else if (mode === Modes.OSU) {
      const osuData = this.collectionLoader.current.state;
      if (osuData.selectedCollection === undefined) { return; }
      const collection = osuData.collections[osuData.selectedCollection];
      const hashes = new Set(collection.beatmapsMd5);
      const beatmaps = osuData.beatmaps.filter((beatmap) => hashes.has(beatmap.md5));
      const promises = beatmaps.map(async (beatmap) => {
        const handle = await getAudioHandle(osuData.osuDirectoryHandle, beatmap);
        if (!handle) return null; // silently remove beatmap
        const url = await handle.getFile().then(URL.createObjectURL);
        const artistUnicode = beatmap.artist_name_unicode;
        const titleUnicode = beatmap.song_title_unicode;
        const artist = beatmap.artist_name;
        const title = beatmap.song_title;
        activeURLs.push(url);
        pool.push({
          path: url,
          displayName: `${artist} - ${title}`,
          displayNameUnicode: artistUnicode ? `${artistUnicode} - ${titleUnicode}` : undefined,
          artist, title, artistUnicode, titleUnicode,
        });
      });
      await Promise.all(promises);
    }
    const noRepeatNum = Math.min(this.state.noRepeatNum, pool.length - 1);
    this.noRepeatNumInput.current.value = noRepeatNum;
    this.setState({
      activeURLs: activeURLs,
      pool: pool,
      noRepeatNum: noRepeatNum,
    });
  };

  render = () => {
    const makeNumberSettingField = (prop, ref) => {
      return (
        <SettingInput
          ref={ref}
          id={prop.replace(/([A-Z])/g, "-$1").toLowerCase()}
          type='text'
          defaultValue={this.state[prop]}
          onInput={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value)) {
              this.setState({
                [prop]: value,
              });
            }
          }}/>
      );
    };

    return (
      <div id={styles.home}>
        <h1>random music player</h1>
        <div className={styles.content}>
          <select id={styles.modes} value={this.state.mode} onChange={this.onModeChange}>
            <option value={Modes.DEFAULT}>default songs</option>
            <option value={Modes.FOLDER}>folder select</option>
            <option value={Modes.OSU}>osu! collection</option>
          </select>
        </div>
        {this.state.mode === Modes.FOLDER ? 
          <div className={styles.content}>
            <input type="file" accept="image/*" webkitdirectory="true" ref={this.fileSelect} />
          </div> : null}
        {this.state.mode === Modes.OSU ?
          <CollectionLoader ref={this.collectionLoader} className={styles.content}/> : null}
        <div className={styles.content}>
          <button
            type="button" 
            className={styles.startButton}
            onClick={this.start}
            >!mp start</button>
        </div>
        <div id="settings" className={styles.content}>
          {makeNumberSettingField('noRepeatNum', this.noRepeatNumInput)}
          {makeNumberSettingField('rowsBefore')}
          {makeNumberSettingField('rowsAfter')}
          <SettingInput
            id='use-unicode'
            type='checkbox'
            defaultChecked={true}
            onChange={(e) => {
              this.setState({
                useUnicode: e.target.checked,
              });
            }}/>
        </div>
        {this.state.pool.length ? 
          <Player
            className={styles.content}
            pool={this.state.pool}
            noRepeatNum={this.state.noRepeatNum}
            rowsBefore={this.state.rowsBefore}
            rowsAfter={this.state.rowsAfter}
            useUnicode={this.state.useUnicode}
          /> : null}
      </div>
    )
  }
}