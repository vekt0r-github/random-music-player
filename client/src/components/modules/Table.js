import React from "react";

import styles from "./Table.css";

/**
 * a generic table with highlightable cells
 * 
 * entries: Row[]
 * Row: Entry[] | { cellEntries: Entry[], key }[]
 * Entry: { text, onclick, selected }
 */
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
          {entries.map((row, index) => {
            // handle object format and array format
            return <Row entries={row.cellEntries ?? row} key={row.key ?? index} />;
          })}
        </tbody>
      </table>
    </div>
  );
}