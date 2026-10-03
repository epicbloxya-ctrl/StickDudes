import { Sfx } from './audio';
import { AREAS, GY, WH, DEATH_QUOTES, SHOP, SHOP_JOKES, TIPS } from './world';
import type { AreaDef, Solid, Rect, EKind, Surface } from './world';
import { drawAbsorberEcho, drawDude, drawEntity, drawGaryNpc, type DrawEnemy } from './draw';

export const W = 960;
export const H = 540;
const G = 2300, SPEED = 290, JUMP = 790, DJUMP = 730, MAXFALL = 1050, DASHV = 740;
const FONT = '"Gloria Hallelujah", "Comic Sans MS", cursive';
const KEY = 'stickdude_save_v1';
type Working = 'spell' | 'ritual' | 'sacrifice';
const WORKINGS: Working[] = ['spell', 'ritual', 'sacrifice'];
const WORKING_LABEL: Record<Working, string> = { spell: 'SPELL', ritual: 'RITUAL', sacrifice: 'SACRIFICE' };

export interface SaveData {
  area: number; benchArea: number; benchX: number; maxHp: number; geo: number; dmg: number;
  siphon: boolean; quick: boolean; dash: boolean; djump: boolean;
  bosses: Record<string, boolean>; got: string[]; bought: string[]; deaths: number; lore: string[];
  chapters: number[]; working: Working;
}
export const newSave = (): SaveData => ({ area: 0, benchArea: 0, benchX: 1200, maxHp: 5, geo: 0, dmg: 1, siphon: false, quick: false, dash: false, djump: false, bosses: {}, got: [], bought: [], deaths: 0, lore: [], chapters: [], working: 'spell' });
export function loadSave(): SaveData | null {
  try { const s = localStorage.getItem(KEY); return s ? { ...newSave(), ...JSON.parse(s) } : null; } catch { return null; }
}
export function hasSave() { return loadSave() !== null; }
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

interface Body { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean; hitWall: boolean; surf: Surface }
interface Player extends Body {
  face: number; hp: number; mana: number; invuln: number; stun: number; coyote: number; jumpBuf: number; atkBuf: number; dashBuf: number; spellBuf: number; interactBuf: number;
  atkT: number; atkDir: number; atkHit: Set<Enemy>; atkCd: number; dashT: number; dashCd: number; airDash: boolean; dbl: boolean; jumping: boolean;
  walk: number; focusT: number; castT: number; dead: number; safe: { x: number; y: number }; recoil: number; stepIdx: number; t: number;
}
interface Enemy extends Body, DrawEnemy {
  dead: boolean; stun: number; dmg: number; boss: boolean; homeX: number; homeY: number; hops: number; sub: number; shots: number;
}
interface Proj { x: number; y: number; vx: number; vy: number; r: number; dmg: number; life: number; friendly: boolean; kind: 'orb' | 'wave' | 'shock' | 'bolt'; col: string }
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; col: string; g: number; glow: boolean }
interface Drop { x: number; y: number; vx: number; vy: number; val: number; life: number }
interface Sigil { x: number; y: number; kind: 'ritual' | 'sacrifice'; life: number; max: number; radius: number }
interface Dialog { name: string; lines: string[]; i: number; chars: number; onClose?: () => void }

const STATS: Record<EKind, { w: number; h: number; hp: number; dmg: number; shards: number }> = {
  crawler: { w: 44, h: 46, hp: 3, dmg: 1, shards: 2 },
  floater: { w: 38, h: 56, hp: 2, dmg: 1, shards: 2 },
  hopper: { w: 40, h: 66, hp: 4, dmg: 1, shards: 4 },
  spitter: { w: 44, h: 68, hp: 3, dmg: 1, shards: 5 },
  ancient: { w: 36, h: 80, hp: 6, dmg: 1, shards: 7 },
  gary: { w: 88, h: 128, hp: 40, dmg: 2, shards: 40 },
  ancientBoss: { w: 76, h: 116, hp: 52, dmg: 2, shards: 60 },
  creator: { w: 52, h: 98, hp: 75, dmg: 2, shards: 100 },
};

const ov = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function moveX(b: Body, solids: Solid[], dx: number) {
  b.x += dx; b.hitWall = false;
  for (const s of solids) {
    if (s.oneWay || !ov(b, s)) continue;
    if (dx > 0) b.x = s.x - b.w; else if (dx < 0) b.x = s.x + s.w; else continue;
    b.hitWall = true;
  }
}
function moveY(b: Body, solids: Solid[], dy: number) {
  const prevBottom = b.y + b.h;
  b.y += dy; b.onGround = false;
  for (const s of solids) {
    if (!ov(b, s)) continue;
    if (s.oneWay) {
      if (dy >= 0 && prevBottom <= s.y + 1) { b.y = s.y - b.h; b.vy = 0; b.onGround = true; b.surf = s.surf; }
    } else if (dy > 0) { b.y = s.y - b.h; b.vy = 0; b.onGround = true; b.surf = s.surf; }
    else if (dy < 0) { b.y = s.y + s.h; b.vy = 0; }
  }
}

const UP = ['ArrowUp', 'KeyW'], DOWN = ['ArrowDown', 'KeyS'], LEFT = ['ArrowLeft', 'KeyA'], RIGHT = ['ArrowRight', 'KeyD'];
const JUMPK = ['Space', 'KeyZ', 'KeyK'], ATK = ['KeyX', 'KeyJ'], DASH = ['ShiftLeft', 'ShiftRight', 'KeyC', 'KeyL'], SPELL = ['KeyQ'], FOCUS = ['KeyF'], INTER = ['KeyE', 'ArrowUp', 'KeyW'];

type Mode = 'play' | 'dialog' | 'shop' | 'pause';

export class Game {
  cv: HTMLCanvasElement; cx: CanvasRenderingContext2D; sfx: Sfx; sv: SaveData;
  area!: AreaDef; solids: Solid[] = []; gates: Solid[] = [];
  p: Player; enemies: Enemy[] = []; projs: Proj[] = []; parts: Part[] = []; drops: Drop[] = []; sigils: Sigil[] = [];
  keys = new Set<string>(); mode: Mode = 'play';
  cam = { x: 0, y: 0 }; shake = 0; hitstop = 0; fade = 1; flash = 0; time = 0;
  dialog: Dialog | null = null; shopSel = 0; shopMsg = ''; pauseSel = 0; toast = { text: '', t: 0 };
  titleT = 0; deathQuote = ''; boss: Enemy | null = null; bossStarted = false; slash = { t: 0, dir: 0, face: 1 };
  near: { label: string; act: () => void } | null = null; interactCd = 0;
  motes: { x: number; y: number; f: number; s: number; p: number }[] = [];
  raf = 0; last = 0; acc = 0; running = false; ended = false; tip = TIPS[0];
  private kd: (e: KeyboardEvent) => void; private ku: (e: KeyboardEvent) => void; private blur: () => void;
  private vig: CanvasGradient | null = null;

  constructor(cv: HTMLCanvasElement, sfx: Sfx, save: SaveData, private onQuit: () => void, private onEnding: () => void) {
    this.cv = cv; this.cx = cv.getContext('2d')!; this.sfx = sfx; this.sv = save;
    cv.width = W; cv.height = H;
    this.p = {
      x: 300, y: GY - 70, w: 22, h: 70, vx: 0, vy: 0, onGround: false, hitWall: false, surf: 'grass', face: 1, hp: save.maxHp, mana: 0, invuln: 0, stun: 0, coyote: 0,
      jumpBuf: 0, atkBuf: 0, dashBuf: 0, spellBuf: 0, interactBuf: 0, atkT: 0, atkDir: 0, atkHit: new Set(), atkCd: 0, dashT: 0, dashCd: 0, airDash: true, dbl: false, jumping: false,
      walk: 0, focusT: 0, castT: 0, dead: 0, safe: { x: 300, y: GY - 70 }, recoil: 0, stepIdx: 0, t: 0,
    };
    for (let i = 0; i < 60; i++) this.motes.push({ x: Math.random() * 2000, y: Math.random() * H, f: rnd(0.2, 1.2), s: rnd(1, 3), p: Math.random() * 7 });
    this.kd = e => this.keyDown(e); this.ku = e => { this.keys.delete(e.code); };
    this.blur = () => this.keys.clear();
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
    window.addEventListener('blur', this.blur);
    const a = save.area;
    const spawnX = a === save.benchArea && save.benchX ? save.benchX : 300;
    this.loadArea(a, a === 0 && save.geo === 0 && !save.dash ? 300 : spawnX);
    this.p.hp = save.maxHp;
  }

  start() {
    this.running = true; this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.acc += dt;
      while (this.acc >= 1 / 60) { this.update(1 / 60); this.acc -= 1 / 60; }
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false; cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku);
    window.removeEventListener('blur', this.blur);
    this.sfx.stopMusic();
  }
  persist() { try { localStorage.setItem(KEY, JSON.stringify(this.sv)); } catch { /* ignore */ } }
  say(name: string, lines: string[], onClose?: () => void) { this.dialog = { name, lines, i: 0, chars: 0, onClose }; this.mode = 'dialog'; }
  note(text: string) { this.toast = { text, t: 3.2 }; }
  hold(codes: string[]) { return codes.some(c => this.keys.has(c)); }

  // ---------- input ----------
  keyDown(e: KeyboardEvent) {
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault();
    if (e.ctrlKey || e.metaKey) return;
    const rep = e.repeat; this.keys.add(c);
    if (rep) return;
    this.sfx.init();
    const jump = JUMPK.includes(c) || c === 'Enter';
    if (this.mode === 'dialog' && this.dialog) {
      if (jump || ATK.includes(c) || c === 'KeyE' || UP.includes(c)) this.advance();
      return;
    }
    if (this.mode === 'shop') {
      if (UP.includes(c)) { this.shopSel = (this.shopSel + SHOP.length - 1) % SHOP.length; this.sfx.ui(); }
      else if (DOWN.includes(c)) { this.shopSel = (this.shopSel + 1) % SHOP.length; this.sfx.ui(); }
      else if (jump) this.buy();
      else if (c === 'Escape' || ATK.includes(c) || c === 'Backspace') { this.mode = 'play'; this.interactCd = 0.3; }
      return;
    }
    if (this.mode === 'pause') {
      if (c === 'Escape' || c === 'KeyP') { this.mode = 'play'; }
      else if (UP.includes(c)) { this.pauseSel = (this.pauseSel + 2) % 3; this.sfx.ui(); }
      else if (DOWN.includes(c)) { this.pauseSel = (this.pauseSel + 1) % 3; this.sfx.ui(); }
      else if (jump) {
        if (this.pauseSel === 0) this.mode = 'play';
        else if (this.pauseSel === 1) this.sfx.setMuted(!this.sfx.muted);
        else { this.sv.area = this.sv.benchArea; this.persist(); this.onQuit(); }
      }
      return;
    }
    if (c === 'Escape' || c === 'KeyP') { this.mode = 'pause'; this.pauseSel = 0; return; }
    if (c === 'KeyR') {
      this.sv.working = WORKINGS[(WORKINGS.indexOf(this.sv.working) + 1) % WORKINGS.length];
      this.sfx.ui();
      this.note(`${WORKING_LABEL[this.sv.working]} selected - Q to use`);
      this.persist();
      return;
    }
    if (JUMPK.includes(c)) this.p.jumpBuf = 0.14;
    if (ATK.includes(c)) this.p.atkBuf = 0.14;
    if (DASH.includes(c)) this.p.dashBuf = 0.14;
    if (SPELL.includes(c)) this.p.spellBuf = 0.14;
    if (INTER.includes(c)) this.p.interactBuf = 0.12;
  }
  advance() {
    const d = this.dialog; if (!d) return;
    const line = d.lines[d.i];
    if (d.chars < line.length) { d.chars = line.length; return; }
    this.sfx.ui();
    d.i++; d.chars = 0;
    if (d.i >= d.lines.length) { this.dialog = null; this.mode = 'play'; this.interactCd = 0.3; d.onClose?.(); }
  }
  buy() {
    const it = SHOP[this.shopSel], sv = this.sv;
    if (it.once && sv.bought.includes(it.id)) { this.shopMsg = 'Gary: You already own that. Greedy!'; return; }
    if (sv.geo < it.cost) { this.shopMsg = 'Gary: You are short on shards. The chicken is judging you.'; return; }
    sv.geo -= it.cost; if (it.once) sv.bought.push(it.id);
    if (it.id === 'nail') sv.dmg += 1;
    if (it.id === 'mask') { sv.maxHp += 1; this.p.hp += 1; }
    if (it.id === 'siphon') sv.siphon = true;
    if (it.id === 'quick') sv.quick = true;
    if (it.id === 'ritual') this.p.mana = Math.min(99, this.p.mana + 44);
    this.shopMsg = SHOP_JOKES[Math.floor(Math.random() * SHOP_JOKES.length)];
    this.sfx.pickup(); this.persist();
  }

  // ---------- area ----------
  loadArea(id: number, x: number) {
    const a = AREAS[id]; this.area = a; this.sv.area = id;
    this.solids = [...a.solids]; this.gates = [];
    if (a.boss && !this.sv.bosses[id]) {
      const gate: Solid = { x: a.width - 24, y: 0, w: 40, h: WH + 300, surf: 'stone' };
      this.solids.push(gate); this.gates.push(gate);
    }
    this.boss = null; this.bossStarted = false;
    this.projs = []; this.drops = []; this.parts = []; this.sigils = [];
    this.spawnEnemies();
    const p = this.p;
    p.x = x; p.y = GY - p.h - 2; p.vx = 0; p.vy = 0; p.safe = { x, y: p.y };
    p.face = x > a.width / 2 ? -1 : 1;
    this.cam.x = clamp(x - W / 2, 0, a.width - W); this.cam.y = WH - H;
    this.fade = 1; this.titleT = 3.4; this.tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.sfx.setMusic(a.music, false);
    if (!this.sv.chapters.includes(id)) {
      this.sv.chapters.push(id);
      this.say(id === 0 ? 'Mayor Stick' : 'THE STAFF REMEMBERS', a.story);
    }
    this.persist();
  }
  spawnEnemies() {
    this.enemies = this.area.enemies.map(s => this.mk(s.kind, s.x, s.y));
  }
  mk(kind: EKind, x: number, y: number): Enemy {
    const s = STATS[kind];
    return { kind, x: x - s.w / 2, y, w: s.w, h: s.h, vx: 0, vy: 0, onGround: false, hitWall: false, surf: 'stone', face: Math.random() < 0.5 ? 1 : -1, t: Math.random() * 5, flash: 0, state: 0, timer: rnd(0.5, 1.5), alpha: 1,
      hp: s.hp, maxHp: s.hp, dead: false, stun: 0, dmg: s.dmg, boss: kind === 'gary' || kind === 'ancientBoss' || kind === 'creator', homeX: x, homeY: y, hops: 0, sub: 0, shots: 0 };
  }
  changeArea(id: number, x: number) { this.loadArea(id, x); }

  // ---------- fx ----------
  burst(x: number, y: number, n: number, col: string, spd = 220, size = 3, g = 600, glow = false) {
    for (let i = 0; i < n && this.parts.length < 700; i++) {
      const a = Math.random() * 7, s = rnd(0.2, 1) * spd;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.2, life: rnd(0.3, 0.8), max: 0.8, size: rnd(size * 0.5, size * 1.4), col, g, glow });
    }
  }
  dust(x: number, y: number, n = 6) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + rnd(-8, 8), y, vx: rnd(-50, 50), vy: rnd(-40, -5), life: rnd(0.25, 0.5), max: 0.5, size: rnd(2, 4), col: this.area.palette.edge, g: 40, glow: false });
  }

  // ---------- update ----------
  update(dt: number) {
    this.time += dt;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 1.8);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.2);
    if (this.toast.t > 0) this.toast.t -= dt;
    if (this.titleT > 0) this.titleT -= dt;
    if (this.mode === 'dialog' && this.dialog) {
      const l = this.dialog.lines[this.dialog.i];
      const before = Math.floor(this.dialog.chars);
      this.dialog.chars = Math.min(l.length, this.dialog.chars + 60 * dt);
      if (Math.floor(this.dialog.chars) !== before && Math.floor(this.dialog.chars) % 2 === 0) this.sfx.blip(this.dialog.name.startsWith('Creator') ? 0.5 : 1);
    }
    this.updateParticles(dt);
    if (this.mode !== 'play') return;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.shake = Math.max(0, this.shake - dt * 1.6);
    if (this.interactCd > 0) this.interactCd -= dt;
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjs(dt);
    this.updateDrops(dt);
    this.updateWorldLogic(dt);
    // camera
    const p = this.p, a = this.area;
    const tx = clamp(p.x + p.w / 2 - W / 2 + p.face * 70 + (p.dashT > 0 ? p.face * 60 : 0), 0, a.width - W);
    const ty = clamp(p.y + p.h / 2 - 330, 0, WH - H);
    const k = 1 - Math.exp(-6 * dt);
    this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * (1 - Math.exp(-4 * dt));
  }

  updateParticles(dt: number) {
    for (const q of this.parts) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    this.parts = this.parts.filter(q => q.life > 0);
    for (const s of this.sigils) s.life -= dt;
    this.sigils = this.sigils.filter(s => s.life > 0);
    if (this.slash.t > 0) this.slash.t -= dt;
  }

  isSolidAt(x: number, y: number) {
    for (const s of this.solids) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
    return false;
  }

  updatePlayer(dt: number) {
    const p = this.p, sv = this.sv;
    p.t += dt;
    if (p.dead > 0) {
      p.dead += dt; p.vy = Math.min(MAXFALL, p.vy + G * dt); p.vx *= 0.9;
      moveX(p, this.solids, p.vx * dt); moveY(p, this.solids, p.vy * dt);
      if (p.dead > 2.8) this.respawn();
      return;
    }
    p.jumpBuf -= dt; p.atkBuf -= dt; p.dashBuf -= dt; p.spellBuf -= dt; p.interactBuf -= dt;
    p.invuln = Math.max(0, p.invuln - dt); p.stun = Math.max(0, p.stun - dt); p.atkCd -= dt; p.dashCd -= dt; p.castT = Math.max(0, p.castT - dt); p.recoil -= dt;
    if (p.onGround) { p.coyote = 0.1; p.dbl = false; p.airDash = true; } else p.coyote -= dt;

    const dir = (this.hold(RIGHT) ? 1 : 0) - (this.hold(LEFT) ? 1 : 0);
    const up = this.hold(UP), down = this.hold(DOWN);
    const free = p.stun <= 0 && p.castT <= 0;

    // focus heal
    const wantFocus = free && this.hold(FOCUS) && p.onGround && p.mana >= 33 && p.hp < sv.maxHp && p.dashT <= 0 && p.atkT <= 0;
    if (wantFocus) {
      if (p.focusT === 0) this.sfx.focus();
      p.focusT += dt; p.vx = 0;
      if (Math.random() < 0.6) { const a = Math.random() * 7; this.parts.push({ x: p.x + 11 + Math.cos(a) * 40, y: p.y + 35 + Math.sin(a) * 40, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, life: 0.6, max: 0.6, size: 3, col: '#fff2a8', g: 0, glow: true }); }
      if (p.focusT >= 1) { p.focusT = 0; p.mana -= 33; p.hp = Math.min(sv.maxHp, p.hp + 1); this.sfx.heal(); this.burst(p.x + 11, p.y + 35, 24, '#fff2a8', 260, 3, 0, true); this.flash = 0.25; }
    } else p.focusT = 0;

    // movement
    if (p.dashT > 0) {
      p.dashT -= dt; p.vx = p.face * DASHV; p.vy = 30;
      if (Math.random() < 0.8) this.parts.push({ x: p.x + 11, y: p.y + rnd(10, 60), vx: -p.face * 30, vy: 0, life: 0.3, max: 0.3, size: 5, col: 'rgba(255,230,90,0.7)', g: 0, glow: true });
    } else {
      if (p.recoil > 0) p.vx = -p.face * 230;
      else if (free && !wantFocus) {
        const target = dir * SPEED, acc = (p.onGround ? 3600 : 2600) * dt;
        p.vx += clamp(target - p.vx, -acc, acc);
        if (dir) p.face = dir;
      } else if (p.stun > 0) p.vx *= 0.93; else p.vx *= 0.8;
      p.vy = Math.min(MAXFALL, p.vy + G * dt);
    }

    // jump
    if (p.jumpBuf > 0 && free && p.dashT <= 0 && !wantFocus) {
      if (p.coyote > 0) { p.vy = -JUMP; p.coyote = 0; p.jumpBuf = 0; p.jumping = true; this.sfx.jump(); this.dust(p.x + 11, p.y + p.h, 5); }
      else if (sv.djump && !p.dbl) { p.vy = -DJUMP; p.dbl = true; p.jumpBuf = 0; p.jumping = true; this.sfx.djump(); this.burst(p.x + 11, p.y + p.h, 14, '#fff6b0', 200, 3, 100, true); }
    }
    if (p.jumping && !this.hold(JUMPK) && p.vy < 0) { p.vy *= 0.42; p.jumping = false; }
    if (p.vy >= 0) p.jumping = false;

    // dash
    if (p.dashBuf > 0 && sv.dash && p.dashCd <= 0 && free && p.dashT <= 0 && (p.onGround || p.airDash)) {
      p.dashT = 0.2; p.dashCd = 0.5; p.dashBuf = 0; if (!p.onGround) p.airDash = false; p.invuln = Math.max(p.invuln, 0.25); this.sfx.dash(); p.atkT = 0;
    }

    // attack
    if (p.atkBuf > 0 && p.atkCd <= 0 && free && p.dashT <= 0 && !wantFocus) {
      p.atkBuf = 0; p.atkT = 0.22; p.atkCd = sv.quick ? 0.27 : 0.37; p.atkHit.clear();
      p.atkDir = up ? 1 : (down && !p.onGround ? 2 : 0);
      this.sfx.slash(); this.slash = { t: 0.16, dir: p.atkDir, face: p.face };
    }
    if (p.atkT > 0) { p.atkT -= dt; this.doAttack(); }

    if (p.spellBuf > 0 && free && p.dashT <= 0 && !wantFocus) this.castWorking();

    // physics
    const wasGround = p.onGround, vyBefore = p.vy;
    moveX(p, this.solids, p.vx * dt);
    if (p.hitWall && p.dashT > 0) p.dashT = 0;
    moveY(p, this.solids, p.vy * dt);
    if (!wasGround && p.onGround) { this.sfx.land(p.surf, vyBefore > 650); this.dust(p.x + 11, p.y + p.h, vyBefore > 650 ? 10 : 4); if (vyBefore > 900) this.shake = Math.max(this.shake, 0.1); }

    // footsteps
    const moving = p.onGround && Math.abs(p.vx) > 40 && p.stun <= 0 && p.dashT <= 0;
    if (moving) {
      p.walk += dt * Math.abs(p.vx) * 0.036;
      const idx = Math.floor(p.walk / Math.PI);
      if (idx !== p.stepIdx) { p.stepIdx = idx; this.sfx.step(p.surf); if (Math.random() < 0.4) this.dust(p.x + 11, p.y + p.h, 1); }
    } else if (p.onGround) p.stepIdx = Math.floor(p.walk / Math.PI);

    // safe spot tracking
    if (p.onGround && p.stun <= 0 && this.isSolidAt(p.x - 36, p.y + p.h + 6) && this.isSolidAt(p.x + p.w + 36, p.y + p.h + 6) && !this.area.hazards.some(h => ov(h, { x: p.x - 60, y: p.y, w: p.w + 120, h: p.h }))) {
      p.safe = { x: p.x, y: p.y };
    }
    // hazards & pits
    if (p.invuln <= 0 || p.y > WH + 60) {
      for (const h of this.area.hazards) {
        if (ov({ x: p.x + 4, y: p.y + 6, w: p.w - 8, h: p.h - 6 }, h)) { this.hurt(1, p.x + 11 - p.face); this.toSafe(); break; }
      }
    }
    if (p.y > WH + 60) { this.hurt(1, p.x); this.toSafe(); }

    // contact damage
    for (const e of this.enemies) {
      if (e.dead || e.alpha < 0.5) continue;
      if (ov({ x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 6 }, { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 6 })) this.hurt(e.dmg, e.x + e.w / 2);
    }

    // interact detect
    this.near = null;
    if (p.onGround && p.dashT <= 0) {
      const cx = p.x + 11, a = this.area;
      for (const n of a.npcs) if (Math.abs(cx - n.x) < 70) this.near = { label: 'Talk', act: () => this.say(n.name, n.lines, n.shop ? () => { this.mode = 'shop'; this.shopMsg = 'Gary: Browse! Buy! Or just stand there awkwardly. Both fine.'; } : undefined) };
      for (const t of a.tablets) if (Math.abs(cx - t.x) < 50) this.near = { label: 'Read', act: () => { if (!sv.lore.includes(t.id)) sv.lore.push(t.id); this.say(t.title, t.lines); } };
      for (const b of a.benches) if (Math.abs(cx - b) < 60) this.near = { label: 'Rest', act: () => this.rest(b) };
    }
    if (p.interactBuf > 0 && this.near && this.interactCd <= 0) { p.interactBuf = 0; this.near.act(); }

    // pickups
    for (const pk of this.area.pickups) {
      if (sv.got.includes(pk.id)) continue;
      if (Math.abs(p.x + 11 - pk.x) < 34 && Math.abs(p.y + 35 - pk.y) < 70) this.collect(pk.id, pk.type);
    }
  }

  toSafe() {
    const p = this.p;
    p.x = p.safe.x; p.y = p.safe.y; p.vx = 0; p.vy = 0; p.dashT = 0; p.invuln = 1.4; this.fade = 0.8;
  }

  castWorking() {
    const p = this.p, working = this.sv.working;
    p.spellBuf = 0;
    if (working === 'sacrifice') {
      if (p.hp <= 1) { this.note('Sacrifice needs one spare Will Thread. Not your last one.'); this.sfx.ui(); return; }
      p.hp -= 1;
      p.mana = Math.min(99, p.mana + 20);
    } else {
      const cost = working === 'ritual' ? 44 : 33;
      if (p.mana < cost) { this.note(`${WORKING_LABEL[working]} needs ${cost} mana`); this.sfx.ui(); return; }
      if (working === 'ritual' && !p.onGround) { this.note('Draw the Ritual Circle on solid ground'); this.sfx.ui(); return; }
      p.mana -= cost;
    }

    p.castT = working === 'spell' ? 0.3 : 0.38;
    p.vx = 0;
    const x = p.x + p.w / 2, y = p.y + p.h;
    if (working === 'spell') {
      this.projs.push({ x: x + p.face * 24, y: p.y + 30, vx: p.face * 760, vy: 0, r: 14, dmg: 2 + this.sv.dmg, life: 0.9, friendly: true, kind: 'bolt', col: '#9fd4ff' });
      this.sfx.spell(); this.shake = 0.15; this.burst(x + p.face * 24, p.y + 30, 10, '#9fd4ff', 200, 3, 0, true);
      return;
    }

    const radius = working === 'ritual' ? 145 : 210;
    const centerY = y - 40;
    this.sigils.push({ x, y, kind: working, life: 0.65, max: 0.65, radius });
    for (const e of [...this.enemies]) {
      if (e.dead || e.alpha < 0.5) continue;
      const distance = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - centerY);
      if (distance < radius + Math.min(e.w, e.h) / 3) {
        this.damageEnemy(e, working === 'ritual' ? 1 + this.sv.dmg : 5 + this.sv.dmg, Math.sign(e.x + e.w / 2 - x) || p.face);
      }
    }
    if (working === 'ritual') {
      this.projs = this.projs.filter(q => q.friendly || Math.hypot(q.x - x, q.y - centerY) > radius);
      this.sfx.ritual(); this.shake = Math.max(this.shake, 0.25);
      this.burst(x, y - 8, 24, '#a6ddff', 240, 4, -100, true);
    } else {
      this.sfx.sacrifice(); this.shake = Math.max(this.shake, 0.55);
      this.burst(x, p.y + 28, 36, '#ff656b', 400, 4, 150, true);
      this.note('One thread of will was offered. The staff answered.');
    }
  }

  collect(id: string, type: 'dash' | 'djump' | 'thread') {
    const sv = this.sv; sv.got.push(id); this.sfx.pickup(); this.flash = 0.6;
    if (type === 'dash') { sv.dash = true; this.say('ABSORBER\'S SPRINT', ['You touched a glowing scrap of an Absorber\'s lingering power!', 'Press SHIFT or C to DASH. You can dash once per jump. It whispered "wheee".']); }
    if (type === 'djump') { sv.djump = true; this.say('CREATOR\'S SPARK', ['You found a spark from the Creators\' own mana stash. Do not tell them.', 'You can now DOUBLE JUMP. Press jump again in mid-air.']); }
    if (type === 'thread') { sv.maxHp += 1; this.p.hp = sv.maxHp; this.say('WILL THREAD', ['A loose strand of will binds itself to your mana. Max will +1.', 'It smells faintly of Entity. (That is a compliment.)']); }
    this.persist();
  }

  rest(bx: number) {
    const p = this.p, sv = this.sv;
    sv.benchArea = this.area.id; sv.benchX = bx; p.hp = sv.maxHp; p.mana = Math.max(p.mana, 66);
    this.sfx.rest(); this.flash = 0.7; this.burst(bx, GY - 20, 30, '#ffe9a0', 200, 3, -80, true);
    this.spawnEnemies(); this.persist();
    const jokes = ['Rested. Game saved. You sat in a ritual circle. Nothing was sacrificed. This time.', 'Rested. The circle hums. Dave would be proud.', 'Rested. Saved. The circle asks for no volunteers today.'];
    this.note(jokes[Math.floor(Math.random() * jokes.length)]);
  }

  doAttack() {
    const p = this.p;
    let r: Rect;
    if (p.atkDir === 1) r = { x: p.x - 26, y: p.y - 56, w: 74, h: 74 };
    else if (p.atkDir === 2) r = { x: p.x - 26, y: p.y + p.h - 14, w: 74, h: 66 };
    else r = { x: p.face > 0 ? p.x + p.w - 4 : p.x - 76, y: p.y + 6, w: 80, h: 56 };
    let hit = false;
    for (const e of this.enemies) {
      if (e.dead || p.atkHit.has(e) || !ov(r, e)) continue;
      p.atkHit.add(e); hit = true;
      this.damageEnemy(e, this.sv.dmg, p.atkDir === 0 ? p.face : 0);
      p.mana = Math.min(99, p.mana + (this.sv.siphon ? 16 : 11));
    }
    if (p.atkDir === 2 && (hit || this.area.hazards.some(h => ov(r, h)))) {
      if (!p.atkHit.has(p as unknown as Enemy)) { p.atkHit.add(p as unknown as Enemy); p.vy = -560; p.dbl = false; p.airDash = true; p.jumping = false; this.burst(p.x + 11, p.y + p.h, 8, '#fff', 200, 3, 300, true); }
    } else if (hit && p.atkDir === 0 && p.recoil <= 0) p.recoil = 0.09;
  }

  hurt(dmg: number, srcX: number) {
    const p = this.p;
    if (p.invuln > 0 || p.dead > 0) return;
    p.hp -= dmg; p.invuln = 1.4; p.stun = 0.25; p.focusT = 0; p.atkT = 0; p.dashT = 0;
    p.vx = (p.x + 11 < srcX ? -1 : 1) * 340; p.vy = -330;
    this.hitstop = 0.11; this.shake = 0.45; this.sfx.hurt(); this.flash = 0.2;
    this.burst(p.x + 11, p.y + 35, 16, '#fff6a0', 300, 3, 500, true);
    if (p.hp <= 0) {
      p.hp = 0; p.dead = 0.001; this.sv.deaths++; this.sfx.death(); this.sfx.stopMusic();
      this.deathQuote = DEATH_QUOTES[Math.floor(Math.random() * DEATH_QUOTES.length)];
      this.burst(p.x + 11, p.y + 35, 40, '#fff6a0', 400, 4, 300, true);
    }
  }

  respawn() {
    const sv = this.sv, p = this.p;
    p.dead = 0; p.hp = sv.maxHp; p.invuln = 1; p.stun = 0; p.mana = 0;
    this.loadArea(sv.benchArea, sv.benchX);
    p.hp = sv.maxHp;
  }

  damageEnemy(e: Enemy, dmg: number, dirX: number) {
    e.hp -= dmg; e.flash = 0.1; this.hitstop = 0.06; this.sfx.hit(); this.shake = Math.max(this.shake, 0.15);
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 10, '#dcd6ff', 240, 3, 400, true);
    if (!e.boss) { e.stun = 0.18; e.vx = dirX * 240; if (e.kind === 'floater') e.vy = -60; e.state = 0; }
    if (e.hp <= 0) this.kill(e);
  }

  kill(e: Enemy) {
    e.dead = true; this.sfx.kill();
    this.burst(e.x + e.w / 2, e.y + e.h / 2, e.boss ? 80 : 22, '#cfcbe3', e.boss ? 500 : 300, 4, 500, true);
    this.shake = e.boss ? 1 : 0.3;
    const n = STATS[e.kind].shards;
    for (let i = 0; i < Math.min(n, 30); i++) this.drops.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: rnd(-200, 200), vy: rnd(-450, -150), val: n > 30 ? Math.ceil(n / 30) : 1, life: 14 });
    if (e.boss) this.bossDefeated(e);
  }

  bossDefeated(e: Enemy) {
    const a = this.area; this.sv.bosses[a.id] = true; this.boss = null;
    this.projs = this.projs.filter(q => q.friendly);
    this.enemies.forEach(o => { if (!o.boss && !o.dead && o.homeY < 0) o.dead = true; });
    this.solids = this.solids.filter(s => !this.gates.includes(s)); this.gates = [];
    this.flash = 1; this.hitstop = 0.4; this.persist();
    this.sfx.setMusic(a.music, false);
    const last = a.id === AREAS.length - 1;
    window.setTimeout(() => this.say(a.boss!.name, a.boss!.outro, () => {
      if (last) { this.ended = true; this.fade = 0; this.onEnding(); } else this.note('The way forward is open.');
    }), 900);
    void e;
  }

  updateWorldLogic(dt: number) {
    const a = this.area, p = this.p, sv = this.sv;
    // boss trigger
    if (a.boss && !sv.bosses[a.id] && !this.bossStarted && p.x > a.boss.trigger && p.onGround) {
      this.bossStarted = true;
      const wall: Solid = { x: a.boss.arenaL, y: 0, w: 30, h: WH + 300, surf: 'stone' };
      this.solids.push(wall); this.gates.push(wall); p.vx = 0;
      this.say(a.boss.name, a.boss.intro, () => {
        const b = this.mk(a.boss!.kind, a.boss!.spawnX, GY - STATS[a.boss!.kind].h - 200);
        b.homeY = -1; this.enemies.push(b); this.boss = b; this.sfx.roar(); this.shake = 0.8; this.sfx.setMusic(a.music, true);
      });
    }
    // area transitions
    const cx = p.x + p.w / 2;
    if (p.dead <= 0) {
      if (cx > a.width && a.id < AREAS.length - 1) this.changeArea(a.id + 1, 80);
      else if (cx < 0 && a.id > 0) this.changeArea(a.id - 1, AREAS[a.id - 1].width - 100);
      else { if (p.x < 0) { p.x = 0; } if (p.x + p.w > a.width + 10 && a.id === AREAS.length - 1) p.x = a.width + 10 - p.w; }
    }
    void dt;
  }

  // ---------- enemies ----------
  updateEnemies(dt: number) {
    const p = this.p;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!e.boss && Math.abs(e.x - px) > 900) continue;
      e.t += dt; e.flash = Math.max(0, e.flash - dt);
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = px - ex, dy = py - ey, dist = Math.hypot(dx, dy);
      const stunned = e.stun > 0; if (stunned) e.stun -= dt;
      let grav = true;
      switch (e.kind) {
        case 'crawler': case 'ancient': {
          const chase = e.kind === 'ancient' ? 440 : 280;
          if (!stunned) {
            if (dist < chase && Math.abs(dy) < 90) { e.face = dx > 0 ? 1 : -1; e.vx = e.face * (e.kind === 'ancient' ? 95 : 105); }
            else e.vx = e.face * 55;
            if (e.hitWall || (e.onGround && !this.isSolidAt(ex + e.face * (e.w / 2 + 8), e.y + e.h + 8))) { e.face = -e.face; e.vx = e.face * 55; }
          } else e.vx *= 0.9;
          if (e.kind === 'ancient') { e.state = dist < 90 ? 1 : 0; e.timer += dt; }
          break;
        }
        case 'hopper': {
          if (e.onGround) {
            e.vx *= 0.8; e.timer -= dt;
            if (!stunned && e.timer <= 0 && dist < 520) { e.face = dx > 0 ? 1 : -1; e.vy = -680; e.vx = e.face * 230; e.timer = rnd(1, 1.8); }
          }
          break;
        }
        case 'floater': {
          grav = false;
          if (stunned) { e.vx *= 0.9; e.vy *= 0.9; }
          else if (dist < 400) { const s = 105; e.vx += (dx / dist * s - e.vx) * 2 * dt; e.vy += (dy / dist * s - e.vy) * 2 * dt; e.face = dx > 0 ? 1 : -1; }
          else { e.vx *= 0.95; e.vy += (Math.sin(e.t * 2) * 25 - e.vy) * 2 * dt; }
          e.x += e.vx * dt; e.y += e.vy * dt;
          break;
        }
        case 'spitter': {
          e.vx = 0; e.face = dx > 0 ? 1 : -1;
          if (!stunned) {
            e.timer -= dt;
            if (e.state === 0 && e.timer <= 0 && dist < 560) { e.state = 1; e.timer = 0.55; }
            else if (e.state === 1 && e.timer <= 0) {
              e.state = 0; e.timer = 2.2; const s = 250; const d = Math.hypot(px - ex, py - (e.y + 14)) || 1;
              this.projs.push({ x: ex + e.face * 16, y: e.y + 14, vx: (px - ex) / d * s, vy: (py - e.y - 14) / d * s, r: 9, dmg: 1, life: 3.5, friendly: false, kind: 'orb', col: '#7878ff' });
              this.sfx.orb();
            }
          }
          break;
        }
        case 'gary': this.aiGary(e, dx, dt); break;
        case 'ancientBoss': this.aiAncient(e, dx, dt); break;
        case 'creator': grav = false; this.aiCreator(e, px, py, dt); break;
      }
      if (grav) {
        e.vy = Math.min(MAXFALL, e.vy + G * dt);
        moveX(e, this.solids, e.vx * dt); moveY(e, this.solids, e.vy * dt);
        if (e.y > WH + 200) e.dead = true;
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  shockwaves(e: Enemy, speed: number) {
    const ex = e.x + e.w / 2;
    for (const d of [-1, 1]) this.projs.push({ x: ex + d * 40, y: GY - 14, vx: d * speed, vy: 0, r: 17, dmg: 1, life: 1.8, friendly: false, kind: 'shock', col: '#c8c0ff' });
    this.sfx.shock(); this.shake = 0.7; this.dust(ex, e.y + e.h, 14);
  }

  aiGary(e: Enemy, dx: number, dt: number) {
    const ph2 = e.hp < e.maxHp / 2;
    if (e.state === 0) {
      e.vx = 0; e.face = dx > 0 ? 1 : -1; e.timer -= dt;
      if (e.timer <= 0) { if (Math.random() < 0.55) { e.state = 1; e.timer = 0.45; } else { e.state = 3; e.timer = 0.6; } }
    } else if (e.state === 1) {
      e.vx = 0; e.timer -= dt;
      if (e.timer <= 0) { e.vy = -1000; e.vx = clamp(dx, -520, 520) * 0.95; e.state = 2; e.timer = 0.2; e.face = dx > 0 ? 1 : -1; this.sfx.jump(); }
    } else if (e.state === 2) {
      e.timer -= dt;
      if (e.onGround && e.timer <= 0) {
        this.shockwaves(e, ph2 ? 380 : 300); e.hops++; e.vx = 0;
        if (ph2 && e.hops % 2 === 1) { e.state = 1; e.timer = 0.25; } else { e.state = 0; e.timer = ph2 ? 0.55 : 0.95; }
      }
    } else if (e.state === 3) {
      e.vx = 0; e.timer -= dt;
      if (e.timer <= 0) { e.state = 4; e.timer = 0.95; this.sfx.roar(); }
    } else if (e.state === 4) {
      e.vx = e.face * (ph2 ? 580 : 470); e.timer -= dt;
      if (e.hitWall || e.timer <= 0) { if (e.hitWall) { this.shake = 0.7; this.sfx.shock(); } e.state = 0; e.timer = 0.9; e.vx = 0; }
    }
  }

  aiAncient(e: Enemy, dx: number, dt: number) {
    const ph2 = e.hp < e.maxHp / 2;
    if (e.state === 0) {
      e.vx = 0; e.face = dx > 0 ? 1 : -1; e.timer -= dt;
      if (e.timer <= 0) { const r = Math.random(); if (r < 0.4) { e.state = 1; e.timer = ph2 ? 0.45 : 0.6; } else if (r < 0.75) { e.state = 3; e.timer = 0.5; e.shots = 0; } else { e.state = 5; e.timer = 0.4; } }
    } else if (e.state === 1) {
      e.vx = 0; e.timer -= dt; if (e.timer <= 0) { e.state = 2; e.timer = 0.38; this.sfx.dash(); }
    } else if (e.state === 2) {
      e.vx = e.face * (ph2 ? 860 : 720); e.timer -= dt;
      if (e.timer <= 0 || e.hitWall) { e.state = 0; e.timer = ph2 ? 0.5 : 0.8; e.vx = 0; }
    } else if (e.state === 3) {
      e.vx = 0; e.timer -= dt;
      if (e.timer <= 0) {
        this.projs.push({ x: e.x + e.w / 2 + e.face * 40, y: GY - 34, vx: e.face * (ph2 ? 470 : 390), vy: 0, r: 26, dmg: 1, life: 2.4, friendly: false, kind: 'wave', col: '#ff6a55' });
        this.sfx.slash(); e.shots++;
        if (ph2 && e.shots < 2) e.timer = 0.35; else { e.state = 0; e.timer = ph2 ? 0.6 : 0.9; }
      }
    } else if (e.state === 5) {
      e.vx = 0; e.timer -= dt;
      if (e.timer <= 0) { e.vy = -1050; e.vx = clamp(dx, -480, 480) * 0.9; e.state = 6; e.timer = 0.2; e.face = dx > 0 ? 1 : -1; this.sfx.jump(); }
    } else if (e.state === 6) {
      e.timer -= dt;
      if (e.onGround && e.timer <= 0) { this.shockwaves(e, 340); e.vx = 0; e.state = 0; e.timer = 0.7; }
    }
  }

  aiCreator(e: Enemy, px: number, py: number, dt: number) {
    const ph2 = e.hp < e.maxHp / 2;
    const a = this.area.boss!;
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    const tx = e.homeX, ty = GY - 230 + Math.sin(e.t * 1.6) * 24;
    e.x += (tx - ex) * 1.4 * dt; e.y += (ty - ey) * 3 * dt; e.face = px > ex ? 1 : -1;
    if (e.state === 0) {
      e.timer -= dt;
      if (e.timer <= 0) { const r = Math.floor(Math.random() * 4); e.state = 10 + r; e.timer = r === 3 ? 0.5 : 0.7; e.sub = 0; }
    } else if (e.state === 13) {
      e.timer -= dt; if (e.sub === 0) e.alpha = clamp(e.timer * 2, 0, 1);
      if (e.sub === 0 && e.timer <= 0) { e.homeX = rnd(a.arenaL + 260, this.area.width - 160); e.x = e.homeX - e.w / 2; e.sub = 1; e.timer = 0.5; }
      else if (e.sub === 1 && e.timer <= 0) { e.alpha = 1; e.state = 0; e.timer = ph2 ? 0.7 : 1.1; }
      else if (e.sub === 1) e.alpha = clamp(1 - e.timer * 2, 0, 1);
    } else {
      e.timer -= dt;
      if (e.timer <= 0) {
        if (e.state === 10) {
          const n = ph2 ? 16 : 11, off = Math.random() * 7;
          for (let i = 0; i < n; i++) { const ang = off + i / n * Math.PI * 2; this.projs.push({ x: ex + 30 * e.face, y: ey - 6, vx: Math.cos(ang) * 235, vy: Math.sin(ang) * 235, r: 9, dmg: 1, life: 4, friendly: false, kind: 'orb', col: '#fff3b0' }); }
          this.sfx.orb(); e.sub++;
          if (ph2 && e.sub < 2) e.timer = 0.55; else { e.state = 0; e.timer = ph2 ? 1.0 : 1.5; }
        } else if (e.state === 11) {
          const n = ph2 ? 5 : 3, base = Math.atan2(py - ey, px - ex);
          for (let i = 0; i < n; i++) { const ang = base + (i - (n - 1) / 2) * 0.25; this.projs.push({ x: ex + 30 * e.face, y: ey - 6, vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400, r: 9, dmg: 1, life: 3, friendly: false, kind: 'orb', col: '#ffd0f0' }); }
          this.sfx.orb(); e.sub++;
          if (ph2 && e.sub < 2) e.timer = 0.45; else { e.state = 0; e.timer = ph2 ? 0.9 : 1.3; }
        } else if (e.state === 12) {
          const alive = this.enemies.filter(o => !o.boss && !o.dead).length;
          if (alive < 4) for (const d of [-1, 1]) { const f = this.mk('floater', ex + d * 120, ey); f.homeY = -5; this.enemies.push(f); this.burst(f.x, f.y, 10, '#fff', 200, 3, 0, true); }
          this.sfx.roar(); e.state = 0; e.timer = 1.4;
        } else if (e.state === 13) { /* handled above */ }
        else e.state = 0;
        if (e.state === 13) { e.sub = 0; }
      }
    }
    if (e.state === 13 && e.sub === 0 && e.timer > 0) e.alpha = clamp(e.timer * 2, 0, 1);
    if (e.state === 3) e.state = 0;
    if (e.state === 0 && e.alpha < 1) e.alpha = 1;
  }

  updateProjs(dt: number) {
    const p = this.p;
    for (const q of this.projs) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      if (q.kind === 'bolt' && Math.random() < 0.7) this.parts.push({ x: q.x, y: q.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: 0.25, max: 0.25, size: 5, col: '#9fd4ff', g: 0, glow: true });
      if (q.kind === 'orb' || q.kind === 'bolt') { if (this.solids.some(s => !s.oneWay && q.x > s.x && q.x < s.x + s.w && q.y > s.y && q.y < s.y + s.h)) { q.life = 0; this.burst(q.x, q.y, 6, q.col, 150, 2, 0, true); } }
      if (q.friendly) {
        for (const e of this.enemies) {
          if (e.dead || e.alpha < 0.5) continue;
          if (q.x > e.x - q.r && q.x < e.x + e.w + q.r && q.y > e.y - q.r && q.y < e.y + e.h + q.r) { this.damageEnemy(e, q.dmg, Math.sign(q.vx)); q.life = 0; this.burst(q.x, q.y, 14, '#9fd4ff', 260, 3, 0, true); break; }
        }
      } else if (p.dead <= 0) {
        const nx = clamp(q.x, p.x + 3, p.x + p.w - 3), ny = clamp(q.y, p.y + 4, p.y + p.h);
        if (Math.hypot(q.x - nx, q.y - ny) < q.r) { this.hurt(q.dmg, q.x); if (q.kind === 'orb') q.life = 0; }
      }
    }
    this.projs = this.projs.filter(q => q.life > 0 && q.x > -100 && q.x < this.area.width + 100 && q.y < WH + 200);
  }

  updateDrops(dt: number) {
    const p = this.p;
    for (const d of this.drops) {
      d.life -= dt; d.vy += 1600 * dt;
      const b: Body = { x: d.x - 4, y: d.y - 4, w: 8, h: 8, vx: d.vx, vy: d.vy, onGround: false, hitWall: false, surf: 'stone' };
      moveX(b, this.solids, d.vx * dt); moveY(b, this.solids, d.vy * dt);
      if (b.hitWall) d.vx *= -0.5;
      if (b.onGround) { d.vy = -Math.abs(d.vy) * 0.3; d.vx *= 0.8; if (Math.abs(d.vy) < 40) d.vy = 0; } else d.vy = b.vy;
      d.x = b.x + 4; d.y = b.y + 4;
      if (p.dead <= 0 && Math.abs(d.x - (p.x + 11)) < 34 && Math.abs(d.y - (p.y + 35)) < 50 && d.life < 13.6) { this.sv.geo += d.val; d.life = 0; this.sfx.shard(); }
    }
    this.drops = this.drops.filter(d => d.life > 0);
  }

  // ================= RENDER =================
  render() {
    const c = this.cx, a = this.area, pal = a.palette;
    const sx = this.shake > 0 ? rnd(-1, 1) * this.shake * 9 : 0, sy = this.shake > 0 ? rnd(-1, 1) * this.shake * 9 : 0;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal.sky1); g.addColorStop(1, pal.sky2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    this.drawBg(c, a);
    c.save(); c.translate(-Math.round(this.cam.x) + sx, -Math.round(this.cam.y) + sy);
    this.drawWorld(c, a);
    c.restore();
    this.drawFog(c, pal);
    this.drawHud(c);
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash)})`; c.fillRect(0, 0, W, H); }
    if (this.fade > 0) { c.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade)})`; c.fillRect(0, 0, W, H); }
    this.drawOverlays(c);
  }

  drawBg(c: CanvasRenderingContext2D, a: AreaDef) {
    const pal = a.palette, cam = this.cam;
    // glow orb (moon / ceiling light)
    c.save(); c.globalCompositeOperation = 'lighter';
    const mg = c.createRadialGradient(W * 0.72, 90, 0, W * 0.72, 90, 280);
    mg.addColorStop(0, pal.accent + '55'); mg.addColorStop(1, 'transparent');
    c.fillStyle = mg; c.fillRect(0, 0, W, H); c.restore();
    const layers = [{ f: 0.15, col: pal.far, sc: 1.4, seed: 1 }, { f: 0.32, col: pal.mid, sc: 1.0, seed: 2 }, { f: 0.55, col: pal.near, sc: 0.8, seed: 3 }];
    for (const L of layers) {
      const off = cam.x * L.f, base = GY - cam.y * (0.3 + L.f * 0.5) + 30 + (1 - L.f) * 40;
      c.fillStyle = L.col;
      if (a.theme === 'cave') {
        // stalactites & stalagmites
        const step = 90 * L.sc;
        for (let i = Math.floor(off / step) - 1; i < (off + W) / step + 2; i++) {
          const h = hash(i + L.seed * 31) * 200 + 60, x = i * step - off, w = step * 0.7;
          const top = -cam.y * L.f * 0.4;
          c.beginPath(); c.moveTo(x, top - 10); c.lineTo(x + w, top - 10); c.lineTo(x + w / 2, top + h * L.sc); c.closePath(); c.fill();
          const h2 = hash(i * 3 + L.seed * 17) * 160 + 40;
          c.beginPath(); c.moveTo(x + step * 0.2, base + 80); c.lineTo(x + step * 0.2 + w, base + 80); c.lineTo(x + step * 0.2 + w / 2, base - h2 * L.sc); c.closePath(); c.fill();
        }
      } else if (a.theme === 'ruins' || a.theme === 'spire') {
        const step = 190 * L.sc;
        for (let i = Math.floor(off / step) - 1; i < (off + W) / step + 2; i++) {
          const hh = hash(i + L.seed * 13), x = i * step - off, w = 34 * L.sc + hh * 30, h = (120 + hash(i * 5 + L.seed) * 260) * L.sc * (a.theme === 'spire' ? 1.6 : 1);
          c.beginPath(); c.moveTo(x, base + 60); c.lineTo(x, base - h); if (a.theme === 'ruins' && hh > 0.5) { c.lineTo(x + w * 0.4, base - h + 14); c.lineTo(x + w * 0.7, base - h - 8); } else if (a.theme === 'spire') { c.lineTo(x + w / 2, base - h - 70 * L.sc); }
          c.lineTo(x + w, base - h + (a.theme === 'ruins' ? 10 : 0)); c.lineTo(x + w, base + 60); c.closePath(); c.fill();
          if (L.f > 0.3) { c.fillRect(x - 6, base - h, w + 12, 8); }
          if (a.theme === 'spire' && L.f < 0.4) { c.fillStyle = pal.accent + '33'; for (let k = 0; k < 4; k++) c.fillRect(x + w / 2 - 2, base - h + k * 50, 4, 14); c.fillStyle = L.col; }
        }
      } else {
        // hills
        c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W + 20; x += 20) { const wx = x + off; c.lineTo(x, base - 80 * L.sc - Math.sin(wx * 0.004 * (1 / L.sc) + L.seed) * 50 - Math.sin(wx * 0.011 + L.seed * 2) * 22); }
        c.lineTo(W, H); c.closePath(); c.fill();
        // The horizon carries the three shapes from the story pages, not trees.
        const step = 320 * L.sc;
        for (let i = Math.floor(off / step) - 1; i < (off + W) / step + 2; i++) {
          if (hash(i * 7 + L.seed) < 0.25) continue;
          const x = i * step - off + hash(i) * 44, y = base - 215 * L.sc - hash(i * 3 + L.seed) * 45;
          const r = (23 + hash(i * 5 + L.seed) * 13) * L.sc;
          c.save(); c.globalAlpha = L.f < 0.3 ? 0.15 : 0.11;
          c.strokeStyle = pal.fog; c.lineWidth = 2 * L.sc;
          if ((i % 3 + 3) % 3 === 0) {
            c.beginPath(); c.arc(x, y, r, 0.25, 5.7); c.stroke();
            c.beginPath(); c.arc(x, y, r * 0.67, 2.4, 7.3); c.stroke();
            for (let j = 0; j < 7; j++) {
              const angle = (j / 7) * Math.PI * 2;
              c.beginPath(); c.moveTo(x + Math.cos(angle) * (r + 5), y + Math.sin(angle) * (r + 5));
              c.lineTo(x + Math.cos(angle) * (r + 12), y + Math.sin(angle) * (r + 12)); c.stroke();
            }
          } else if ((i % 3 + 3) % 3 === 1) {
            for (let j = 0; j < 4; j++) {
              c.beginPath(); c.ellipse(x, y - r * 0.7 + j * r * 0.5, r - j * r * 0.2, r * 0.17, 0, j * 0.5, j * 0.5 + Math.PI * 1.7); c.stroke();
            }
          } else {
            c.beginPath(); c.moveTo(x, y - r); c.lineTo(x, y + r);
            c.moveTo(x - r * 0.65, y - r * 0.3); c.lineTo(x + r * 0.65, y - r * 0.3); c.stroke();
          }
          c.restore();
        }
      }
    }
    // motes
    const inkTime = Math.floor(this.time * 6) / 6;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const mx = ((m.x - cam.x * m.f * 0.8) % W + W) % W, my = ((m.y - inkTime * 8 * m.f - cam.y * 0.2) % H + H) % H;
      c.globalAlpha = 0.35 + Math.sin(inkTime * 2 + m.p) * 0.25; c.fillStyle = pal.mote;
      c.beginPath(); c.arc(mx + Math.sin(inkTime + m.p) * 8, my, m.s, 0, 7); c.fill();
    }
    c.restore();
  }

  drawWorld(c: CanvasRenderingContext2D, a: AreaDef) {
    const cam = this.cam, pal = a.palette, t = Math.floor(this.time * 6) / 6;
    // solids
    for (const s of this.solids) {
      if (s.x + s.w < cam.x - 10 || s.x > cam.x + W + 10) continue;
      if (this.gates.includes(s)) {
        const gg = c.createLinearGradient(s.x, 0, s.x + s.w, 0); gg.addColorStop(0, 'rgba(150,120,255,0)'); gg.addColorStop(0.5, 'rgba(180,150,255,0.55)'); gg.addColorStop(1, 'rgba(150,120,255,0)');
        c.fillStyle = gg; c.fillRect(s.x - 10, cam.y - 20, s.w + 20, H + 40);
        c.strokeStyle = 'rgba(220,200,255,0.5)'; c.lineWidth = 2;
        for (let i = 0; i < 8; i++) { const yy = cam.y + ((i * 90 + t * 60) % (H + 40)); c.beginPath(); c.moveTo(s.x + 6, yy); c.lineTo(s.x + 34, yy - 20); c.stroke(); }
        continue;
      }
      if (s.oneWay) {
        c.fillStyle = '#2b1d14'; c.fillRect(s.x, s.y, s.w, s.h);
        c.fillStyle = s.surf === 'wood' ? '#7a5434' : pal.edge; c.fillRect(s.x, s.y, s.w, 5);
        c.fillStyle = '#1a110b'; for (let x = s.x + 14; x < s.x + s.w - 6; x += 30) c.fillRect(x, s.y + 8, 3, 8);
        continue;
      }
      const x0 = Math.max(s.x, cam.x - 10), x1 = Math.min(s.x + s.w, cam.x + W + 10);
      const gg = c.createLinearGradient(0, s.y, 0, s.y + 200); gg.addColorStop(0, pal.ground); gg.addColorStop(1, '#000');
      c.fillStyle = gg; c.fillRect(x0, s.y, x1 - x0, s.h);
      c.fillStyle = pal.edge; c.fillRect(x0, s.y, x1 - x0, 4);
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x0, s.y + 4, x1 - x0, 3);
      if (s.y === GY) {
        c.strokeStyle = pal.edge; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath();
        for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) {
          const hh = hash(x) * 10 + 4, sw = Math.sin(t * 2 + x * 0.05) * 3;
          if (a.theme === 'grass') { c.moveTo(x, s.y); c.lineTo(x + sw, s.y - hh); }
          else if (hash(x * 1.7) > 0.8) { c.moveTo(x, s.y); c.lineTo(x + 3, s.y - hh * 0.7); c.lineTo(x + 6, s.y); }
        }
        c.stroke();
        if (a.theme !== 'grass') {
          c.fillStyle = pal.edge + '22';
          for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) c.fillRect(x + hash(x) * 30, s.y + 12 + hash(x + 1) * 40, 24, 3);
        }
      }
    }
    // hazards
    for (const h of a.hazards) {
      if (h.x + h.w < cam.x || h.x > cam.x + W) continue;
      c.fillStyle = '#d7d2f0'; c.beginPath();
      for (let x = h.x; x < h.x + h.w; x += 14) { c.moveTo(x, h.y + h.h); c.lineTo(x + 7, h.y); c.lineTo(x + 14, h.y + h.h); }
      c.fill();
    }
    // benches
    for (const b of a.benches) {
      if (b < cam.x - 80 || b > cam.x + W + 80) continue;
      const near = this.near?.label === 'Rest' && Math.abs(this.p.x + 11 - b) < 60;
      c.save(); c.globalCompositeOperation = 'lighter';
      const rg = c.createRadialGradient(b, GY - 6, 0, b, GY - 6, 120); rg.addColorStop(0, `rgba(255,230,150,${near ? 0.35 : 0.18})`); rg.addColorStop(1, 'transparent');
      c.fillStyle = rg; c.fillRect(b - 120, GY - 130, 240, 130);
      c.strokeStyle = `rgba(255,230,150,${0.6 + Math.sin(t * 2) * 0.2})`; c.lineWidth = 2;
      c.beginPath(); c.ellipse(b, GY - 3, 48, 9, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(b, GY - 3, 30, 5.5, 0, 0, 7); c.stroke();
      for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + t * 0.3; c.fillStyle = 'rgba(255,230,150,0.8)'; c.fillRect(b + Math.cos(an) * 39 - 1.5, GY - 3 + Math.sin(an) * 7 - 1.5, 3, 3); }
      c.restore();
      c.strokeStyle = '#d9d2c0'; c.lineWidth = 3; c.beginPath(); c.moveTo(b - 12, GY - 4); c.lineTo(b - 12, GY - 16); c.moveTo(b + 12, GY - 4); c.lineTo(b + 12, GY - 16); c.moveTo(b - 16, GY - 16); c.lineTo(b + 16, GY - 16); c.stroke();
    }
    for (const mark of this.sigils) {
      const phase = Math.floor((1 - mark.life / mark.max) * 5) / 5;
      const spread = mark.radius * Math.min(1, phase * 1.7);
      c.save(); c.globalAlpha = Math.max(0, mark.life / mark.max) * 0.9;
      c.strokeStyle = mark.kind === 'ritual' ? '#a6ddff' : '#ff656b';
      c.lineWidth = mark.kind === 'ritual' ? 3 : 5;
      c.shadowColor = c.strokeStyle; c.shadowBlur = 12;
      c.beginPath(); c.ellipse(mark.x, mark.y - 3, spread, 8 + spread * 0.18, 0, 0, Math.PI * 2); c.stroke();
      if (mark.kind === 'ritual') {
        c.beginPath(); c.ellipse(mark.x, mark.y - 3, spread * 0.65, 5 + spread * 0.1, 0, 0.25, 5.7); c.stroke();
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          const dx = Math.cos(angle) * spread, dy = Math.sin(angle) * spread * 0.2;
          c.beginPath(); c.moveTo(mark.x + dx - 3, mark.y - 3 + dy); c.lineTo(mark.x + dx + 3, mark.y - 3 + dy); c.stroke();
        }
      } else {
        c.beginPath(); c.moveTo(mark.x, mark.y - 115); c.lineTo(mark.x, mark.y - 18);
        c.moveTo(mark.x - 33, mark.y - 85); c.lineTo(mark.x + 33, mark.y - 85); c.stroke();
      }
      c.restore();
    }
    // tablets
    for (const tb of a.tablets) {
      if (tb.x < cam.x - 60 || tb.x > cam.x + W + 60) continue;
      c.fillStyle = '#3a3846'; c.beginPath(); c.roundRect(tb.x - 16, GY - 52, 32, 52, [14, 14, 2, 2]); c.fill();
      c.strokeStyle = pal.accent; c.globalAlpha = 0.7 + Math.sin(t * 2 + tb.x) * 0.2; c.lineWidth = 2;
      c.beginPath(); c.moveTo(tb.x - 7, GY - 38); c.lineTo(tb.x + 7, GY - 38); c.moveTo(tb.x - 7, GY - 28); c.lineTo(tb.x + 4, GY - 28); c.moveTo(tb.x - 7, GY - 18); c.lineTo(tb.x + 7, GY - 18); c.stroke(); c.globalAlpha = 1;
    }
    // The Absorbers are sealed in the staff: this is a memory, not an enemy to kill.
    if (a.id === 3 && this.sv.lore.includes('t3a') && cam.x < 1560 && cam.x + W > 1380) {
      drawAbsorberEcho(c, 1470, GY, t);
    }
    // pickups
    for (const pk of a.pickups) {
      if (this.sv.got.includes(pk.id)) continue;
      const yy = pk.y + Math.sin(t * 2.5) * 6;
      c.save(); c.globalCompositeOperation = 'lighter';
      const pg = c.createRadialGradient(pk.x, yy, 0, pk.x, yy, 60); pg.addColorStop(0, 'rgba(255,240,150,0.9)'); pg.addColorStop(1, 'transparent');
      c.fillStyle = pg; c.fillRect(pk.x - 60, yy - 60, 120, 120); c.restore();
      c.fillStyle = '#fff6c0'; c.beginPath(); c.moveTo(pk.x, yy - 14); c.lineTo(pk.x + 10, yy); c.lineTo(pk.x, yy + 14); c.lineTo(pk.x - 10, yy); c.closePath(); c.fill();
    }
    // npcs
    for (const n of a.npcs) {
      if (n.x < cam.x - 80 || n.x > cam.x + W + 80) continue;
      const face = this.p.x + 11 < n.x ? -1 : 1;
      this.drawNpc(c, n.look, n.x, GY, face, t);
      if (Math.abs(this.p.x + 11 - n.x) < 120) { c.font = `14px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(n.name.split(' (')[0], n.x, GY - 110); }
    }
    // drops
    for (const d of this.drops) {
      if (d.life < 3 && Math.floor(d.life * 10) % 2 === 0) continue;
      c.save(); c.shadowColor = '#fff6b0'; c.shadowBlur = 8; c.fillStyle = '#fff6c8';
      c.beginPath(); c.moveTo(d.x, d.y - 5); c.lineTo(d.x + 4, d.y); c.lineTo(d.x, d.y + 5); c.lineTo(d.x - 4, d.y); c.closePath(); c.fill(); c.restore();
    }
    // enemies
    for (const e of this.enemies) {
      if (e.x + e.w < cam.x - 150 || e.x > cam.x + W + 150) continue;
      drawEntity(c, e, e.x + e.w / 2, e.y + e.h);
    }
    // projectiles
    for (const q of this.projs) {
      c.save(); c.globalCompositeOperation = 'lighter';
      if (q.kind === 'wave') {
        c.strokeStyle = q.col; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
        const d = Math.sign(q.vx); c.arc(Math.round(q.x / 3) * 3 - d * 20, Math.round(q.y / 3) * 3, 34, d > 0 ? -1.2 : Math.PI - 1.2, d > 0 ? 1.2 : Math.PI + 1.2); c.stroke();
      } else if (q.kind === 'shock') {
        const sx = Math.round(q.x / 3) * 3, sy = Math.round(q.y / 3) * 3;
        const sg = c.createRadialGradient(sx, sy, 0, sx, sy, 30); sg.addColorStop(0, 'rgba(210,200,255,0.9)'); sg.addColorStop(1, 'transparent');
        c.fillStyle = sg; c.beginPath(); c.ellipse(sx, sy, 26, 18, 0, 0, 7); c.fill();
      } else if (q.kind === 'bolt') {
        c.translate(Math.round(q.x / 3) * 3, Math.round(q.y / 3) * 3);
        c.strokeStyle = '#bfe6ff'; c.shadowColor = '#8fcaff'; c.shadowBlur = 12; c.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          c.beginPath(); c.ellipse(0, -11 + i * 7, 15 - i * 3, 3, 0, i * 0.6, i * 0.6 + Math.PI * 1.7); c.stroke();
        }
      } else if (q.kind === 'orb') {
        const turn = Math.floor(this.time * 6) % 4;
        c.translate(Math.round(q.x / 3) * 3, Math.round(q.y / 3) * 3);
        c.strokeStyle = q.col; c.shadowColor = q.col; c.shadowBlur = 9; c.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
          c.beginPath(); c.ellipse(0, i * 5 - 5, q.r * (1 - i * 0.2), 3, 0, turn * 0.5 + i * 0.6, turn * 0.5 + i * 0.6 + Math.PI * 1.55); c.stroke();
        }
      } else {
        const og = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * 2.2); og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, q.col); og.addColorStop(1, 'transparent');
        c.fillStyle = og; c.beginPath(); c.arc(q.x, q.y, q.r * 2.2, 0, 7); c.fill();
      }
      c.restore();
    }
    // player
    const p = this.p;
    if (!(p.invuln > 0 && p.dead <= 0 && Math.floor(p.invuln * 18) % 2 === 0 && p.stun <= 0)) {
      drawDude(c, p.x + p.w / 2, p.y + p.h, {
        face: p.face, t: p.t, walk: p.walk, moving: p.onGround && Math.abs(p.vx) > 40 && p.stun <= 0, onGround: p.onGround, vy: p.vy,
        atk: p.atkT > 0 ? 1 - p.atkT / 0.22 : 0, atkDir: p.atkDir, dash: p.dashT > 0, hurt: p.stun > 0, focus: Math.min(1, p.focusT), cast: p.castT, dead: p.dead, speed: Math.abs(p.vx),
      });
    }
    // slash fx
    if (this.slash.t > 0) {
      const k = Math.floor((1 - this.slash.t / 0.16) * 3) / 3, cx = p.x + 11, cy = p.y + 32, f = this.slash.face, dr = this.slash.dir;
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,248,200,${0.9 - k})`; c.lineWidth = 7 - k * 5; c.lineCap = 'round'; c.beginPath();
      if (dr === 0) c.arc(cx - f * 8, cy, 62, f > 0 ? -0.9 : Math.PI - 0.9 + 0, f > 0 ? 0.9 : Math.PI + 0.9);
      else if (dr === 1) c.arc(cx, cy + 6, 58, -2.4, -0.7);
      else c.arc(cx, cy - 6, 62, 0.7, 2.4);
      c.stroke(); c.restore();
    }
    // particles
    for (const q of this.parts) {
      const a2 = Math.ceil(clamp(q.life / q.max, 0, 1) * 4) / 4;
      const qx = Math.round(q.x / 3) * 3, qy = Math.round(q.y / 3) * 3;
      c.globalAlpha = a2; c.fillStyle = q.col;
      if (q.glow) { c.save(); c.globalCompositeOperation = 'lighter'; c.beginPath(); c.arc(qx, qy, q.size, 0, 7); c.fill(); c.restore(); }
      else c.fillRect(qx - q.size / 2, qy - q.size / 2, q.size, q.size);
    }
    c.globalAlpha = 1;
    // foreground grass silhouettes
    if (a.theme === 'grass') {
      c.fillStyle = pal.near; c.beginPath();
      for (let x = Math.floor(cam.x / 70) * 70; x < cam.x + W + 70; x += 70) {
        if (hash(x * 0.37) < 0.5) continue; const hh = 40 + hash(x) * 50;
        for (const sd of [-6, 0, 6]) { c.moveTo(x + sd * 2, GY + 8); c.quadraticCurveTo(x + sd * 3, GY - hh * 0.6, x + sd * 4 + Math.sin(t * 1.5 + x) * 8, GY - hh); c.lineTo(x + sd * 2 + 5, GY + 8); }
      }
      c.fill();
    }
    // interaction prompt
    if (this.near && this.mode === 'play') {
      c.font = `16px ${FONT}`; c.textAlign = 'center';
      const lx = p.x + 11, ly = p.y - 18 + Math.sin(t * 4) * 3;
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.roundRect(lx - 48, ly - 18, 96, 26, 8); c.fill();
      c.fillStyle = '#ffe066'; c.fillText(`↑ ${this.near.label}`, lx, ly);
    }
    // light around player
    c.save(); c.globalCompositeOperation = 'lighter';
    const lg = c.createRadialGradient(p.x + 11, p.y + 34, 0, p.x + 11, p.y + 34, 190); lg.addColorStop(0, 'rgba(255,225,90,0.22)'); lg.addColorStop(1, 'transparent');
    c.fillStyle = lg; c.fillRect(p.x - 180, p.y - 150, 400, 400); c.restore();
  }

  drawNpc(c: CanvasRenderingContext2D, look: string, x: number, y: number, face: number, t: number) {
    const e = (kind: EKind) => ({ kind, w: 30, h: 60, face, t, flash: 0, vy: 0, state: 0, timer: 0, alpha: 1, hp: 1, maxHp: 1 });
    if (look === 'gary') { drawGaryNpc(c, x, y, face, t); return; }
    if (look === 'frank') { drawEntity(c, e('ancient'), x, y); return; }
    c.save(); c.translate(x, y); c.scale(face, 1); c.lineCap = 'round';
    if (look === 'dave') {
      c.fillStyle = '#2a1230'; c.beginPath(); c.moveTo(-4, -60); c.lineTo(-22, 0); c.lineTo(22, 0); c.lineTo(4, -60); c.closePath(); c.fill();
      c.beginPath(); c.arc(0, -64, 14, 0, 7); c.fill();
      c.fillStyle = '#ff5577'; c.fillRect(2, -68, 3, 6); c.fillRect(8, -68, 3, 6);
    } else {
      c.strokeStyle = '#f2f0e8'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -56); c.lineTo(0, -28); c.moveTo(0, -28); c.lineTo(-7, 0); c.moveTo(0, -28); c.lineTo(7, 0); c.moveTo(0, -48); c.lineTo(12 + Math.sin(t * 3) * 3, -38); c.stroke();
      c.fillStyle = '#f2f0e8'; c.beginPath(); c.arc(0, -64, 11, 0, 7); c.fill();
      c.fillStyle = '#222'; c.fillRect(-7, -86, 14, 14); c.fillRect(-11, -73, 22, 3);
      c.fillRect(2, -67, 2, 7); c.fillRect(6, -67, 2, 7);
    }
    c.restore();
  }

  drawFog(c: CanvasRenderingContext2D, pal: AreaDef['palette']) {
    const fg = c.createLinearGradient(0, H * 0.5, 0, H); fg.addColorStop(0, 'transparent'); fg.addColorStop(1, pal.fog + '40');
    c.fillStyle = fg; c.fillRect(0, H * 0.5, W, H * 0.5);
    if (!this.vig) { this.vig = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); this.vig.addColorStop(0, 'transparent'); this.vig.addColorStop(1, 'rgba(0,0,0,0.7)'); }
    c.fillStyle = this.vig; c.fillRect(0, 0, W, H);
  }

  drawHud(c: CanvasRenderingContext2D) {
    const p = this.p, sv = this.sv;
    c.textAlign = 'left'; c.font = `12px ${FONT}`; c.fillStyle = '#e2f1ff'; c.fillText('MANA', 24, 24);
    c.fillStyle = 'rgba(8,14,33,0.85)'; c.fillRect(24, 34, 72, 22);
    c.fillStyle = '#a7d4ff'; c.fillRect(27, 37, 66 * p.mana / 99, 16);
    c.strokeStyle = '#e8f4ff'; c.lineWidth = 2; c.strokeRect(24, 34, 72, 22);
    for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(24 + i * 24, 34); c.lineTo(24 + i * 24, 56); c.stroke(); }
    c.fillStyle = '#ffe8a8'; c.fillText('WILL', 120, 24);
    // Will is drawn as a strand held together at each knot, not as a mask.
    for (let i = 0; i < sv.maxHp; i++) {
      const x = 132 + i * 28, y = 44;
      c.strokeStyle = i < p.hp ? '#ffe066' : '#46505c'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 3, y - 12); c.bezierCurveTo(x + 15, y - 13, x + 12, y + 4, x + 3, y + 8);
      c.bezierCurveTo(x - 11, y + 9, x - 13, y - 1, x - 3, y - 12);
      c.moveTo(x + 2, y + 8); c.lineTo(x - 1, y + 16); c.stroke();
    }
    // shards
    c.save(); c.fillStyle = '#fff6c8'; c.shadowColor = '#fff6c8'; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(133, 70); c.lineTo(140, 77); c.lineTo(133, 84); c.lineTo(126, 77); c.closePath(); c.fill(); c.restore();
    c.font = `17px ${FONT}`; c.fillStyle = '#fff'; c.fillText(String(sv.geo), 149, 83);
    const working = sv.working;
    c.textAlign = 'right'; c.fillStyle = working === 'sacrifice' ? '#ff7d82' : working === 'ritual' ? '#b5e0ff' : '#fff1a8';
    c.font = `21px ${FONT}`; c.fillText(`${WORKING_LABEL[working]}  [Q]`, W - 24, 39);
    c.fillStyle = '#c8cbd5'; c.font = `13px ${FONT}`;
    c.fillText(`R TO SWITCH  /  ${working === 'sacrifice' ? '1 WILL' : working === 'ritual' ? '44 MANA' : '33 MANA'}`, W - 24, 61);
    // boss bar
    if (this.boss && !this.boss.dead && this.area.boss) {
      const b = this.boss, bw = 520, bx = (W - bw) / 2, by = H - 52;
      c.font = `20px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#fff'; c.shadowColor = '#000'; c.shadowBlur = 6; c.fillText(this.area.boss.name, W / 2, by - 12); c.shadowBlur = 0;
      c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(bx - 3, by - 3, bw + 6, 18);
      c.fillStyle = '#c4313f'; c.fillRect(bx, by, bw * clamp(b.hp / b.maxHp, 0, 1), 12);
      c.strokeStyle = '#eee'; c.lineWidth = 2; c.strokeRect(bx - 3, by - 3, bw + 6, 18);
    }
    // area title
    if (this.titleT > 0 && this.mode === 'play') {
      const al = clamp(Math.min(this.titleT, 3.4 - this.titleT) * 1.5, 0, 1);
      c.globalAlpha = al; c.textAlign = 'center'; c.fillStyle = '#fff'; c.shadowColor = this.area.palette.accent; c.shadowBlur = 16;
      c.font = `46px ${FONT}`; c.fillText(this.area.name, W / 2, H * 0.3); c.shadowBlur = 0;
      c.font = `18px ${FONT}`; c.fillStyle = this.area.palette.accent; c.fillText(this.area.sub, W / 2, H * 0.3 + 30); c.globalAlpha = 1;
    }
    if (this.toast.t > 0) {
      c.font = `17px ${FONT}`; c.textAlign = 'center';
      const w = Math.min(W - 80, c.measureText(this.toast.text).width + 40);
      c.globalAlpha = clamp(this.toast.t, 0, 1); c.fillStyle = 'rgba(0,0,0,0.7)'; c.beginPath(); c.roundRect(W / 2 - w / 2, 118, w, 36, 10); c.fill();
      c.fillStyle = '#ffe9a0'; c.fillText(this.toast.text, W / 2, 142, W - 100); c.globalAlpha = 1;
    }
  }

  wrap(c: CanvasRenderingContext2D, text: string, maxW: number) {
    const words = text.split(' '), lines: string[] = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    lines.push(cur); return lines;
  }

  drawOverlays(c: CanvasRenderingContext2D) {
    const p = this.p;
    if (p.dead > 0) {
      const al = clamp((p.dead - 0.8) / 1.2, 0, 1);
      c.fillStyle = `rgba(0,0,0,${al})`; c.fillRect(0, 0, W, H);
      c.globalAlpha = al; c.textAlign = 'center'; c.fillStyle = '#c9c4e8'; c.font = `34px ${FONT}`; c.fillText('YOU WERE DRAINED', W / 2, H / 2 - 20);
      c.font = `17px ${FONT}`; c.fillStyle = '#fff'; this.wrap(c, this.deathQuote, 700).forEach((l, i) => c.fillText(l, W / 2, H / 2 + 20 + i * 24)); c.globalAlpha = 1;
    }
    if (this.mode === 'dialog' && this.dialog) {
      const d = this.dialog, line = d.lines[d.i].slice(0, Math.floor(d.chars));
      c.fillStyle = 'rgba(8,8,20,0.88)'; c.strokeStyle = '#e8e0c0'; c.lineWidth = 3; c.beginPath(); c.roundRect(60, H - 170, W - 120, 150, 14); c.fill(); c.stroke();
      c.fillStyle = '#ffe066'; c.font = `20px ${FONT}`; c.textAlign = 'left'; c.fillText(d.name, 84, H - 138);
      c.fillStyle = '#fff'; c.font = `19px ${FONT}`; this.wrap(c, line, W - 190).forEach((l, i) => c.fillText(l, 84, H - 106 + i * 26));
      if (d.chars >= d.lines[d.i].length) { c.fillStyle = '#ffe066'; c.textAlign = 'right'; c.fillText(Math.floor(this.time * 2) % 2 ? '▼' : '▽', W - 84, H - 34); }
      c.font = `13px ${FONT}`; c.fillStyle = '#999'; c.textAlign = 'left'; c.fillText(`${d.i + 1}/${d.lines.length}  (Space to continue)`, 84, H - 34);
    }
    if (this.mode === 'shop') {
      c.fillStyle = 'rgba(0,0,0,0.78)'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(20,16,36,0.96)'; c.strokeStyle = '#e8e0c0'; c.lineWidth = 3; c.beginPath(); c.roundRect(110, 50, W - 220, H - 100, 16); c.fill(); c.stroke();
      c.textAlign = 'center'; c.fillStyle = '#ffe066'; c.font = `30px ${FONT}`; c.fillText("Gary's Failed Goods & Rituals", W / 2, 96);
      c.textAlign = 'left'; c.font = `19px ${FONT}`;
      SHOP.forEach((it, i) => {
        const y = 140 + i * 40, sel = i === this.shopSel, owned = it.once && this.sv.bought.includes(it.id);
        if (sel) { c.fillStyle = 'rgba(255,224,102,0.18)'; c.fillRect(130, y - 24, W - 260, 34); }
        c.fillStyle = owned ? '#777' : sel ? '#fff' : '#ccc'; c.fillText((sel ? '▶ ' : '   ') + it.name, 140, y);
        c.textAlign = 'right'; c.fillStyle = owned ? '#777' : this.sv.geo >= it.cost ? '#fff6c8' : '#c66'; c.fillText(owned ? 'OWNED' : `${it.cost} ◆`, W - 140, y); c.textAlign = 'left';
      });
      c.font = `16px ${FONT}`; c.fillStyle = '#aaa'; this.wrap(c, SHOP[this.shopSel].desc, W - 300).forEach((l, i) => c.fillText(l, 140, 398 + i * 20));
      c.fillStyle = '#ffe9a0'; this.wrap(c, this.shopMsg, W - 300).forEach((l, i) => c.fillText(l, 140, 436 + i * 20));
      c.fillStyle = '#fff'; c.textAlign = 'right'; c.font = `18px ${FONT}`; c.fillText(`Your shards: ${this.sv.geo} ◆`, W - 140, 398);
      c.font = `13px ${FONT}`; c.fillStyle = '#888'; c.fillText('↑↓ select · Space buy · X/Esc leave', W - 140, 466);
    }
    if (this.mode === 'pause') {
      c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillRect(0, 0, W, H);
      c.textAlign = 'center'; c.fillStyle = '#ffe066'; c.font = `44px ${FONT}`; c.fillText('PAUSED', W / 2, 100);
      const items = ['Resume', `Sound: ${this.sfx.muted ? 'OFF' : 'ON'}`, 'Save & Quit to Title'];
      c.font = `26px ${FONT}`;
      items.forEach((s, i) => { c.fillStyle = i === this.pauseSel ? '#fff' : '#888'; c.fillText((i === this.pauseSel ? '▶ ' : '') + s, W / 2, 170 + i * 44); });
      c.font = `16px ${FONT}`; c.fillStyle = '#bbb';
      const sv = this.sv;
      const lines = [`YOUR PATH: ${this.area.objective}`, `Staff: R selects Spell / Ritual / Sacrifice, Q releases it`,
        `Abilities: ${sv.dash ? 'Absorber Sprint  ' : ''}${sv.djump ? 'Creator Spark' : ''}${!sv.dash && !sv.djump ? '(none yet)' : ''}`,
        `Lore read: ${sv.lore.length}   /   Deaths: ${sv.deaths}   /   Shards: ${sv.geo}`,
        'Move: Arrows / WASD   Jump: Space / Z   Attack: X   Dash: Shift / C',
        'Weave will: hold F   Interact: Up or E   Pause: Esc'];
      lines.forEach((l, i) => c.fillText(l, W / 2, 315 + i * 26));
    }
    void this.tip;
  }
}
