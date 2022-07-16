import React, { Component } from "react";

import styles from "./componentStyles.css";

/**
 * wraps component in a label, optionally autogenerating it from id
 * label: <input>
 * props should at least contain id (id must be kebab-case)
 * and optionally label
 */
export const WithLabel = ({
  id,
  label,
  children,
}) => {
  if (label === undefined) {
    // label = id.replace(/([A-Z])/g, " $1").toLowerCase() + ': ';
    label = id.replace(/(\-)/g, " ") + ': ';
  }
  const child = React.Children.only(children);
  return (
    <div className={styles.inputContainer}>
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(child, { id })}
      <br/>
    </div>
  );
};

/**
 * text input constrained to non-negative integers
 * props: {
 *   defaultValue,
 *   onValidInput,
 *   ...props
 * }
 */
export class IntegerInput extends Component {
  constructor (props) {
    super(props);
    this.state = {
      currIntValue: props.defaultValue,
      currValue: props.defaultValue,
    };
  }
  
  setCurrValue(value) {
    const newState = { currValue: value };
    const intValue = parseInt(value);
    if (!isNaN(intValue)) {
      this.props.onValidInput(intValue);
      newState.currIntValue = intValue;
    }
    this.setState(newState);
  }

  render() {
    const {
      defaultValue,
      onValidInput,
      ...props
    } = this.props;

    return (
      <>
        <input
          className={styles.input}
          type='text'
          value={this.state.currValue}
          onInput={(e) => this.setCurrValue(e.target.value)}
          onBlur={(e) => { e.target.value = this.state.currIntValue }}
          {...props}
          />
        <button
          type="button"
          className={styles.plusMinusButton}
          onClick={() => this.setCurrValue(Math.max(this.state.currIntValue - 1, 0))}
          >-1</button>
        <button
          type="button"
          className={styles.plusMinusButton}
          onClick={() => this.setCurrValue(this.state.currIntValue + 1)}
          >+1</button>
      </>
    );
  }
}