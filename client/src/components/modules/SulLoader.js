import React, { Component } from "react";

import { WithLabel } from "../../utils/components.js";

import { splitFilename, isAudioExtension, toSafeFilename } from "../../utils/functions.js";
import { get, post } from "../../utils/requests.js";

import styles from "./SulLoader.css";

const Messages = Object.freeze({
  IDLE: "",
  LOADING: "songs loading...",
  LOADED: "songs loaded!",
  ERROR: (msg) => `an error occurred: ${msg}`,
});

const parseCurrentURL = () => {
  let url = window.location.href;
  if (url.endsWith("/")) url = url.slice(0, -1);
  const match = url.match(/(?<baseUrl>(https?:\/\/)?[^\/]+)(?<params>(\/[^\/]+)*)\/?/);
  if (!match) {
    console.warn("no match for current url: " + url);
    return [url, undefined];
  }
  const params = match.groups.params.split("/").slice(1);
  if (params.length !== 2) return [url, undefined];
  const [username, fileId] = params;
  return [match.groups.baseUrl, `https://${username}.s-ul.eu/${fileId}`];
}

/**
 * Define the "SulLoader" component as a class.
 */
export default class SulLoader extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    const poolLink = parseCurrentURL()[1] ?? '';
    this.state = {
      status: Messages.IDLE,
      username: '',
      password: '',
      poolLink,
      pool: undefined,
    };
  }

  getPoolFrom = /* async */ (poolLink) => get('/api/proxy', { src: poolLink });

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
      if (!isAudioExtension(ext)) { return undefined; }
      return {
        path: song.url,
        displayName: name, // toSafeFilename is idempotent, so okay i think
      };
    }));
    if (dataFileStatus === "exists") { return; }
    pool = pool.filter(song => song !== undefined);
    if (dataFileStatus === "partial") {
      const map = {}; // structure mapping filename encoding of (displayName(Unicode)s) to full objects...
      [...partialPool, ...pool].forEach((song) => { // "partialPool" has the correct info and should go first
        // [song.displayName, song.displayNameUnicode].filter(x => x).forEach((name) => {
          const name = toSafeFilename(song, this.props.useUnicode);
          map[name] = { ...song, ...map[name] }; 
        // });
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
    
    // this is a link to this site but with the data file autofilled, if matches s-ul format
    let permalink;
    const poolLinkMatches = this.state.poolLink.match(/(\w+)\.s-ul\.eu\/(\w+)/);
    if (poolLinkMatches) {
      const [username, fileId] = poolLinkMatches.slice(1);
      permalink = `${parseCurrentURL()[0]}/${username}/${fileId}`;
    }
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
        {permalink ? <a href={permalink}>permalink to auto-populate data file</a> : null}
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
