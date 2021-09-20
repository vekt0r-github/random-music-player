import { post, readFileBinary, newElement, makeTable } from "./utils.js";

export class CollectionLoader {
  constructor(container) {
    this.container = container;
    this.folderSelectContainer = newElement('div');
    this.osuSelect = newElement('button', {
      type: "button",
      innerHTML: "select osu! folder",
    });
    this.osuSelectStatus = newElement('span');
    this.collectionSelectContainer = newElement('div', {
      hidden: true,
    });
    this.collectionTableLabel = newElement('label', {
      for: "collectioncontainer",
      innerHTML: "collections:",
    });
    this.collectionTableContainer = newElement('div', {
      id: "collectioncontainer",
      classList: ["scroll-container"],
      style: "height: 360px",
    });
    this.noSelectMsg = "no directory selected";
    this.loadingMsg = "now loading!!!!";
    this.loadedMsg = "collections loaded!";

    this.osuDirectoryHandle = undefined;
    this.osuData = undefined;
    this.collectionData = undefined;
    this.selectedCollection = undefined;

    const onOsuSelectClick = async () => {
      this.osuDirectoryHandle = await window.showDirectoryPicker();
      this.setOsuStatus(this.loadingMsg);
      const getBinaryFile = async (fn) => {
        const fileHandle = await this.osuDirectoryHandle.getFileHandle(fn);
        const file = await fileHandle.getFile();
        return await readFileBinary(file);
      }
      let osuFile = await getBinaryFile("osu!.db");
      let collectionFile = await getBinaryFile("collection.db");
      // console.log({osuFile, collectionFile});
      
      const response = await post("/api/parsedb", {osuFile, collectionFile})
      this.osuData = response.osuData;
      this.collectionData = response.collectionData;
      this.setOsuStatus(this.loadedMsg);

      const songsHandle = await this.osuDirectoryHandle.getDirectoryHandle("Songs");
      let asdf = [];
      for await (let [name, handle] of songsHandle) {
        asdf.push({name, handle});
      }
      console.log(asdf);
      console.log(this.osuData);
      console.log(this.collectionData);

      this.refreshTable();
    };
    
    this.setOsuStatus(this.noSelectMsg);
    this.osuSelect.addEventListener('click', onOsuSelectClick.bind(this));
    this.folderSelectContainer.replaceChildren(this.osuSelect, this.osuSelectStatus);
    this.collectionSelectContainer.replaceChildren(this.collectionTableLabel, this.collectionTableContainer);
    this.container.replaceChildren(this.folderSelectContainer, this.collectionSelectContainer);
  }
  
  setOsuStatus(value) { this.osuSelectStatus.innerHTML = " " + value; }

  get loaded() {
    return ["osuDirectoryHandle", "osuData", "collectionData"]
      .every((x) => this[x] !== undefined);
  }

  get collections() {
    if (!this.loaded) return null;
    return this.collectionData.collection;
  }

  get beatmaps() {
    if (!this.loaded) return null;
    return this.osuData.beatmaps;
  }

  findMaps(hashes) { // hashes must be a set
    if (!this.loaded) return null;
    return this.beatmaps.filter((beatmap) => hashes.has(beatmap.md5));
  }

  async getAudioHandle(beatmap) {
    if (!this.loaded) return null;
    try {
      const songsHandle = await this.osuDirectoryHandle.getDirectoryHandle("Songs");
      const folderHandle = await songsHandle.getDirectoryHandle(beatmap.folder_name);
      return await folderHandle.getFileHandle(beatmap.audio_file_name);
    } catch (error) {
      console.log(error, beatmap);
      return null;
    }
  }

  selectCollection(index) {
    // const getRow = (i) => this.collectionTableContainer.firstChild.getElementsByTagName('tr')[i];
    // if (this.selectedCollection !== undefined) {
    //   getRow(this.selectedCollection).classList.remove("selected");
    // }
    // getRow(index).classList.add("selected");
    this.selectedCollection = index;
    this.refreshTable();
  }

  /**
   * remakes the collection table, keeping the outside scroll container in the same place
   */
  refreshTable() {
    if (!this.loaded) return;
    this.collectionSelectContainer.hidden = false;

    const entries = this.collections.map((collection, index) => [{
      text: `${collection.name} (${collection.beatmapsCount})`,
      onclick: () => this.selectCollection.bind(this)(index),
      selected: this.selectedCollection === index,
    }]);
    const table = makeTable(entries);
    table.classList.add("collectionlist");
    this.collectionTableContainer.replaceChildren(table);
  }
}