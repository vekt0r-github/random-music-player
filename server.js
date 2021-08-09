const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const api = require("./api");

const app = express();
app.use(bodyParser.json({limit: 2**30, type: ['application/json', 'text/plain']}));

app.use(express.static(path.join(__dirname, 'client/')));
app.use("/parser.js", express.static(path.join(__dirname, 'node_modules/osu-db-parser/index.js')));
app.use("/api", api);

app.get('/', (req, res) => {
  res.sendFile("index.html", { root: __dirname });
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});