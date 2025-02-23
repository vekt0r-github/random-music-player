import React, { useReducer, useCallback, useRef, useEffect } from "react";

/**
 * same as react's useReducer but the setter function returns a promise
 * args are the same as react useReducer
 * @returns the two things useReducer returns, and stateRef
 */
export function useReducerPromise(reducer, initialArg, init) {
  const [state, dispatch] = useReducer(reducer, initialArg, init);
  const stateRef = useRef(null);
  const resolveRef = useRef(null);

  const dispatchPromise = useCallback((action) => {
    dispatch(action);
    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      if (Object.is(reducer(stateRef.current, action), stateRef.current)) {
        resolve(stateRef.current);
      }
    });
  }, []); // keep object reference stable, exactly like `useState`

  useEffect(() => {
    stateRef.current = state;
    // only resolve promise on state *updates*
    if (resolveRef.current) {
      resolveRef.current(stateRef.current); // resolve promise
      resolveRef.current = null; // reset after execution
    }
  }, [state]);

  return [state, dispatchPromise, stateRef];
}

export function useStatePromise(initialValue) {
  return useReducerPromise((state, action) => {
    if (typeof action === "function") return action(state);
    return action;
  }, initialValue);
}
