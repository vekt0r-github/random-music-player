import React, { Component } from "react";

import SulLoader from "../modules/SulLoader.js";
import FolderLoader from "../modules/FolderLoader.js";
import CollectionLoader from "../modules/CollectionLoader.js";
import Player from "../modules/Player.js";

import { IntegerInput, WithLabel } from "../../utils/components.js";
import { attachReverseProxy } from "../../utils/functions.js";
import { get } from "../../utils/requests.js";

import "../../utilities.css";
import styles from "./Home.css";

const Modes = Object.freeze({
  DEFAULT: "default",
  SUL: "s-ul",
  FOLDER: "folder",
  OSU: "osu",
  SERVER_OSU: "server_osu",
});

/**
 * Define the "Home" component as a class.
 */
export default class Home extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    this.state = {
      mode: Modes.SERVER_OSU,
      activeURLs: [], // folder select
      osuData: undefined, // osu
      // ({osuDirectoryHandle, beatmaps, collections, selectedCollection})
      pool: [], // props for Player.js
      noRepeatNum: 100,
      rowsBefore: 1,
      rowsAfter: 10,
      useUnicode: true,
      volume: 0.1,
    };

    this.sulLoader = React.createRef();
    this.folderLoader = React.createRef();
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
      pool = await get("/api/songs/default");
    } else if (mode === Modes.SUL) {
      pool = await this.sulLoader.current.makePool();
      pool = attachReverseProxy(pool);
    } else if (mode === Modes.FOLDER) {
      pool = await this.folderLoader.current.makePool();
      activeURLs = pool.map((song) => song.url);
    } else if ([Modes.OSU, Modes.SERVER_OSU].includes(mode)) {
      pool = await this.collectionLoader.current.makePool();
      activeURLs = pool.map((song) => song.url);
    }
    const noRepeatNum = Math.min(this.state.noRepeatNum, pool.length - 1);
    this.noRepeatNumInput.current.setCurrValue(() => noRepeatNum);
    this.setState(
      {
        activeURLs: activeURLs,
        pool: pool,
        noRepeatNum: noRepeatNum,
      },
      () => {
        // actually stupid; waits 100ms to skip a render cycle
        // because PlayerAudio's <audio> doesn't exist until after the render
        // and to autoplay on iOS this must be tied to the click action
        setTimeout(() => document.getElementById("audio").play(), 100);
      }
    );
  };

  render = () => {
    const makeNumberSettingField = (prop, ref) => {
      return (
        <WithLabel id={prop.replace(/([A-Z])/g, "-$1").toLowerCase()}>
          <IntegerInput
            ref={ref}
            defaultValue={this.state[prop]}
            onValidInput={(value) => {
              this.setState({
                [prop]: value,
              });
            }}
          />
        </WithLabel>
      );
    };

    return (
      <div id={styles.home}>
        <h1>random music player</h1>
        <div className={styles.content}>
          <select id={styles.modes} value={this.state.mode} onChange={this.onModeChange}>
            <option value={Modes.SERVER_OSU}>default collections</option>
            <option value={Modes.DEFAULT}>default songs</option>
            <option value={Modes.SUL}>s-ul songs</option>
            <option value={Modes.FOLDER}>folder select</option>
            <option value={Modes.OSU}>osu! collection</option>
          </select>
        </div>
        {this.state.mode === Modes.SUL ? (
          <SulLoader ref={this.sulLoader} useUnicode={this.state.useUnicode} />
        ) : null}
        {this.state.mode === Modes.FOLDER ? <FolderLoader ref={this.folderLoader} /> : null}
        {[Modes.OSU, Modes.SERVER_OSU].includes(this.state.mode) ? (
          <CollectionLoader
            ref={this.collectionLoader}
            useUnicode={this.state.useUnicode}
            loadFromServer={this.state.mode === Modes.SERVER_OSU}
            key={this.state.mode}
          />
        ) : null}
        <div className={styles.content}>
          <button type="button" className={styles.startButton} onClick={this.start}>
            !mp start
          </button>
        </div>
        <div id="settings" className={styles.content}>
          {makeNumberSettingField("noRepeatNum", this.noRepeatNumInput)}
          {makeNumberSettingField("rowsBefore")}
          {makeNumberSettingField("rowsAfter")}
          <WithLabel id="use-unicode">
            <input
              type="checkbox"
              checked={this.state.useUnicode}
              onChange={(e) => {
                this.setState({
                  useUnicode: e.target.checked,
                });
              }}
            />
          </WithLabel>
        </div>
        {this.state.pool.length ? (
          <Player
            className={styles.content}
            pool={this.state.pool}
            noRepeatNum={this.state.noRepeatNum}
            rowsBefore={this.state.rowsBefore}
            rowsAfter={this.state.rowsAfter}
            useUnicode={this.state.useUnicode}
          />
        ) : null}
      </div>
    );
  };
}
