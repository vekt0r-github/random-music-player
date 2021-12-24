import React from "react";

import styles from "./Table.css";

export default function Table({ entries, maxHeight }) {
  const Row = ({ entries }) => {
    return (
      <tr>
        {entries.map(({text, onclick, selected}, index) => {
          const className = `
            ${styles.cell}
            ${selected ? styles.selected : ''}
          `;
          return <td onClick={onclick} className={className} key={index}>{text}</td>
        })}
      </tr>
    );
  }
  return (
    <div className={styles.container} style={{maxHeight: maxHeight}}>
      <table className={styles.table}>
        <tbody>
          {entries.map((row, index) => <Row entries={row} key={index} />)}
        </tbody>
      </table>
    </div>
  );
}