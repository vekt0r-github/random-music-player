import React, { Component } from "react";

import { WithLabel } from "../../utils/components.js";

import { splitFilename, isAudioExtension, get, post } from "../../utils/functions.js";

import styles from "./SulLoader.css";

const Messages = Object.freeze({
  IDLE: "",
  LOADING: "songs loading...",
  LOADED: "songs loaded!",
  ERROR: (msg) => `an error occurred: ${msg}`,
});

/**
 * Define the "SulLoader" component as a class.
 */
export default class SulLoader extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    this.state = {
      status: Messages.IDLE,
      username: '',
      password: '',
      poolLink: '',
      pool: undefined,
    };
  }

  getPoolFrom = /* async */ (poolLink) => get('/api/songs/poollink', { poolLink });

  initializePoolFromFile = async (poolLink) => {
    const fail = (msg) => this.setState({
      status: Messages.ERROR(msg),
    })
    this.setState({
      status: Messages.LOADING,
    });
    const pool = await this.getPoolFrom(poolLink);
    if (!Array.isArray(pool) || !pool.length) { fail("bad object (expected array)"); return false; }
    for (const song of pool) {
      if (!song.path) { fail("missing urls"); return false; }
    }
    this.setState({
      status: Messages.LOADED,
      pool: pool,
    });
    return true;
  }

  initializePoolFromAccount = async () => {
    this.setState({
      status: Messages.LOADING,
    });
    const {songs} = await post('/api/songs/sul', {
      username: this.state.username,
      password: this.state.password,
    });
    let dataFileStatus = "none"; // none, exists, partial
    let partialPool;
    let pool = await Promise.all(songs.map(async (song) => {
      if (song.fileName === "songs.json") { // possible data file
        const pool = await this.getPoolFrom(song.url);
        if (!Array.isArray(pool) || !pool.length) { return; }
        const hasUrls = pool.every((song) => song.path);
        if (hasUrls) {
          this.setState({
            status: Messages.LOADED,
            pool: pool,
            poolLink: song.url,
          });
          dataFileStatus = "exists";
        } else {
          partialPool = pool;
          dataFileStatus = "partial";
        }
      }
      const {name, ext} = splitFilename(song.fileName);
      if (!isAudioExtension(ext)) { return null; }
      return {
        path: song.url,
        displayName: name,
      };
    }));
    if (dataFileStatus === "exists") { return; }
    pool = pool.filter(song => song !== null);
    if (dataFileStatus === "partial") {
      const map = {}; // structure mapping displayName(Unicode)s to full objects...
      [...partialPool, ...pool].forEach((song) => { // "partialPool" has the correct info and should go first
        [song.displayName, song.displayNameUnicode].filter(x => x).forEach((name) => {
          map[name] = { ...song, ...map[name] }; 
        });
      });
      pool = Object.values(map).filter(song => song.path); // ...but only the right ones get path
    }
    this.setState({
      status: Messages.LOADED,
      pool: pool,
    });
  };
  
  initializePool = async () => {
    if (this.state.poolLink !== '') {
      await this.initializePoolFromFile(this.state.poolLink);
    } else {
      await this.initializePoolFromAccount();
    }
  }

  makePool = async () => {
    if (this.state.status !== Messages.LOADED) { return; }
    return this.state.pool;
  };

  downloadMetadata = async () => {
    const pool = await this.makePool();
    const poolFn = "songs.json";
    const poolFile = new File([JSON.stringify(pool, null, 4)], poolFn, {type: "text/json"});
    saveAs(poolFile, poolFn);
  }

  render = () => {
    const loaded = this.state.status === Messages.LOADED;
    const statusDisplay = <div className={styles.status}>{this.state.status}</div>;
    return (
      <form className={styles.loader} onSubmit={(e) => e.preventDefault()}>
        <WithLabel id='data-file-link'>
          <input
            type='input'
            value={this.state.poolLink}
            onChange={(e) => {
              this.setState({
                poolLink: e.target.value,
              });
            }} />
        </WithLabel>
        <p>OR:</p>
        <WithLabel id='username'>
          <input
            type='input'
            onChange={(e) => {
              this.setState({
                username: e.target.value,
              });
            }} />
        </WithLabel>
        <WithLabel id='password'>
          <input
            type='password'
            onChange={(e) => {
              this.setState({
                password: e.target.value,
              });
            }} />
        </WithLabel>
        <div>
          <button
            type="button"
            aria-describedby="dl-desc"
            className={styles.downloadButton}
            onClick={this.initializePool}
            >load</button>
          {loaded ? <button
            type="button"
            aria-describedby="dl-desc"
            className={styles.downloadButton}
            onClick={this.downloadMetadata}
            >dl data file</button> : statusDisplay}
        </div>
        {loaded ? statusDisplay : null}
        <input type="submit" style={{display: "none"}} />
      </form>
    );
  }
}