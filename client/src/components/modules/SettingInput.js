import React from "react";

import styles from "./SettingInput.css";

/**
 * label: <input>
 * props should at least contain {id, type} (id must be kebab-case)
 * and will likely contain {defaultValue, some event listener}
 */
const SettingInput = React.forwardRef((props, ref) => {
  let { id, type, label } = props;
  if (label === undefined) {
    // label = id.replace(/([A-Z])/g, " $1").toLowerCase() + ': ';
    label = id.replace(/(\-)/g, " ") + ': ';
  }
  let inputProps = {
    ...props,
    ref: ref,
    className: styles.input,
  };
  delete inputProps.label;
  let inputElement = React.createElement("input", inputProps);
  return (
    <div className={styles.inputContainer}>
      <label htmlFor={id}>{label}</label>
      {inputElement}
      <br/>
    </div>
  );
});

export default SettingInput;