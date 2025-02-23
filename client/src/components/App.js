import React, { Component } from "react";

import Home from "./pages/Home.js";

import "../utilities.css";

/**
 * Define the "App" component as a class.
 */
class App extends Component {
  // makes props available in this component
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return <Home />;
  }
}

export default App;
