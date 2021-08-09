import { post, readFileBinary, newElement } from "./utils.js";

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
      for: "tablecontainer",
      innerHTML: "collections:",
    });
    this.collectionTableContainer = newElement('div', {
      id: "tablecontainer",
      style: "height: 360px; border: 1px solid black; overflow: auto; width: max-content",
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
      var osuFile = await getBinaryFile("osu!.db");
      var collectionFile = await getBinaryFile("collection.db");
      // console.log({osuFile, collectionFile});
      
      const response = await post("/api/parsedb", {osuFile, collectionFile})
      this.osuData = response.osuData;
      this.collectionData = response.collectionData;
      this.setOsuStatus(this.loadedMsg);

      const songsHandle = await this.osuDirectoryHandle.getDirectoryHandle("Songs");
      var asdf = [];
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
    this.folderSelectContainer.appendChild(this.osuSelect);
    this.folderSelectContainer.appendChild(this.osuSelectStatus);
    this.container.appendChild(this.folderSelectContainer);
    this.collectionSelectContainer.appendChild(this.collectionTableLabel);
    this.collectionSelectContainer.appendChild(this.collectionTableContainer);
    this.container.appendChild(this.collectionSelectContainer);
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
    const getRow = (i) => this.collectionTableContainer.firstChild.getElementsByTagName('tr')[i];
    if (this.selectedCollection !== undefined) {
      getRow(this.selectedCollection).classList.remove("selected");
    }
    getRow(index).classList.add("selected");
    this.selectedCollection = index;
  }

  refreshTable() {
    if (!this.loaded) return;
    this.collectionSelectContainer.hidden = false;
    var table = document.createElement('table');
    table.classList.add("collectionlist");

    this.collections.forEach((collection, index) => {
      var row = document.createElement('tr');
      var cell = document.createElement('td');
      var title = `${collection.name} (${collection.beatmapsCount})`;
      cell.addEventListener('click', () => this.selectCollection.bind(this)(index));
      cell.innerHTML = title;
      row.appendChild(cell);
      table.appendChild(row);
    });

    const oldChild = this.collectionTableContainer.firstChild;
    if (oldChild === null) {
      this.collectionTableContainer.appendChild(table);
    } else {
      this.collectionTableContainer.replaceChild(table, oldChild);
    }
  }
}