import React, { Component } from "react";

import Table from "./Table.js";

import { post, readFileBinary } from "../../scripts/utils.js";

const Messages = Object.freeze({
  NOSELECT: "no directory selected",
  LOADING: "now loading!!!!",
  LOADED: "collections loaded!",
  ERROR: "something went wrong (need an osu! installation root directory)"
});

export default class CollectionLoader extends Component {
  /**
   * props
   * onCollectionsLoaded: (beatmaps, collections) => {}
   * 
   */
  constructor(props) {
    super(props);
    this.state = {
      status: Messages.NOSELECT,
      osuDirectoryHandle: undefined,
      beatmaps: undefined,
      collections: undefined,
      selectedCollection: undefined,
    };
  }

  onOsuSelectClick = async () => {
    const osuDirectoryHandle = await window.showDirectoryPicker();
    this.setState({ 
      status: Messages.LOADING,
      osuDirectoryHandle: osuDirectoryHandle,
    });
    const getBinaryFile = async (fn) => {
      const fileHandle = await osuDirectoryHandle.getFileHandle(fn);
      const file = await fileHandle.getFile();
      return await readFileBinary(file);
    }
    const osuFile = await getBinaryFile("osu!.db");
    const collectionFile = await getBinaryFile("collection.db");
    
    const {osuData, collectionData} = await post("/api/parsedb", {osuFile, collectionFile});
    if (!osuData || !osuData.beatmaps || !collectionData || !collectionData.collection) {
      this.setState({ 
        status: Messages.ERROR,
      });
      return;
    } 
    const beatmaps = osuData.beatmaps;
    let collections = collectionData.collection;
    console.log(osuData);
    console.log(collectionData);

    const allSongs = new Map();
    for (const bm of beatmaps) {
      const key = `${bm.artist_name} - ${bm.song_title} | ${bm.folder_name}/${bm.audio_file_name}`;
      allSongs.set(key, bm.md5);
    }
    collections.unshift({
      name: "<all songs>",
      beatmapsCount: allSongs.size,
      beatmapsMd5: [...allSongs.values()]
    });
    this.setState({
      status: Messages.LOADED,
      beatmaps: beatmaps,
      collections: collections,
    });
  };

  isLoaded() {
    return this.state.status === Messages.LOADED;
  }

  selectCollection(index) {
    this.setState({
      selectedCollection: index,
    });
  }

  render() {
    // make the collection table (keeping the outside scroll container in the same place)
    let collectionSelectTable;
    if (this.isLoaded()) {
      const entries = this.state.collections.map((collection, index) => [{
        text: `${collection.name} (${collection.beatmapsCount})`,
        onclick: () => this.selectCollection(index),
        selected: this.state.selectedCollection === index,
      }]);
      collectionSelectTable = <Table entries={entries} maxHeight="360px"/>;
    }

    return (
      <div id="osu-container">
        <div id="folder-select-container">
          <button type="button" onClick={this.onOsuSelectClick}>select osu! folder</button>
          <span> {this.state.status}</span>
        </div>
        {this.isLoaded() ? 
          <div id="collection-select-container">
            <label htmlFor="collection-select">collections:</label>
            <div id="collection-select">{collectionSelectTable}</div>
          </div> : null}
      </div>
    )
  }
}