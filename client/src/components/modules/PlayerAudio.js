import React, { Component } from "react";
import { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from "react";
import ReactDOM from "react-dom";

import SettingInput from "../modules/SettingInput.js";

import styles from "./PlayerAudio.css";

export default class PlayerAudio extends Component {
  /**
   * typedefs
   * Song: {path, artist, title, displayName ...}
   *    where displayName = `${artist} - ${title}`
   *    or {path, displayName, ...}
   * 
   * props
   * nowPlaying: Song
   * playPrev: () => {}
   * playNext: () => {}
   * useUnicode: bool
   */
  constructor(props) {
    super(props);
    console.log(__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED);

    this.state = {
      songsLeftActive: false, // controls whether songsLeft applies
      songsLeft: 0, // how many more songs to autoplay before stopping
    };

    this.player = null;
    this.playerInitialized = false;
    this.playQueued;

    this.songsLeftInput = React.createRef();
  }

  onAudioChange = (element) => { 
    this.player = ReactDOM.findDOMNode(element);
    if (!this.player) { return; }
    if (!this.playerInitialized) {
      this.player.volume = 0.2;
      this.playerInitialized = true;
    }
    if (this.playQueued) {
      this.player.play();
      this.playQueued = false;
    }
  }

  play = () => {
    if (this.player) { this.player.play(); }
    else { this.playQueued = true;}
  }

  autoplayNext = () => {
    if (!this.state.songsLeftActive) { this.props.playNext(); return; }
    if (this.state.songsLeft === 0) { return; }
    this.setState({
      songsLeft: this.state.songsLeft - 1,
    }, () => {
      this.songsLeftInput.current.value = this.state.songsLeft;
      this.props.playNext();
    });
  }

  render() {
    const maybeUni = (song, property) => {
      let title;
      if (this.props.useUnicode) {
        title = song[`${property}Unicode`];
      }
      return title ?? song[property];
    }

    const nowPlaying = this.props.nowPlaying;

    // compute and refresh metadata
    const artist = maybeUni(nowPlaying, 'artist');
    const displayName = maybeUni(nowPlaying, 'displayName');
    const title = maybeUni(nowPlaying, 'title') ?? displayName;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({artist, title});
      navigator.mediaSession.setActionHandler('previoustrack', () => this.props.playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.props.playNext());
    }

    return (
      <div className={styles.audioContainer}>
        <audio 
          ref={this.onAudioChange} 
          id="player" 
          src={nowPlaying.path}
          onError={() => this.props.playNext()}
          onEnded={() => this.autoplayNext()}
          controls>
          text if audio doesn't work
        </audio>
        <div className={styles.nowPlaying}>
          now playing: {displayName}
        </div>
        <div id="player-buttons">
          <button
            type="button"
            id="prev"
            className={styles.button}
            onClick={() => this.props.playPrev()}
            >&lt;</button>
          <button 
            type="button" 
            id="next" 
            className={styles.button}
            onClick={() => this.props.playNext()}
            >&gt;</button>
        </div>
        <div className={styles.timerContainer}>
          <SettingInput
            id='enable-timer'
            type='checkbox'
            onInput={(e) => {
              this.setState({
                songsLeftActive: e.target.checked,
              });
            }}
          />
          {this.state.songsLeftActive ?
            <SettingInput
              ref={this.songsLeftInput}
              id='songs-left'
              type='text'
              defaultValue={this.state.songsLeft}
              onInput={(e) => {
                let value = parseInt(e.target.value);
                if (isNaN(value)) { return; }
                this.setState({
                  songsLeft: value,
                });
              }}
              onBlur={(e) => { e.target.value = this.state.songsLeft }}
            /> : null}
        </div>
      </div>
    )
  }
}