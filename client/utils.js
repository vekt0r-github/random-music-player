const random = (min, max) => Math.floor(Math.random() * (max - min)) + min; // [min, max)

/**
 * @param {Array} x 
 * @returns a random element from x
 */
export const randomChoice = (x) => x[random(0, x.length)];

/**
 * make async http request and run callback on the result
 * @param {String} fn filename
 * @param {Function} callback function which takes one argument, responseText
 */
export const loadData = (fn, callback) => {
  var oReq = new XMLHttpRequest();
  oReq.onload = function() {
    callback(this.responseText); 
  };
  oReq.open("get", fn, true); // no blocking
  oReq.send();
}

/**
 * splits a string by the dot before file extension
 * @param {String} fn 
 * @returns object {name, ext}
 */
export const splitFilename = (fn) => {
  var dot = fn.lastIndexOf('.');
  var ext = fn.substr(dot + 1);
  var name = fn.substr(0, dot);
  return {name, ext};
};