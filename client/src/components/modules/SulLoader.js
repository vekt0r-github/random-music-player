import React, { Component } from "react";

import SettingInput from "../modules/SettingInput.js";

import { splitFilename, isAudioExtension, post } from "../../scripts/utils.js";

// import styles from "./SulLoader.css";

const Messages = Object.freeze({
  IDLE: "",
  LOADING: "songs loading...",
  LOADED: "songs loaded!",
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
    };
  }

  makePool = async () => {
    this.setState({
      status: Messages.LOADING,
    });
    const {songs} = await post('/api/songs/sul', {
      username: this.state.username,
      password: this.state.password,
    })
    const pool = songs.map((song) => {
      const {name, ext} = splitFilename(song.fileName);
      if (!isAudioExtension(ext)) { return null; }
      return {
        path: song.url,
        displayName: name,
      };
    });
    this.setState({
      status: Messages.LOADED,
    });
    return pool.filter(song => song !== null)
  };

  render = () => {
    return (
      <form onSubmit={(e) => e.preventDefault()}>
        <SettingInput
          id='username'
          type='input'
          onChange={(e) => {
            this.setState({
              username: e.target.value,
            });
          }}/>
        <SettingInput
          id='password'
          type='password'
          onChange={(e) => {
            this.setState({
              password: e.target.value,
            });
          }}/>
        <span>{this.state.status}</span>
        <input type="submit" style={{display: "none"}} />
      </form>
    );
  }
}