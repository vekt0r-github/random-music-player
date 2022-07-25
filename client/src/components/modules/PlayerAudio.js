import React, { Component } from "react";
import { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from "react";
import ReactDOM from "react-dom";

import { IntegerInput, WithLabel } from "../../utils/components.js";

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
      this.player.volume = 0.1;
      this.playerInitialized = true;
    }
    if (this.playQueued) {
      this.player.play();
      this.playQueued = false;
    }
  }

  /**
   * play the current song from beginning
   */
  play = () => {
    if (this.player) {
      this.player.pause();
      this.player.currentTime = 0;
      this.player.play();
    }
    else { this.playQueued = true;}
  }

  autoplayNext = () => {
    if (!this.state.songsLeftActive) { this.props.playNext(); return; }
    if (this.state.songsLeft === 0) { return; }
    this.setState({
      songsLeft: this.state.songsLeft - 1,
    }, () => {
      this.songsLeftInput.current.setCurrValue(this.state.songsLeft);
      this.props.playNext();
    });
  }

  render() {
    const nowPlaying = this.props.nowPlaying;

    // compute and refresh metadata
    const artist = nowPlaying.getArtist(this.props.useUnicode);
    const displayName = nowPlaying.getDisplayName(this.props.useUnicode);
    const title = nowPlaying.getTitle(this.props.useUnicode) ?? displayName;
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
          type="audio/mpeg"
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
          <WithLabel id='enable-timer'>
            <input
              type='checkbox'
              onInput={(e) => {
                this.setState({
                  songsLeftActive: e.target.checked,
                });
              }} />
          </WithLabel>
          {this.state.songsLeftActive ?
            <WithLabel id='songs-left'>
              <IntegerInput
                ref={this.songsLeftInput}
                defaultValue={this.state.songsLeft}
                onValidInput={(value) => {
                  this.setState({
                    songsLeft: value,
                  });
                }} />
            </WithLabel> : null}
        </div>
      </div>
    )
  }
}