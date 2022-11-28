import React, { useState, useEffect } from "react";
import { TableVirtuoso } from "react-virtuoso";

import styles from "./Table.css";

export const CellStyles = Object.freeze({
  THIN: styles.thincell,
});

/**
 * makes one cell for either table
 * 
 * @param {str} text displayed inside cell
 * @param {() => void} onclick handler
 * @param {int} index 
 * @returns td element
 */
const makeCell = ({text, onclick, classes}, index) => {
  let cellClassName = styles.cell;
  if (classes) classes.map(x => cellClassName += " " + x);
  return <td onClick={onclick} className={cellClassName} key={index}>{text}</td>;
};

/**
 * a virtualized table with highlightable cells
 * 
 * @param rows list of arbitrary data objects
 * @param columns list of (row) => ({text, onclick, styles?})
 * @param filter func for rows
 * @param selected which index is selected
 */
export function VirtualizedTable(props) {
  const { rows, columns, filter, selected, maxHeight } = props;
  const [height, setHeight] = useState(maxHeight);
  
  return (
    <TableVirtuoso
      style={{ height: `${Math.min(height, maxHeight)}px` }}
      className={styles.container}
      data={rows.filter(filter)}
      itemContent={(index, row) => {
        let content = columns.map((col) => col(row, index));
        if (index == selected) { // dumb workaround to add selected to cells because virtuoso is stupid
          content = content.map(cellInfo => {
            let classes = cellInfo.classes ?? [];
            classes.push(styles.selected);
            return {...cellInfo, classes};
          });
        }
        return <>{content.map(makeCell)}</>;
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
 * @param columns list of (row) => ({text, onclick, styles?})
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
              {columns.map((col) => col(row, index)).map(makeCell)}
            </tr>
          })}
        </tbody>
      </table>
    </div>
  );
}
