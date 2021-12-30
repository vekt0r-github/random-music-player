import React, { Component } from "react";

import SettingInput from "../modules/SettingInput.js";

import MP3Tag from "mp3tag.js";

import { splitFilename, readFileBinary, toBuffer } from "../../scripts/utils.js";

import styles from "./FolderLoader.css";

const Messages = Object.freeze({
  IDLE: "",
  LOADING: "metadata loading...",
  LOADED: "metadata loaded!",
});

/**
 * Define the "Home" component as a class.
 */
export default class Home extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    this.state = {
      status: Messages.IDLE,
      useMetadata: true,
    };

    this.fileSelect = React.createRef();
  }

  makePool = async () => {
    if (this.state.useMetadata) { // only slow when using metadata
      this.setState({
        status: Messages.LOADING,
      });
    }
    const files = [...this.fileSelect.current.files];
    const pool = await Promise.all(files.map(async (file) => {
      const {name, ext} = splitFilename(file.name);
      if (!["mp3", "wav", "flac"].includes(ext)) return null;
      const url = URL.createObjectURL(file);
      let song = {
        path: url,
        displayName: name,
      };
      if (this.state.useMetadata) { // read audio metadata
        const bin = await readFileBinary(file);
        const mp3tag = new MP3Tag(toBuffer(bin), /* verbose= */ false);
        mp3tag.read();
        if (mp3tag.error !== '') {
          console.log(mp3tag.error);
          return null;
        } else { 
          const artist = mp3tag.tags.artist;
          const title = mp3tag.tags.title;
          const displayName = artist ? `${artist} - ${title}` : title;
          for (const [key, value] of Object.entries({ artist, title, displayName })) {
            if (value) { song[key] = value; }
          }
        }
      }
      return song;
    }));
    if (this.state.useMetadata) {
      this.setState({
        status: Messages.LOADED,
      });
    }
    return pool.filter(song => song !== null);
  };

  render = () => {
    return (
      <div className={styles.loader}>
        <input type="file" accept="image/*" webkitdirectory="true" ref={this.fileSelect} />
        <SettingInput
          id='get-metadata-from-audio-files'
          type='checkbox'
          defaultChecked={true}
          onChange={(e) => {
            this.setState({
              useMetadata: e.target.checked,
            });
          }}/>
        <span>{this.state.status}</span>
      </div>
    );
  }
}