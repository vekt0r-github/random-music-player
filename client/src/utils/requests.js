// ex: formatParams({ some_key: "some_value", a: "b"}) => "some_key=some_value&a=b"
export function formatParams(params) {
  // iterate of all the keys of params as an array,
  // map it to a new array of URL string encoded key,value pairs
  // join all the url params using an ampersand (&).
  return Object.keys(params)
    .map((key) => key + "=" + encodeURIComponent(params[key]))
    .join("&");
}

const RESPONSE_TYPE_TO_METHOD_NAME = {
  json: "json",
  blob: "blob",
};

// process fetch result using specified method with error handling
function processResponse(res, responseType = "json") {
  if (!res.ok) {
    throw `API request failed with response status ${res.status} and text: ${res.statusText}`;
  }
  const method = RESPONSE_TYPE_TO_METHOD_NAME[responseType];
  return res
    .clone()
    [method]()
    .catch((error) => {
      return res.text().then((text) => {
        throw `API request's result could not be converted using .${method}: \n${error}\n\ntext:\n${text}`;
      });
    });
}

// Helper code to make a get request. Default parameter of empty JSON Object for params.
// Returns a Promise to a JSON Object.
export function get(endpoint, params = {}, responseType = "json") {
  const fullPath = endpoint + "?" + formatParams(params);
  return fetch(fullPath)
    .then((res) => processResponse(res, responseType))
    .catch((error) => {
      // give a useful error message
      throw `GET request to ${fullPath} failed with error:\n${error}`;
    });
}

// Helper code to make a post request. Default parameter of empty JSON Object for params.
// Returns a Promise to a JSON Object.
export function post(endpoint, params = {}) {
  return fetch(endpoint, {
    method: "post",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(params),
  })
    .then(processResponse)
    .catch((error) => {
      // give a useful error message
      throw `POST request to ${endpoint} failed with error:\n${error}`;
    });
}
