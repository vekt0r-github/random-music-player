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
 * @param selected (index) => whether index is selected
 */
export const VirtualizedTable = React.forwardRef((props, ref) => {
  const { rows, columns, filter, selected, maxHeight } = props;
  const [height, setHeight] = useState(maxHeight);

  return (
    <TableVirtuoso
      ref={ref}
      style={{ height: `${Math.min(height, maxHeight)}px` }}
      className={styles.container}
      data={rows.filter(filter)}
      itemContent={(index, row) => { // index is for the filtered list
        let content = columns.map((col) => col(row, index));
        if (selected(index)) { // dumb workaround to add selected to cells because virtuoso is stupid
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
});

/**
 * a generic table with highlightable cells
 * note: filter is not currently used anywhere (only on virtualized table)
 * so technically behavior of selected is slightly different from the other table
 * 
 * @param rows list of arbitrary data objects
 * @param columns list of (row) => ({text, onclick, styles?})
 * @param filter func for rows
 * @param selected (index) => whether index is selected
 */
export function Table({ rows, columns, filter, selected, maxHeight }) {
  return (
    <div className={styles.container} style={{maxHeight: `${maxHeight}px`}}>
      <table>
        <tbody>
          {rows.map((row, index) => { // this index is for the pre-filtered list
            if (filter && !filter(row, index)) return null;
            const rowClassName = selected(index) ? styles.selected : '';
            return <tr key={index} className={rowClassName}>
              {columns.map((col) => col(row, index)).map(makeCell)}
            </tr>
          })}
        </tbody>
      </table>
    </div>
  );
}
