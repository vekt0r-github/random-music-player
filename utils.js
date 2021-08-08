const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;
export const randomChoice = (x) => x[random(0, x.length)];

export const splitFilename = (fn) => {
  var dot = fn.lastIndexOf('.');
  var ext = fn.substr(dot + 1);
  var name = fn.substr(0, dot);
  return {name, ext};
};