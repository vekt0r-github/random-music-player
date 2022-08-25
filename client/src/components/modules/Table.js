import React, { useState, useEffect } from "react";
import { TableVirtuoso } from "react-virtuoso";

import styles from "./Table.css";

/**
 * a virtualized table with highlightable cells
 * 
 * @param rows list of arbitrary data objects
 * @param columns list of fns mapping row to {text, onclick}
 * @param filter func for rows
 * @param selected which index is selected
 */
export function VirtualizedTable(props) {
  const { rows, columns, filter, selected, maxHeight } = props;
  const [height, setHeight] = useState(maxHeight);
  // useEffect(() => setHeight(maxHeight), [props]);
  return (
    <TableVirtuoso
      style={{ height: `${Math.min(height, maxHeight)}px` }}
      className={styles.container}
      data={rows.filter(filter)}
      itemContent={(index, row) => {
        let cellClassName = styles.cell;
        if (index === selected) cellClassName += " " + styles.selected;
        return <>
          {columns.map((col) => col(row, index)).map(
            ({text, onclick}, index) => {
              {/* console.log(text, index) */}
              return <td onClick={onclick} className={cellClassName} key={index}>{text}</td>
            }
          )}
        </>
      }}
      increaseViewportBy={{ top: 1000, bottom: 1000 }} // in px
      totalListHeightChanged={(h) => {
        const listHeight = h + 1; // hack due to weird border compute error
        setHeight(listHeight);
      }}
    />
  )
}

/**
 * a generic table with highlightable cells
 * 
 * @param rows list of arbitrary data objects
 * @param columns list of fns mapping row to {text, onclick}
 * @param filter func for rows
 * @param selected which index is selected
 */
export function Table({ rows, columns, filter, selected, maxHeight }) {
  return (
    <div className={styles.container} style={{maxHeight: `${maxHeight}px`}}>
      <table>
        <tbody>
          {rows.map((row, index) => {
            if (filter && !filter(row, index)) return null;
            const rowClassName = index === selected ? styles.selected : '';
            return <tr key={index} className={rowClassName}>
              {columns.map((col) => col(row, index)).map(({text, onclick}, index) => 
                <td onClick={onclick} className={styles.cell} key={index}>{text}</td>
              )}
            </tr>
          })}
        </tbody>
      </table>
    </div>
  );
}