import { useEffect, useMemo, useRef, useState } from 'react';
import { Game, W, H, loadSave, newSave, clearSave, hasSave } from './game/engine';
import type { SaveData } from './game/engine';
import { Sfx } from './game/audio';
import { drawDude, drawLogo } from './game/draw';
import { STORY, CREDITS, TIPS } from './game/world';

type Screen = 'loading' | 'title' | 'story' | 'game' | 'credits' | 'controls';

const sfx = new Sfx();

/* ---------------- Loading ---------------- */
function Loading({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);
  const letters = useMemo(() => 'Created by Stick Studios'.split('').map((ch, i) => ({
    ch, rot: (Math.sin(i * 12.9898) * 7), dy: Math.cos(i * 78.233) * 7, sz: 0.85 + ((Math.sin(i * 3.1) + 1) / 2) * 0.45,
  })), []);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (n: number) => {
      const p = Math.min(1, (n - t0) / 4800);
      setPct(p);
      if (p >= 1) { setTimeout(onDone, 350); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center select-none" onClick={onDone}>
      <div className="text-center px-4 wobble" style={{ fontFamily: '"Rock Salt","Comic Sans MS",cursive', color: '#1e6bff', textShadow: '0 0 18px rgba(30,107,255,0.55)' }}>
        {letters.map((l, i) => (
          <span key={i} style={{ display: 'inline-block', transform: `rotate(${l.rot}deg) translateY(${l.dy}px)`, fontSize: `${l.sz * 2.6}rem`, whiteSpace: 'pre', lineHeight: 1.3 }}>{l.ch}</span>
        ))}
      </div>
      <div className="mt-14 w-80 max-w-[80vw]">
        <svg viewBox="0 0 300 24" className="w-full">
          <path d="M3 12 Q 80 6 150 13 T 297 11" stroke="#1e6bff" strokeWidth="2" fill="none" opacity="0.5" />
          <path d={`M3 12 Q ${3 + pct * 70} 6 ${3 + pct * 147} 13 T ${3 + pct * 294} 11`} stroke="#3d8bff" strokeWidth="9" strokeLinecap="round" fill="none" />
        </svg>
        <p className="text-center mt-2 text-sm" style={{ color: '#4a7bd8', fontFamily: '"Gloria Hallelujah",cursive' }}>Loading… {Math.floor(pct * 100)}%</p>
      </div>
      <p className="absolute bottom-8 px-6 text-center max-w-2xl" style={{ color: '#2c5ac0', fontFamily: '"Gloria Hallelujah",cursive' }}>{tip}</p>
    </div>
  );
}

/* ---------------- Title ---------------- */
function Logo({ size }: { size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const cv = ref.current; if (!cv) return;
      const c = cv.getContext('2d')!; c.clearRect(0, 0, size, size); drawLogo(c, size);
    };
    draw();
    void document.fonts?.load('150px "Permanent Marker"').then(draw);
    const t = setTimeout(draw, 800);
    return () => clearTimeout(t);
  }, [size]);
  return <canvas ref={ref} width={size} height={size} className="rounded-2xl shadow-2xl" style={{ width: size, height: size, boxShadow: '0 0 60px rgba(255,200,0,0.35)' }} />;
}

function WalkingDude() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, c = cv.getContext('2d')!; let raf = 0, x = -60, walk = 0, last = performance.now(), t = 0;
    const loop = (n: number) => {
      const dt = Math.min(0.05, (n - last) / 1000); last = n; t += dt; x += 140 * dt; walk += dt * 140 * 0.036; if (x > 1020) x = -60;
      c.clearRect(0, 0, 960, 130);
      c.strokeStyle = '#4f8f6a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 118); c.lineTo(960, 118); c.stroke();
      drawDude(c, x, 118, { face: 1, t, walk, moving: true, onGround: true, vy: 0, atk: 0, atkDir: 0, dash: false, hurt: false, focus: 0, cast: 0, dead: 0, speed: 140, scale: 1.2 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={960} height={130} className="w-full max-w-4xl opacity-90" />;
}

function Title({ go, start, cont }: { go: (s: Screen) => void; start: () => void; cont: () => void }) {
  const can = hasSave();
  const btn = 'px-8 py-2.5 text-xl rounded-lg border-2 border-yellow-300/60 text-yellow-100 bg-black/40 hover:bg-yellow-300 hover:text-black hover:scale-105 transition w-64';
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a3a66 0%, #0b1226 60%, #04060e 100%)', fontFamily: '"Gloria Hallelujah",cursive' }}>
      <div className="absolute inset-0 pointer-events-none stars" />
      <div className="flex flex-col md:flex-row items-center gap-8 z-10 px-4">
        <Logo size={Math.min(300, Math.floor((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.4))} />
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-6xl md:text-7xl text-yellow-300 drop-shadow-[0_0_20px_rgba(255,220,0,0.6)]" style={{ fontFamily: '"Permanent Marker",cursive' }}>StickDude</h1>
          <p className="text-blue-200/70 -mt-1 mb-2 text-sm text-center max-w-xs">Mana made the world. The staff remembers what the Creators buried.</p>
          <button className={btn} onClick={start}>New Game</button>
          <button className={btn + (can ? '' : ' opacity-40 pointer-events-none')} onClick={cont}>Continue</button>
          <button className={btn} onClick={() => go('story')}>Storyline</button>
          <button className={btn} onClick={() => go('controls')}>Controls</button>
          <button className={btn} onClick={() => go('credits')}>Credits</button>
        </div>
      </div>
      <div className="absolute bottom-0 w-full flex justify-center"><WalkingDude /></div>
      <p className="absolute bottom-2 text-xs text-blue-200/50">© Stick Studios</p>
    </div>
  );
}

/* ---------------- Story ---------------- */
function Art({ kind }: { kind: string }) {
  const s = { stroke: '#1a2a9a', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 160 170" className="w-36 h-36 shrink-0">
      {kind === 'spell' && (<g {...s}><circle cx="45" cy="55" r="34" /><circle cx="45" cy="45" r="6" /><path d="M45 52v20M45 72l-7 12M45 72l7 12" /><path d="M95 30h50l-12 60h-26z" /><path d="M110 20q15 6 30 0" /><rect x="112" y="108" width="22" height="44" /><path d="M105 120h36" /><path d="M10 160h140" /></g>)}
      {kind === 'entity' && (<g {...s}><circle cx="80" cy="42" r="26" /><path d="M64 36l12 8M96 36l-12 8M68 56q12 6 24 0" /><path d="M80 68v50M80 118l-14 30M80 118l14 30M80 118v32M66 148h28" /><path d="M10 160h140" /></g>)}
      {kind === 'ancient' && (<g {...s}><circle cx="80" cy="34" r="24" /><path d="M66 24v14M74 24v14M86 24v14M94 24v14" /><path d="M80 58v50M80 108l-14 42M80 108l14 42M80 70l24 22M80 72l-28 22" /><path d="M46 100l-10 10 4 4 10-10z" /><path d="M10 160h140" /></g>)}
      {kind === 'mana' && (<g {...s}><rect x="10" y="68" width="140" height="34" /><path d="M14 72l20 26M24 72l-10 26M38 72l26 24M50 98l20-26M70 72l-16 26M80 76l20 20M96 100l-14-26M60 84h60" /><path d="M105 68v34" /></g>)}
      {kind === 'absorber' && (<g {...s}><circle cx="80" cy="38" r="26" fill="#1a2a9a" /><path d="M80 28v12M80 48v1" stroke="#fff" strokeWidth="4" /><path d="M80 64v52M80 116l-12 36M80 116l12 36M80 76l-18 30M80 76l18 30" /><path d="M10 160h140" /></g>)}
      {kind === 'creator' && (<g {...s}><circle cx="70" cy="40" r="26" /><path d="M62 30v14M78 30v14" /><path d="M70 66v44M70 110l-12 40M70 110l12 40M70 76l-18 26M70 76l42 12" /><circle cx="120" cy="86" r="6" /><path d="M10 160h140" /></g>)}
    </svg>
  );
}

function Story({ onDone, label }: { onDone: () => void; label: string }) {
  const [i, setI] = useState(0);
  const pg = STORY[i];
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-3 overflow-auto" style={{ fontFamily: '"Gloria Hallelujah",cursive' }}>
      <div className="relative w-full max-w-3xl my-auto rounded-md shadow-2xl p-6 md:p-10 text-[#1a2a9a] page" key={i}>
        <div className="text-right text-sm opacity-60 mb-1">{pg.title}</div>
        {pg.sections.map((sec, k) => (
          <div key={k} className="mb-8 flex flex-col sm:flex-row gap-4 items-start">
            <Art kind={sec.art} />
            <div>
              <h2 className="text-3xl underline mb-2" style={{ fontFamily: '"Rock Salt",cursive' }}>{sec.heading}</h2>
              <p className="text-lg leading-8">{sec.text}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between mt-4 text-white" style={{ fontFamily: '"Gloria Hallelujah",cursive' }}>
          <button disabled={i === 0} onClick={() => setI(i - 1)} className="px-4 py-2 rounded bg-[#1a2a9a] disabled:opacity-30">← Back</button>
          <span className="text-[#1a2a9a]">{i + 1} / {STORY.length}</span>
          {i < STORY.length - 1
            ? <button onClick={() => setI(i + 1)} className="px-4 py-2 rounded bg-[#1a2a9a]">Next →</button>
            : <button onClick={onDone} className="px-4 py-2 rounded bg-[#c4313f]">{label} ▶</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Controls & Credits ---------------- */
function Controls({ back }: { back: () => void }) {
  const rows: [string, string][] = [['Move', 'Arrow keys / A D'], ['Jump (hold = higher)', 'Space / Z / K'], ['Staff attack (↑ / ↓ to aim)', 'X / J'], ['Dash (after Absorber shrine)', 'Shift / C / L'],
    ['Double jump (found in Caverns)', 'Jump again in the air'], ['Choose a Working', 'R: Spell / Ritual / Sacrifice'],
    ['Release your Working', 'Q: Spell 33 mana / Ritual 44 mana / Sacrifice 1 will'],
    ['Weave a Will Thread (33 mana)', 'Hold F on the ground'], ['Talk / Read / Rest', '↑ or E'], ['Pause', 'Esc / P']];
  return (
    <div className="fixed inset-0 bg-[#080b1a] flex flex-col items-center justify-center text-white p-4 overflow-y-auto" style={{ fontFamily: '"Gloria Hallelujah",cursive' }}>
      <h2 className="text-4xl text-yellow-300 mb-6" style={{ fontFamily: '"Permanent Marker",cursive' }}>Controls</h2>
      <div className="w-full max-w-xl space-y-2">
        {rows.map(([a, b]) => <div key={a} className="flex justify-between border-b border-white/10 pb-1"><span>{a}</span><span className="text-yellow-200">{b}</span></div>)}
      </div>
      <p className="mt-6 text-blue-200/70 text-sm text-center max-w-lg">Spell throws mana. Ritual draws a circle that strikes nearby Entities. Sacrifice trades a Will Thread for power. A glowing circle saves your journey; falling costs one thread.</p>
      <button onClick={back} className="mt-8 px-8 py-2 rounded-lg bg-yellow-300 text-black text-lg">Back</button>
    </div>
  );
}

function Credits({ back, ending }: { back: () => void; ending: boolean }) {
  return (
    <div className="fixed inset-0 bg-black overflow-hidden text-white" style={{ fontFamily: '"Gloria Hallelujah",cursive' }}>
      <div className="credits-scroll absolute left-0 right-0 text-center flex flex-col items-center gap-3">
        {ending && <p className="text-2xl text-yellow-200 max-w-xl mb-10">The Absorbers have ascended. The war is over. Cultist Dave is still in his tornado. Thank you for playing!</p>}
        <div style={{ filter: 'drop-shadow(0 0 20px rgba(255,200,0,.5))' }}><Logo size={220} /></div>
        <h1 className="text-6xl text-yellow-300 mt-4" style={{ fontFamily: '"Permanent Marker",cursive' }}>StickDude</h1>
        <p className="mt-10 text-3xl" style={{ color: '#3d8bff', fontFamily: '"Rock Salt",cursive' }}>Created by Stick Studios</p>
        <h2 className="mt-12 text-3xl text-yellow-200 underline">Credits</h2>
        {CREDITS.map(n => <p key={n} className="text-2xl">{n}</p>)}
        <p className="mt-16 text-lg text-blue-200/70 max-w-md">Special thanks to: Gary, Larry, Four-Eyes Frank, Cultist Dave, and the sacrificial chicken (who is fine).</p>
        <p className="mt-6 text-lg text-blue-200/70">Entities: just in it for the memes and lore.</p>
      </div>
      <button onClick={back} className="fixed bottom-6 right-6 px-6 py-2 rounded-lg bg-yellow-300 text-black z-10">{ending ? 'Back to Title' : 'Back'}</button>
    </div>
  );
}

/* ---------------- Game view ---------------- */
function GameView({ save, onQuit, onEnding }: { save: SaveData; onQuit: () => void; onEnding: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = new Game(ref.current!, sfx, save, onQuit, onEnding);
    g.start();
    return () => g.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <canvas ref={ref} width={W} height={H} style={{ width: 'min(100vw, calc(100vh * 16 / 9))', aspectRatio: '16 / 9', background: '#000' }} />
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [storyNext, setStoryNext] = useState<'title' | 'game'>('title');
  const [save, setSave] = useState<SaveData>(newSave());
  const [ending, setEnding] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => { document.title = 'StickDude'; }, []);

  const toTitle = () => { sfx.init(); sfx.setMusic(4, false); setScreen('title'); };
  const startNew = () => { sfx.init(); clearSave(); setSave(newSave()); setStoryNext('game'); setScreen('story'); };
  const cont = () => { sfx.init(); setSave(loadSave() ?? newSave()); setGameKey(k => k + 1); setScreen('game'); };

  return (
    <>
      {screen === 'loading' && <Loading onDone={() => setScreen(s => (s === 'loading' ? 'title' : s))} />}
      {screen === 'title' && <div onPointerDown={() => { sfx.init(); if (!sfx.timer) sfx.setMusic(4, false); }}><Title go={s => { sfx.init(); setStoryNext('title'); setScreen(s); }} start={startNew} cont={cont} /></div>}
      {screen === 'story' && <Story label={storyNext === 'game' ? 'Begin' : 'Back'} onDone={() => { if (storyNext === 'game') { setGameKey(k => k + 1); setScreen('game'); } else toTitle(); }} />}
      {screen === 'controls' && <Controls back={toTitle} />}
      {screen === 'credits' && <Credits ending={ending} back={() => { setEnding(false); toTitle(); }} />}
      {screen === 'game' && <GameView key={gameKey} save={save} onQuit={toTitle} onEnding={() => { setEnding(true); clearSave(); sfx.stopMusic(); sfx.setMusic(4, false); setScreen('credits'); }} />}
    </>
  );
}
