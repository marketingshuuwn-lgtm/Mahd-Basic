import { useState, useEffect, useCallback, useRef } from 'react';

const POMODORO_KEY = 'mahd_pomodoro_state_v1';

const DEFAULT_STATE = {
  running: false,
  mode: 'work', // 'work' or 'break'
  remaining: 25 * 60,
  startedAt: null,
};

function loadState() {
  try {
    const raw = localStorage.getItem(POMODORO_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      remaining: Number(parsed.remaining) || DEFAULT_STATE.remaining,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function usePomodoro() {
  const [state, setState] = useState(loadState);
  const intervalRef = useRef(null);

  const save = useCallback((next) => {
    setState(next);
    localStorage.setItem(POMODORO_KEY, JSON.stringify({
      running: next.running,
      mode: next.mode,
      remaining: next.remaining,
      startedAt: next.startedAt,
    }));
  }, []);

  useEffect(() => {
    if (!state.running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.remaining <= 1) {
          const nextMode = prev.mode === 'work' ? 'break' : 'work';
          const nextRemaining = nextMode === 'work' ? 25 * 60 : 5 * 60;
          const next = {
            ...prev,
            mode: nextMode,
            remaining: nextRemaining,
            startedAt: Date.now(),
          };
          // Save asynchronously without blocking
          setTimeout(() => save(next), 0);
          return next;
        }
        const next = { ...prev, remaining: prev.remaining - 1 };
        setTimeout(() => save(next), 0);
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.running, save]);

  const start = useCallback(() => {
    save({ ...state, running: true, startedAt: Date.now() });
  }, [state, save]);

  const stop = useCallback(() => {
    save({ ...state, running: false });
  }, [state, save]);

  const reset = useCallback(() => {
    save({ ...DEFAULT_STATE, running: false });
  }, [save]);

  const toggle = useCallback(() => {
    if (state.running) stop();
    else start();
  }, [state.running, start, stop]);

  return {
    running: state.running,
    mode: state.mode,
    remaining: state.remaining,
    start,
    stop,
    reset,
    toggle,
  };
}
