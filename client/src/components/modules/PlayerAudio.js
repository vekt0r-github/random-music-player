import React, { useEffect, useRef, useCallback } from "react";

import { Status } from "./Player.js";

import { useStatePromise } from "../../utils/hooks.js";
import { IntegerInput, WithLabel } from "../../utils/components.js";

import styles from "./PlayerAudio.css";

const PlayerAudio = (props) => {
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
   * status: enum
   * setStatus
   */
  const [songsLeftActive, setSongsLeftActive] = useStatePromise(false); // controls whether songsLeft applies
  const [songsLeft, setSongsLeft] = useStatePromise(0); // how many more songs to autoplay before stopping

  const {nowPlaying, playPrev, playNext, useUnicode, status, setStatus} = props;
  const path = nowPlaying.path;

  const player = useRef();
  const songsLeftInput = useRef();

  const play = () => {
    player.current.pause();
    player.current.currentTime = 0;
    player.current.play();
    setStatus(Status.PLAYING);
  }

  useEffect(() => {
    if (!player.current) console.warn("player not mounted yet");
    player.current.volume = 0.1;
  }, []);

  useEffect(() => {
    if (!player.current) return;
    if (status == Status.QUEUED && player.current.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      play();
    }
  }, [path, status]);

  const autoplayNext = useCallback(async () => {
    if (!songsLeftActive) { playNext(); return; }
    if (songsLeft === 0) return;
    songsLeftInput.current.setCurrValue(songsLeft - 1);
    await setSongsLeft(songsLeft - 1);
    playNext();
  }, [songsLeft, songsLeftActive]);

  // compute and refresh metadata
  const artist = nowPlaying.getArtist(useUnicode);
  const displayName = nowPlaying.getDisplayName(useUnicode);
  const title = nowPlaying.getTitle(useUnicode) ?? displayName;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({artist, title});
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
  }

  return (
    <div className={styles.audioContainer}>
      <audio 
        ref={player} 
        id="player" 
        src={path}
        onCanPlay={() => {
          if (status === Status.QUEUED) play();
        }}
        onError={() => playNext()}
        onEnded={() => autoplayNext()}
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
          onClick={() => playPrev()}
          >&lt;</button>
        <button 
          type="button" 
          id="next" 
          className={styles.button}
          onClick={() => playNext()}
          >&gt;</button>
      </div>
      <div className={styles.timerContainer}>
        <WithLabel id='enable-timer'>
          <input
            type='checkbox'
            checked={songsLeftActive}
            onChange={(e) => {
              setSongsLeftActive(e.target.checked);
            }} />
        </WithLabel>
        {songsLeftActive ?
          <WithLabel id='songs-left'>
            <IntegerInput
              ref={songsLeftInput}
              defaultValue={songsLeft}
              onValidInput={setSongsLeft} />
          </WithLabel> : null}
      </div>
    </div>
  )
}

export default PlayerAudio;