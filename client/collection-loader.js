import { post, readFileBinary, newElement } from "./utils.js";

export class CollectionLoader {
  constructor(container) {
    this.container = container;
    this.osuSelect = newElement('button', {
      type: "button",
      id: "osuselect",
      innerHTML: "select osu! folder",
    });
    this.osuSelectStatus = newElement('span', {
      id: "osuselectstatus",
    });
    this.noSelectMsg = "no directory selected";
    this.loadingMsg = "now loading!!!!";
    this.loadedMsg = "collections loaded!";

    this.osuDirectoryHandle = undefined;
    this.osuData = undefined;
    this.collectionData = undefined;
    
    this.setOsuStatus(this.noSelectMsg);
    this.osuSelect.addEventListener('click', this.onOsuSelectClick.bind(this));
    this.container.appendChild(this.osuSelect);
    this.container.appendChild(this.osuSelectStatus);
  }
  
  setOsuStatus(value) {
    this.osuSelectStatus.innerHTML = value;
  };

  async onOsuSelectClick() {
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
    console.log(this.osuData);
    console.log(this.collectionData);
  };
}