import React from "react";

export default function Table({ entries }) {
  const Row = ({ entries }) => {
    return (
      <tr>
        {entries.map(({text, onclick, selected}, index) => {
          const className = selected ? "selected" : "";
          return <td onClick={onclick} className={className} key={index}>{text}</td>
        })}
      </tr>
    );
  }
  return (
    <table>
      <tbody>
        {entries.map((row, index) => <Row entries={row} key={index} />)}
      </tbody>
    </table>
  );
}