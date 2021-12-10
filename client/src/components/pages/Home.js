import React, { Component } from "react";

/**
 * Define the "Home" component as a class.
 */
export default class Home extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    return (
      <>
        <h1>random music player</h1>
        <div>
          <select id="setting">
            <option value="default" selected>default songs</option>
            <option value="folder">folder select</option>
            <option value="osu">osu! collection</option>
          </select>
        </div>
        <div>
          <input type="file" accept="image/*" webkitdirectory id="fileselect" hidden/>
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
          <label for="noRepeatNum">no repeat: </label><input type="text" id="noRepeatNum" /><br/>
          <label for="rowsBefore">rows before: </label><input type="text" id="rowsBefore" /><br/>
          <label for="rowsAfter">rows after: </label><input type="text" id="rowsAfter" /><br/>
          <label for="songsLeft">songs left: </label><input type="text" id="songsLeft" />
        </div>
        <div>
          <audio id="player" class="player-audio" controls>
            <source src="" type="audio/mp3" />
            text if audio doesn't work
          </audio>
          <br/>
          <p id="nowPlaying"></p>
        </div>
        <div id="playlists" class="playlist-container"></div>
        {/* <script src="../index.js" type="module" crossorigin="use-credentials"></script> */}
      </>
    )
  }
}