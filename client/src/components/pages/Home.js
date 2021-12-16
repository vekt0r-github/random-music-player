import React, { Component } from "react";

import Player from "../modules/Player.js";
import SettingInput from "../modules/SettingInput.js";

import { setup } from "/client/src/scripts/index.js";

/**
 * Define the "Home" component as a class.
 */
export default class Home extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    this.state = {
      pool: [],
      noRepeatNum: 100,
      rowsBefore: 1,
      rowsAfter: 10,
      useUnicode: true,
    };
  }

  componentDidMount() {
    setup.bind(this)();
  }

  render() {
    const makeNumberSettingField = (prop) => {
      return (
        <SettingInput
          id={prop.replace(/([A-Z])/g, "-$1").toLowerCase()}
          type='text'
          defaultValue={this.state[prop]}
          onInput={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value)) {
              this.setState({
                [prop]: value,
              });
            }
          }}/>
      );
    };

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
        <div id="settings">
          {makeNumberSettingField('noRepeatNum')}
          {makeNumberSettingField('rowsBefore')}
          {makeNumberSettingField('rowsAfter')}
          <SettingInput
            id='use-unicode'
            type='checkbox'
            defaultChecked={true}
            onChange={(e) => {
              console.log("JHOI")
              console.log(e.target.checked)
              this.setState({
                useUnicode: e.target.checked,
              });
            }}/>
        </div>
        {this.state.pool.length ? 
          <Player
            pool={this.state.pool}
            noRepeatNum={this.state.noRepeatNum}
            rowsBefore={this.state.rowsBefore}
            rowsAfter={this.state.rowsAfter}
            useUnicode={this.state.useUnicode}
          /> : null}
        <div id="playlists" className="playlist-container"></div>
      </>
    )
  }
}