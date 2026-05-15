import { useCallback, useEffect, useRef, useState } from 'react';
import Orb from './components/Orb.jsx';
import Controls from './components/Controls.jsx';
import TimerOverlay from './components/TimerOverlay.jsx';
import History from './components/History.jsx';
import { useWakeLock } from './hooks/useWakeLock.js';
import { addSession } from './lib/db.js';
import { DEFAULT_COLOR } from './lib/colors.js';

const PREFS_KEY = 'kasi:prefs:v1';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function initialOrbSize() {
  if (typeof window === 'undefined') return 240;
  return Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.45);
}

export default function App() {
  const stored = loadPrefs();
  const [color, setColor] = useState(stored?.color || DEFAULT_COLOR);
  const [brightness, setBrightness] = useState(stored?.brightness ?? 0.9);
  const [pulse, setPulse] = useState(stored?.pulse ?? false);
  const [shape, setShape] = useState(stored?.shape || 'circle');
  const [orbSize, setOrbSize] = useState(stored?.orbSize || initialOrbSize());
  const [timerMinutes, setTimerMinutes] = useState(stored?.timerMinutes || 10);

  const [view, setView] = useState('meditate'); // 'meditate' | 'history'
  const [controlsVisible, setControlsVisible] = useState(false);
  const [session, setSession] = useState(null); // { startedAt, endsAt, color, shape }

  const bellRef = useRef(null);

  useEffect(() => {
    savePrefs({ color, brightness, pulse, shape, orbSize, timerMinutes });
  }, [color, brightness, pulse, shape, orbSize, timerMinutes]);

  useWakeLock(!!session);

  const minOrbSize = 40;
  const [maxOrbSize, setMaxOrbSize] = useState(() => {
    if (typeof window === 'undefined') return 800;
    return Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.95);
  });

  useEffect(() => {
    const onResize = () => {
      setMaxOrbSize(Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.95));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const handleTapOrb = useCallback(() => {
    if (session) return; // immersive when timer is running
    setControlsVisible((v) => !v);
  }, [session]);

  const startTimer = useCallback(() => {
    const startedAt = Date.now();
    const durationMs = timerMinutes * 60 * 1000;
    setSession({
      startedAt,
      endsAt: startedAt + durationMs,
      color,
      shape,
    });
    setControlsVisible(false);
  }, [timerMinutes, color, shape]);

  const finishSession = useCallback(
    async (completed) => {
      if (!session) return;
      const endedAt = Date.now();
      const durationMs = Math.max(0, endedAt - session.startedAt);
      if (completed && bellRef.current) {
        try {
          bellRef.current.currentTime = 0;
          await bellRef.current.play();
        } catch {
          /* autoplay blocked; ignore */
        }
      }
      if (durationMs >= 1000) {
        try {
          await addSession({
            startedAt: session.startedAt,
            durationMs,
            color: session.color,
            shape: session.shape,
            notes: '',
          });
        } catch {
          /* ignore db errors */
        }
      }
      setSession(null);
    },
    [session]
  );

  const handleTimerComplete = useCallback(() => {
    finishSession(true);
  }, [finishSession]);

  const handleStopSession = useCallback(() => {
    finishSession(false);
  }, [finishSession]);

  return (
    <div className="relative w-full h-full">
      <Orb
        size={orbSize}
        setSize={setOrbSize}
        color={color}
        brightness={brightness}
        pulse={pulse}
        shape={shape}
        onTap={handleTapOrb}
        minSize={minOrbSize}
        maxSize={maxOrbSize}
      />

      {session && (
        <TimerOverlay
          endsAt={session.endsAt}
          onComplete={handleTimerComplete}
          onStop={handleStopSession}
        />
      )}

      {!session && (
        <Controls
          visible={controlsVisible}
          onDismiss={() => setControlsVisible(false)}
          color={color}
          setColor={setColor}
          brightness={brightness}
          setBrightness={setBrightness}
          pulse={pulse}
          setPulse={setPulse}
          shape={shape}
          setShape={setShape}
          timerMinutes={timerMinutes}
          setTimerMinutes={setTimerMinutes}
          onStartTimer={startTimer}
          onOpenHistory={() => setView('history')}
        />
      )}

      {view === 'history' && <History onClose={() => setView('meditate')} />}

      <audio ref={bellRef} src="/sounds/bell.wav" preload="auto" />
    </div>
  );
}
