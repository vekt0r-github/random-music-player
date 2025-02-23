import React, { useEffect, useRef, useCallback } from "react";

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
   * playerRef: React.MutableRefObject
   */
  const [songsLeftActive, setSongsLeftActive] = useStatePromise(false); // controls whether songsLeft applies
  const [songsLeft, setSongsLeft] = useStatePromise(0); // how many more songs to autoplay before stopping
  const [currentError, setCurrentError] = useStatePromise(null);

  const { nowPlaying, playPrev, playNext, useUnicode, audioRef } = props;

  const songsLeftInput = useRef();

  const replay = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  };

  useEffect(() => {
    if (!audioRef.current) console.warn("player not mounted yet");
    audioRef.current.volume = 0.1;
  }, []);

  useEffect(() => {
    if (!songsLeftInput.current) return;
    songsLeftInput.current.setCurrValue(() => songsLeft);
  }, [songsLeft]);

  const autoplayNext = useCallback(async () => {
    if (!songsLeftActive) {
      playNext();
      return;
    }
    if (songsLeft === 0) return;
    setSongsLeft((x) => x - 1);
    playNext();
  }, [playNext, songsLeft, setSongsLeft, songsLeftActive]);

  // compute and refresh metadata
  const artist = nowPlaying.getArtist(useUnicode);
  const displayName = nowPlaying.getDisplayName(useUnicode);
  const title = nowPlaying.getTitle(useUnicode) ?? displayName;
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ artist, title });
    navigator.mediaSession.setActionHandler("play", () => audioRef.current.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => playPrev());
    navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
  } else {
    setCurrentError(`warning: mediaSession not in ${navigator}`);
  }

  return (
    <div className={styles.audioContainer}>
      {currentError ? (
        <div className={styles.nowPlaying} onClick={() => setCurrentError(null)}>
          {currentError}
        </div>
      ) : null}
      <audio
        ref={audioRef}
        id="audio"
        onError={async (e) => {
          console.log(e.currentTarget.error);
          setCurrentError(`an error occurred for ${displayName}: ${e.currentTarget.error.message}`);
          playNext();
        }}
        onEnded={() => autoplayNext()}
        type="audio/mpeg"
        controls
      >
        text if audio doesn't work
      </audio>
      <div className={styles.nowPlaying}>now playing: {displayName}</div>
      <div id="player-buttons">
        <button type="button" id="prev" className={styles.lrButton} onClick={() => playPrev()}>
          &lt;
        </button>
        <button type="button" id="prev" className={styles.replayButton} onClick={() => replay()}>
          ⟳
        </button>
        <button type="button" id="next" className={styles.lrButton} onClick={() => playNext()}>
          &gt;
        </button>
      </div>
      <div className={styles.timerContainer}>
        <WithLabel id="enable-timer">
          <input
            type="checkbox"
            checked={songsLeftActive}
            onChange={(e) => {
              setSongsLeftActive(e.target.checked);
            }}
          />
        </WithLabel>
        {songsLeftActive ? (
          <WithLabel id="songs-left">
            <IntegerInput
              ref={songsLeftInput}
              defaultValue={songsLeft}
              onValidInput={setSongsLeft}
            />
          </WithLabel>
        ) : null}
      </div>
    </div>
  );
};

export default PlayerAudio;
