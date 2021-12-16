import { CollectionLoader } from "./collection-loader.js";
import { splitFilename, get } from "./utils.js";

import defaultPool from '../data/songs.json';

export function setup() {
  // console.log(this)
  const initPlayer = (pool) => {
    // console.log(pool_json);
    const initNoRepeatNum = Math.min(100, pool.length-1);
    this.setState({
      pool: pool,
      noRepeatNum: initNoRepeatNum,
    });
  }

  const settingSelect = document.getElementById("setting");
  const fileSelect = document.getElementById("fileselect");
  const osuContainer = document.getElementById("osucontainer");
  const startButton = document.getElementById("start");

  const collectionLoader = new CollectionLoader(osuContainer);

  let activeURLs = [];

  const resetURLs = () => {
    for (const url of activeURLs) URL.revokeObjectURL(url);
    activeURLs = [];
  };

  const makeAudioURL = (file) => {
    const url = URL.createObjectURL(file);
    activeURLs.push(url);
    return url;
  }

  const onSettingChange = () => {
    const setting = settingSelect.value;
    fileSelect.hidden = !["folder"].includes(setting);
    osuContainer.hidden = !["osu"].includes(setting);
  };

  const onStartClick = async () => {
    resetURLs();
    const setting = settingSelect.value;
    if (setting === "default") {
      initPlayer(defaultPool);
    } else if (setting === "folder") {
      const files = [...fileSelect.files];
      let pool = [];
      files.forEach((file) => {
        const {name, ext} = splitFilename(file.name);
        if (!["mp3", "wav", "flac"].includes(ext)) return;
        const url = makeAudioURL(file);
        pool.push({
          path: url,
          displayName: name,
        });
      });
      initPlayer(pool);
    } else if (setting === "osu") {
      const collection = collectionLoader.collections[collectionLoader.selectedCollection];
      const hashes = new Set(collection.beatmapsMd5);
      const beatmaps = collectionLoader.findMaps(hashes);
      const promises = beatmaps.map(async (beatmap) => {
        const handle = await collectionLoader.getAudioHandle(beatmap);
        if (handle === null) return null; // silently remove beatmap
        const url = await handle.getFile().then(makeAudioURL);
        const artistUnicode = beatmap.artist_name_unicode;
        const titleUnicode = beatmap.song_title_unicode;
        const artist = beatmap.artist_name;
        const title = beatmap.song_title;
        return {
          path: url,
          displayName: `${artist} - ${title}`,
          displayNameUnicode: artistUnicode ? `${artistUnicode} - ${titleUnicode}` : undefined,
          artist, title, artistUnicode, titleUnicode,
        };
      });
      const pool = await Promise.all(promises);
      initPlayer(pool.filter(x => x !== null));
    }
  };

  onSettingChange();
  settingSelect.addEventListener('change', onSettingChange);
  startButton.addEventListener('click', onStartClick);
}
