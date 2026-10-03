import type { EKind } from './world';

const YEL = '#fcdd00';
const YEL_D = '#e0b800';
const BRN = '#8a4b2a';
const RED = '#e8272c';

export interface DudePose {
  face: number; t: number; walk: number; moving: boolean; onGround: boolean; vy: number;
  atk: number; atkDir: number; dash: boolean; hurt: boolean; focus: number; cast: number; dead: number;
  speed: number; scale?: number;
}

function limb(ctx: CanvasRenderingContext2D, x: number, y: number, a1: number, l1: number, a2: number, l2: number, w: number, col: string) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const x1 = x + Math.sin(a1) * l1, y1 = y + Math.cos(a1) * l1;
  const x2 = x1 + Math.sin(a1 + a2) * l2, y2 = y1 + Math.cos(a1 + a2) * l2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  return [x2, y2] as const;
}

export function drawStaff(ctx: CanvasRenderingContext2D, len: number, glow = 0) {
  ctx.save();
  ctx.strokeStyle = BRN; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (glow > 0) { ctx.shadowColor = '#ffcc66'; ctx.shadowBlur = 12 * glow; }
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -len + 12); ctx.lineTo(-4, -len - 2); ctx.lineTo(-13, -len - 8); ctx.lineTo(-14, -len - 24);
  ctx.moveTo(0, -len + 12); ctx.lineTo(7, -len - 4); ctx.lineTo(7, -len - 22);
  ctx.stroke();
  ctx.restore();
}

/** Draws StickDude. Origin = feet centre. Figure ~72px tall. */
export function drawDude(ctx: CanvasRenderingContext2D, x: number, y: number, p: DudePose) {
  ctx.save();
  ctx.translate(Math.round(x / 3) * 3, Math.round(y / 3) * 3);
  const sc = p.scale ?? 1;
  ctx.scale(p.face * sc, sc);
  // Hold each drawn pose for a few game ticks; movement and collision stay smooth.
  const poseTime = Math.floor(p.t * 6) / 6;
  const walkPose = Math.floor(p.walk / (Math.PI / 2)) * (Math.PI / 2);
  if (p.dead > 0) {
    const k = Math.floor(Math.min(p.dead * 2, 1) * 6) / 6;
    ctx.rotate(-k * 1.5);
    ctx.translate(0, k * 6);
    ctx.globalAlpha = Math.max(0.2, 1 - Math.max(0, p.dead - 1) * 0.6);
  }
  let bob = 0, lean = 0;
  let fl = [0, 0], bl = [0, 0]; // front/back leg: [thigh angle, knee bend]
  let fa = [0.1, 0.15], ba = [-0.1, 0.1]; // arms
  const breathe = Math.sin(poseTime * 2.2);
  if (p.dash) {
    lean = 0.45; fl = [1.0, -0.4]; bl = [-1.1, 0.3]; fa = [-2.2, 0]; ba = [-2.4, 0];
  } else if (p.hurt) {
    lean = -0.3; fl = [0.5, 0.3]; bl = [-0.4, 0.2]; fa = [2.4, 0.3]; ba = [2.0, 0.3];
  } else if (!p.onGround) {
    const k = Math.round(Math.max(-1, Math.min(1, p.vy / 700)) * 2) / 2;
    if (k < 0) { fl = [0.7, -0.9]; bl = [-0.3, -0.6]; fa = [2.4 + k * 0.4, 0.2]; ba = [2.1, 0.1]; lean = 0.06; }
    else { fl = [0.25 + k * 0.1, -0.1]; bl = [-0.2, -0.1]; fa = [2.7, 0.1]; ba = [2.5, 0.1]; lean = -0.04; }
  } else if (p.moving) {
    const s = Math.sin(walkPose), c = Math.cos(walkPose);
    const amp = Math.round(Math.min(1, p.speed / 280) * 4) / 4 * 0.85;
    fl = [s * amp, Math.max(0, -c) * 1.0 * amp]; bl = [-s * amp, Math.max(0, c) * 1.0 * amp];
    fa = [-s * 0.75 * amp, 0.35]; ba = [s * 0.75 * amp, 0.35];
    bob = -Math.abs(s) * 3.2; lean = 0.13;
  } else {
    bob = breathe * 0.9; fa = [0.08 + breathe * 0.03, 0.12]; ba = [-0.1, 0.1];
  }
  if (p.focus > 0) { bob += 5; fl = [0.5, -0.9]; bl = [-0.4, -0.7]; lean = 0.2; fa = [2.6, 0.4]; ba = [2.6, 0.4]; }
  ctx.rotate(lean);

  // stowed staff on the back
  const attacking = p.atk > 0 && p.atk < 1;
  if (!attacking) {
    ctx.save(); ctx.translate(8, -16 + bob); ctx.rotate(-0.3); drawStaff(ctx, 62); ctx.restore();
  }

  // back leg & arm
  limb(ctx, -2.5, -30 + bob, bl[0], 15, bl[1], 15, 8.5, YEL_D);
  limb(ctx, -3, -49 + bob, ba[0], 13, ba[1], 12, 7, YEL_D);
  // torso
  ctx.strokeStyle = YEL; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -29 + bob); ctx.lineTo(0, -49 + bob); ctx.stroke();
  // front leg
  limb(ctx, 2.5, -30 + bob, fl[0], 15, fl[1], 15, 9, YEL);

  // front arm (with attack / cast)
  let hand: readonly [number, number];
  if (attacking) {
    const attackFrame = Math.floor(p.atk * 3) / 3;
    const e = 1 - Math.pow(1 - attackFrame, 2);
    let phi: number;
    if (p.atkDir === 1) phi = 1.0 + e * 2.3;
    else if (p.atkDir === 2) phi = 1.6 - e * 1.4;
    else phi = -2.5 + e * 4.1;
    hand = limb(ctx, 3, -49 + bob, phi, 14, 0, 12, 7.5, YEL);
    ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(Math.PI - phi - 0.0); drawStaff(ctx, 46, 0.7); ctx.restore();
  } else if (p.cast > 0) {
    hand = limb(ctx, 3, -49 + bob, 1.55, 14, 0, 12, 7.5, YEL);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(hand[0] + 6, hand[1], 0, hand[0] + 6, hand[1], 18);
    g.addColorStop(0, 'rgba(160,220,255,0.95)'); g.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hand[0] + 6, hand[1], 18, 0, 7); ctx.fill(); ctx.restore();
  } else {
    limb(ctx, 3, -49 + bob, fa[0], 14, fa[1], 12, 7.5, YEL);
  }

  // head
  ctx.fillStyle = YEL;
  ctx.beginPath(); ctx.arc(0, -62 + bob, 10.5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  ctx.beginPath(); ctx.arc(-1.5, -61 + bob, 10.5, 0.6, 3.1); ctx.fill();
  // eyes
  const blink = (poseTime % 4.2) < 0.12 || p.dead > 0;
  ctx.fillStyle = '#4a3a00';
  const eh = blink ? 1.5 : 8;
  ctx.fillRect(1.2, -66 + bob + (8 - eh) / 2, 2.6, eh);
  ctx.fillRect(6.2, -66 + bob + (8 - eh) / 2, 2.6, eh);
  // scarf
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.ellipse(1, -51 + bob, 11.5, 4.6, 0.05, 0, 7); ctx.fill();
  ctx.strokeStyle = RED; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-5, -50 + bob);
  const sp = p.moving || p.dash ? 1 : 0.35;
  const fly = p.dash ? 14 : p.moving ? 8 : 4;
  for (let i = 1; i <= 5; i++) {
    ctx.lineTo(-5 - i * fly * 0.9, -50 + bob + Math.sin(poseTime * 9 - i * 0.9) * 2.4 * sp * i * 0.5 + i * (p.onGround ? 1.2 : -0.6) + (p.vy > 0 && !p.onGround ? -i * 1.4 : 0));
  }
  ctx.stroke();

  if (p.focus > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,240,150,${0.3 + p.focus * 0.5})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -36, 30 + (1 - p.focus) * 24, 0, 7); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}

export interface DrawEnemy {
  kind: EKind; w: number; h: number; face: number; t: number; flash: number; vy: number; state: number; timer: number; alpha: number; hp: number; maxHp: number;
}

type Point = [number, number];

function inkLine(ctx: CanvasRenderingContext2D, points: Point[], color: string, width = 3) {
  ctx.beginPath();
  points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  ctx.strokeStyle = '#111326'; ctx.lineWidth = width + 1.5; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

function paperHead(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  const rough = [1.02, 0.96, 1.05, 0.98, 1.04, 0.95, 1.03, 0.97, 1.04, 0.96, 1.02, 0.98];
  ctx.beginPath();
  for (let i = 0; i <= rough.length; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / rough.length;
    const rr = r * rough[i % rough.length];
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = '#181629'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x - 1, y, r - 2, 3.4, 4.9); ctx.stroke();
}

function entityFace(ctx: CanvasRenderingContext2D, x: number, y: number, size = 1, friendly = false) {
  ctx.lineCap = 'round'; ctx.strokeStyle = '#241e43'; ctx.lineWidth = 2 * size;
  ctx.beginPath();
  if (friendly) {
    ctx.moveTo(x - 6 * size, y - 3 * size); ctx.lineTo(x - 4 * size, y + 2 * size);
    ctx.moveTo(x + 3 * size, y - 3 * size); ctx.lineTo(x + 5 * size, y + 2 * size);
    ctx.moveTo(x - 4 * size, y + 5 * size); ctx.lineTo(x, y + 7 * size); ctx.lineTo(x + 5 * size, y + 4 * size);
  } else {
    ctx.moveTo(x - 7 * size, y - 4 * size); ctx.lineTo(x - 2 * size, y);
    ctx.moveTo(x + 6 * size, y - 4 * size); ctx.lineTo(x + 1 * size, y);
    ctx.moveTo(x - 4 * size, y + 5 * size); ctx.lineTo(x + 3 * size, y + 4 * size);
  }
  ctx.stroke();
}

function manaScribble(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, frame: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(frame * Math.PI / 4);
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.ellipse(0, i * 3 - 4, size - i * size * 0.23, 3, 0.1, i * 0.6, i * 0.6 + Math.PI * 1.55); ctx.stroke();
  }
  ctx.restore();
}

function ancientFigure(ctx: CanvasRenderingContext2D, flash: boolean, frame: number, state: number, boss: boolean) {
  const line = flash ? '#fff' : '#b9bbcf';
  const lead = frame % 2 ? 3 : -3;
  const strike = boss && state === 2;
  const wind = boss && (state === 1 || state === 3 || state === 5);
  ctx.save();
  if (boss) ctx.scale(1.46, 1.46);
  inkLine(ctx, [[0, -50], [-2, -36], [0, -23]], line, 3);
  inkLine(ctx, [[0, -23], [-5 + lead, -11], [-8 + lead, 0]], line, 2.9);
  inkLine(ctx, [[0, -23], [7 - lead, -11], [7 - lead, 0]], line, 2.9);
  inkLine(ctx, [[0, -45], [12, -36], [18, -31]], line, 2.8);
  manaScribble(ctx, 20, -29, boss ? 8 : 5, flash ? '#fff' : '#b3bcff', frame);
  inkLine(ctx, [[-1, -45], [-12, -36], [-17, -29]], line, 2.8);
  ctx.save(); ctx.translate(-17, -29); ctx.rotate(strike ? 1.05 : wind ? -0.5 : -0.13);
  inkLine(ctx, [[0, 5], [-2, -8], [-6, -31], [-2, -36]], flash ? '#fff' : '#e7e5e0', 2.8);
  inkLine(ctx, [[-6, -4], [4, -6]], flash ? '#fff' : '#ad947d', 3.2);
  ctx.restore();
  paperHead(ctx, 0, -65, boss ? 12.4 : 12, flash ? '#fff' : '#edede7');
  ctx.strokeStyle = wind ? '#ad4856' : '#30314a'; ctx.lineWidth = 1.8; ctx.beginPath();
  for (const xx of [-7, -2, 3, 8]) { ctx.moveTo(xx, -69); ctx.lineTo(xx + (frame % 2), -61); }
  ctx.stroke();
  ctx.restore();
}

export function drawEntity(ctx: CanvasRenderingContext2D, e: DrawEnemy, x: number, y: number) {
  ctx.save();
  ctx.translate(Math.round(x / 3) * 3, Math.round(y / 3) * 3);
  ctx.scale(e.face, 1); ctx.globalAlpha = e.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const flash = e.flash > 0;
  const frame = Math.floor(e.t * 6) % 4;
  const twitch = frame % 2 ? 3 : -2;
  const bone = flash ? '#fff' : '#c8c2dc';
  const pale = flash ? '#fff' : '#e1d9e8';
  const vein = flash ? '#fff' : '#a391c9';

  switch (e.kind) {
    case 'crawler': {
      // A failed Stickman folded almost in half, with one too many joints.
      inkLine(ctx, [[-4, -11], [-13, -7], [-21 + twitch, 0]], bone, 3);
      inkLine(ctx, [[1, -11], [10, -2], [18 - twitch, -1]], bone, 3);
      inkLine(ctx, [[5, -27], [-7, -21], [2, -11]], bone, 4);
      inkLine(ctx, [[-3, -22], [-17, -27], [-19, -17]], bone, 2.5);
      inkLine(ctx, [[0, -18], [15, -16], [18 + twitch, -6]], bone, 2.5);
      inkLine(ctx, [[-8, -19], [-23, -31], [-27, -25]], vein, 1.8);
      paperHead(ctx, 8, -35, 9.5, pale); entityFace(ctx, 8, -35, 0.82);
      break;
    }
    case 'floater': {
      // Mana suspends a stretched, crooked creation; there are no insect wings.
      ctx.translate(0, [0, -3, 0, 2][frame]);
      inkLine(ctx, [[2, -31], [-7, -23], [2, -11]], bone, 3.2);
      inkLine(ctx, [[-1, -12], [-13 + twitch, -4], [-17, 2]], bone, 2.7);
      inkLine(ctx, [[2, -11], [11 - twitch, -1], [9, 5]], bone, 2.7);
      inkLine(ctx, [[-3, -26], [-15, -23], [-22, -6]], bone, 2.5);
      inkLine(ctx, [[1, -25], [15, -30], [18 + twitch, -15]], bone, 2.5);
      inkLine(ctx, [[-9, -19], [-19, -31], [-17, -39]], vein, 1.6);
      paperHead(ctx, 2, -43, 11, pale); entityFace(ctx, 2, -44);
      manaScribble(ctx, 1, -62, 10, flash ? '#fff' : '#9a8ac5', frame);
      break;
    }
    case 'hopper': {
      const tucked = e.vy < -150;
      const knee = tucked ? -16 : -10;
      inkLine(ctx, [[-2, -40], [7, -31], [-2, -23]], bone, 3.8);
      inkLine(ctx, [[-2, -23], [-14 + twitch, knee], [-17, tucked ? -7 : 0]], bone, 3.1);
      inkLine(ctx, [[-2, -23], [14 - twitch, -9], [18, tucked ? -8 : 0]], bone, 3.1);
      inkLine(ctx, [[2, -35], [15, -38], [20, -26]], bone, 2.8);
      inkLine(ctx, [[-2, -37], [-17, -33], [-22, -19]], bone, 2.8);
      inkLine(ctx, [[-4, -26], [-9, -16], [-5, -8]], vein, 1.8);
      paperHead(ctx, -2, -52, 11, pale); entityFace(ctx, -2, -53);
      break;
    }
    case 'spitter': {
      const charge = e.state === 1;
      inkLine(ctx, [[-1, -42], [-6, -26], [3, -21]], bone, 3.4);
      inkLine(ctx, [[3, -21], [-8, -10], [-12, 0]], bone, 2.8);
      inkLine(ctx, [[3, -21], [12, -11], [7, 0]], bone, 2.8);
      inkLine(ctx, [[-1, -38], [-17, -30], [-13, -18]], bone, 2.7);
      inkLine(ctx, [[0, -38], [12, -31], [23, charge ? -48 : -37]], bone, 3);
      inkLine(ctx, [[-6, -29], [-14, -13], [-17, -19]], vein, 1.7);
      paperHead(ctx, -2, -53, 11, pale); entityFace(ctx, -2, -54);
      manaScribble(ctx, 23, charge ? -51 : -40, charge ? 10 : 5, flash ? '#fff' : '#9eabff', frame);
      break;
    }
    case 'ancient':
      ancientFigure(ctx, flash, frame, e.state, false);
      break;
    case 'gary': {
      // Larry is an overfilled creation, not an animal or an armored knight.
      if (e.state === 1) ctx.scale(1.08, 0.94);
      inkLine(ctx, [[-4, -69], [-15, -52], [5, -39], [-4, -26]], bone, 6);
      inkLine(ctx, [[-4, -26], [-27, -17], [-32 + twitch, 0]], bone, 5);
      inkLine(ctx, [[-4, -26], [17, -13], [26 - twitch, 0]], bone, 5);
      inkLine(ctx, [[-3, -24], [1, -13], [-2, 0]], vein, 3);
      inkLine(ctx, [[-11, -56], [-33, -63], [-39, -41]], bone, 4);
      inkLine(ctx, [[-6, -55], [24, -61], [39, e.state === 3 ? -82 : -47]], bone, 4);
      inkLine(ctx, [[-10, -50], [-28, -38], [-35, -24]], vein, 2.2);
      inkLine(ctx, [[5, -41], [22, -33], [25, -20]], vein, 2);
      paperHead(ctx, -2, -96, 27, pale);
      entityFace(ctx, 0, -100, 2.1);
      inkLine(ctx, [[-20, -88], [-12, -80], [-3, -86], [9, -79], [19, -85]], vein, 1.8);
      inkLine(ctx, [[-18, -111], [-11, -108], [-14, -102]], vein, 2);
      inkLine(ctx, [[12, -115], [7, -111], [13, -106]], vein, 2);
      break;
    }
    case 'ancientBoss':
      ancientFigure(ctx, flash, frame, e.state, true);
      break;
    case 'creator': {
      // As on Storyline_3: a plain Stickman with two eyes and a little power in his hand.
      ctx.translate(0, [0, -2, -1, 1][frame]);
      const ivory = flash ? '#fff' : '#ece9df';
      inkLine(ctx, [[0, -56], [-2, -37], [0, -23]], ivory, 3.8);
      inkLine(ctx, [[0, -23], [-13, -8], [-17, 0]], ivory, 3.2);
      inkLine(ctx, [[0, -23], [12, -10], [16, 0]], ivory, 3.2);
      inkLine(ctx, [[0, -51], [-14, -42], [-22, -27]], ivory, 2.9);
      inkLine(ctx, [[0, -50], [14, -38], [28, -36]], ivory, 2.9);
      paperHead(ctx, 0, -73, 17, ivory);
      ctx.strokeStyle = '#222438'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-6, -79); ctx.lineTo(-6, -68); ctx.moveTo(5, -79); ctx.lineTo(5, -68); ctx.stroke();
      manaScribble(ctx, 30, -38, e.state >= 10 ? 13 : 7, flash ? '#fff' : '#fff0a8', frame);
      break;
    }
  }
  ctx.restore();
}

export function drawGaryNpc(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, t: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const twitch = Math.floor(t * 6) % 2 ? 2 : -2;
  inkLine(ctx, [[-2, -44], [6, -32], [-3, -23]], '#c8c2dc', 3.4);
  inkLine(ctx, [[-3, -23], [-11, -10], [-13, 0]], '#c8c2dc', 2.8);
  inkLine(ctx, [[-3, -23], [10, -10], [12, 0]], '#c8c2dc', 2.8);
  inkLine(ctx, [[-1, -39], [-17, -33], [-20, -22]], '#c8c2dc', 2.8);
  inkLine(ctx, [[1, -38], [16, -28], [18 + twitch, -34]], '#c8c2dc', 2.8);
  inkLine(ctx, [[-5, -30], [-17, -17], [-22, -11]], '#9989bd', 1.6);
  paperHead(ctx, 0, -56, 12, '#ded6e6'); entityFace(ctx, 0, -57, 1, true);
  ctx.fillStyle = '#e4b55e'; ctx.fillRect(-9, -26, 18, 5);
  ctx.fillStyle = '#f1ead0'; ctx.fillRect(8, -34, 7, 10);
  ctx.restore();
}

export function drawAbsorberEcho(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save(); ctx.translate(x, y);
  ctx.globalAlpha = 0.42 + (Math.floor(t * 6) % 3) * 0.08;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const faded = '#9d8dbf';
  inkLine(ctx, [[0, -54], [1, -35], [-1, -23]], faded, 3);
  inkLine(ctx, [[-1, -23], [-10, -9], [-12, 0]], faded, 2.8);
  inkLine(ctx, [[-1, -23], [11, -9], [13, 0]], faded, 2.8);
  inkLine(ctx, [[0, -48], [-16, -36], [-20, -22]], faded, 2.8);
  inkLine(ctx, [[0, -48], [16, -36], [18, -21]], faded, 2.8);
  paperHead(ctx, 0, -72, 20, '#17144c');
  ctx.strokeStyle = '#f1ebff'; ctx.lineWidth = 2.7;
  ctx.beginPath(); ctx.moveTo(-5, -79); ctx.quadraticCurveTo(-1, -87, 6, -82);
  ctx.quadraticCurveTo(12, -76, 3, -72); ctx.lineTo(0, -68); ctx.stroke();
  ctx.fillStyle = '#f1ebff'; ctx.beginPath(); ctx.arc(0, -62, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Logo: yellow gradient square, handwritten "Stick dudes", underline, and the StickDude peeking from below. */
export function drawLogo(ctx: CanvasRenderingContext2D, size: number) {
  ctx.save();
  const s = size / 512;
  ctx.scale(s, s);
  const g = ctx.createRadialGradient(256, 230, 20, 256, 256, 400);
  g.addColorStop(0, '#ffe81a'); g.addColorStop(0.55, '#ffc400'); g.addColorStop(1, '#f59a00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0a0a0a';
  ctx.font = '150px "Permanent Marker", "Rock Salt", "Comic Sans MS", cursive';
  ctx.fillText('Stick', 256, 160);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 3;
  ctx.font = '60px "Permanent Marker", "Comic Sans MS", cursive';
  ctx.strokeText('dudes', 256, 232);
  ctx.fillText('dudes', 256, 232);
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(36, 286, 440, 4);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 295, 512, 217); ctx.clip();
  drawDude(ctx, 285, 735, { face: 1, t: 0, walk: 0, moving: false, onGround: true, vy: 0, atk: 0, atkDir: 0, dash: false, hurt: false, focus: 0, cast: 0, dead: 0, speed: 0, scale: 5.6 });
  ctx.restore();
  ctx.restore();
}
