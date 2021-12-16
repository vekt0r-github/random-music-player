import React from "react";

/**
 * label: <input>
 * props should at least contain {id, type} (id must be kebab-case)
 * and will likely contain {defaultValue, some event listener}
 */
const SettingInput = React.forwardRef((props, ref) => {
  let { id, label } = props;
  if (label === undefined) {
    // label = id.replace(/([A-Z])/g, " $1").toLowerCase() + ': ';
    label = id.replace(/(\-)/g, " ") + ': ';
  }
  let inputProps = {...props};
  delete inputProps.label;
  let inputElement = <input ref={ref}/>
  inputElement = {...inputElement, props}
  return (
    <>
      <label htmlFor={id}>{label}</label>
      {inputElement}
      <br/>
    </>
  );
});

export default SettingInput;