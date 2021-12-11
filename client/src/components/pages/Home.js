import React, { Component } from "react";

import { setup } from "/client/src/scripts/index.js";

/**
 * Define the "Home" component as a class.
 */
export default class Home extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    setup();
  }

  render() {
    return (
      <>
        <h1>random music player</h1>
        <div>
          <select id="setting" defaultValue="default">
            <option value="default">default songs</option>
            <option value="folder">folder select</option>
            <option value="osu">osu! collection</option>
          </select>
        </div>
        <div>
          <input type="file" accept="image/*" webkitdirectory="true" id="fileselect" hidden/>
        </div>
        <div id="osucontainer"></div>
        <div>
          <button type="button" id="start">start</button>
          <button type="button" id="refresh">refresh</button>
        </div>
        <div>
          <button type="button" id="prev">&lt;</button>
          <button type="button" id="next">&gt;</button>
        </div>
        <div>
          <label htmlFor="noRepeatNum">no repeat: </label><input type="text" id="noRepeatNum" /><br/>
          <label htmlFor="rowsBefore">rows before: </label><input type="text" id="rowsBefore" /><br/>
          <label htmlFor="rowsAfter">rows after: </label><input type="text" id="rowsAfter" /><br/>
          <label htmlFor="songsLeft">songs left: </label><input type="text" id="songsLeft" />
        </div>
        <div>
          <audio id="player" className="player-audio" controls>
            <source src="" type="audio/mp3" />
            text if audio doesn't work
          </audio>
          <br/>
          <p id="nowPlaying"></p>
        </div>
        <div id="playlists" className="playlist-container"></div>
      </>
    )
  }
}