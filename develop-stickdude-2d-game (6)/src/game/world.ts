export type Surface = 'stone' | 'grass' | 'wood' | 'cave';
export interface Rect { x: number; y: number; w: number; h: number }
export interface Solid extends Rect { surf: Surface; oneWay?: boolean }
export type EKind = 'crawler' | 'floater' | 'hopper' | 'spitter' | 'ancient' | 'gary' | 'ancientBoss' | 'creator';
export interface SpawnDef { kind: EKind; x: number; y: number }
export interface NpcDef { id: string; name: string; x: number; lines: string[]; shop?: boolean; look: 'mayor' | 'gary' | 'frank' | 'dave' }
export interface TabletDef { id: string; x: number; title: string; lines: string[] }
export interface PickupDef { id: string; x: number; y: number; type: 'dash' | 'djump' | 'thread' }
export interface BossDef { kind: EKind; trigger: number; arenaL: number; spawnX: number; name: string; title: string; intro: string[]; outro: string[] }
export interface Palette { sky1: string; sky2: string; far: string; mid: string; near: string; ground: string; edge: string; fog: string; accent: string; mote: string }
export interface AreaDef {
  id: number; name: string; sub: string; width: number;
  theme: 'grass' | 'cave' | 'ruins' | 'spire'; palette: Palette; surf: Surface;
  solids: Solid[]; hazards: Rect[]; enemies: SpawnDef[]; npcs: NpcDef[]; tablets: TabletDef[];
  benches: number[]; pickups: PickupDef[]; boss?: BossDef; music: number;
  story: string[]; objective: string;
}

export const GY = 640;
export const WH = 720;

const gr = (x1: number, x2: number, surf: Surface): Solid => ({ x: x1, y: GY, w: x2 - x1, h: WH - GY + 300, surf });
const pl = (x: number, y: number, w: number, surf: Surface = 'wood'): Solid => ({ x, y, w, h: 16, surf, oneWay: true });
const sp = (x: number, w: number): Rect => ({ x, y: GY - 22, w, h: 22 });
const en = (kind: EKind, x: number, y = GY - 80): SpawnDef => ({ kind, x, y });

export const AREAS: AreaDef[] = [
  {
    id: 0, name: 'Stickhollow', sub: 'Population: 6 (7 if you count Gary)', width: 3200, theme: 'grass', surf: 'grass', music: 0,
    story: [
      'Mayor Stick: That staff on your back hums when the old pages mention the Battle of the Great. Nobody in town remembers giving it to you.',
      'Mayor Stick: The Creators made everything from mana. It holds a living will together; take too much and only a husk remains.',
      'Mayor Stick: Follow the old writings east. Find out what happened to the Absorbers before the Creators find that staff.',
      'Mayor Stick: Press R to choose Spell, Ritual or Sacrifice, then Q to use it. They all seek power, but they do not ask the same price.',
    ],
    objective: 'Follow the staff\'s hum into the Marsh',
    palette: { sky1: '#0b1a2e', sky2: '#27476b', far: '#142a45', mid: '#0f2036', near: '#09131f', ground: '#0c1722', edge: '#4f8f6a', fog: '#6fa3c8', accent: '#ffe066', mote: '#ffe9a0' },
    solids: [gr(0, 3200, 'grass'), pl(380, 540, 150), pl(700, 470, 140), pl(1950, 540, 170), pl(2150, 460, 150), pl(2350, 380, 140)],
    hazards: [],
    enemies: [],
    benches: [1200],
    npcs: [
      { id: 'mayor', name: 'Mayor Stick', x: 600, look: 'mayor', lines: [
        'Welcome to Stickhollow! Population: 6. Seven if you count Gary, but legally we do not.',
        'Long ago the Creators made everything out of mana. Mana is both everything and nothing at the same time. Like my pension.',
        'Rituals, Sacrifices, Spells... they are all the same thing! That is why our pamphlet says "Sacrifice Tuesday" and "Ritual Wednesday" in the same font.',
        'Entities roam the marsh. They are failed creations. Not dangerous, just very, very bitter.',
        'Rule of thumb: if a circle glows, sit in it. If a cross appears, DO NOT volunteer.',
        'Oh, and that stick on your back? Don\'t ask where you got it. You never told us either.'] },
      { id: 'gary', name: 'Gary (Failed Creation, Licensed Merchant)', x: 1700, look: 'gary', shop: true, lines: [
        'Hi! I\'m Gary. Someone gave me too much mana and my figure twisted in inhumane ways. Anyway, shop\'s open!',
        'I have no true purpose. I\'m just here for the memes and lore. Also for your shards.'] },
      { id: 'frank', name: 'Four-Eyes Frank (Ancient, retired)', x: 2200, look: 'frank', lines: [
        'I have no will. No thought. No emotion. ...Anyway I\'m doing GREAT, thanks for asking!',
        'They gave me four eyes to analyse the battlefield. All four report that you are blocking the sun.',
        'I was created to serve and protect at any cost. Currently the cost is my knees.'] },
      { id: 'dave', name: 'Cultist Dave', x: 2700, look: 'dave', lines: [
        'Hey. That staff can draw three shapes. Press R to switch between Spell, Ritual and Sacrifice; Q releases the one you picked.',
        'Same source, different bill: Spell is a mana shot. Ritual draws a mana circle. Sacrifice takes your own will to hit everything nearby.',
        'Last time it required "a volunteer". I said "ok". Now I live in a tornado. Just kidding. Mostly.',
        'Mana can\'t be felt, seen, tasted, heard or smelt. So when my spell fails I can\'t tell if it\'s the spell or my cold.',
        'Everything ties to power. Even my tax returns.'] },
    ],
    tablets: [
      { id: 't0a', x: 950, title: 'Tablet: Mana', lines: [
        'MANA: the very life force used to create all living things, including the Creators.',
        'Mana can be manipulated and bent to create many things: life, spells, and entities.',
        'Draining mana from one will leaves them a husk. Footnote: do NOT drain your roommate.'] },
      { id: 't0b', x: 2900, title: 'Town Notice', lines: [
        'RULES OF STICKHOLLOW: 1) No sacrifices before noon. 2) No rituals in the town hall. 3) Entities may not be "just in it for the memes" on weekdays.',
        'Lost: one volunteer. If found, please do not return to the cross.'] },
    ],
    pickups: [],
  },
  {
    id: 1, name: 'Whispering Marsh', sub: 'Home of the Failed Creations', width: 5000, theme: 'grass', surf: 'grass', music: 1,
    story: [
      'The Whispering Marsh. Shapes twist here where the Creators gave their failed creations more mana than a body could contain.',
      'The Entities were not born monsters. Somewhere beyond them, a much older power is calling to the staff.',
    ],
    objective: 'Cross the Entities and trace the mana',
    palette: { sky1: '#07140f', sky2: '#1b3d33', far: '#10281f', mid: '#0b1d17', near: '#06110d', ground: '#08130f', edge: '#55b97a', fog: '#55a58a', accent: '#8bffc0', mote: '#b6ffd8' },
    solids: [gr(0, 1500, 'grass'), gr(1780, 3300, 'grass'), gr(3800, 5000, 'grass'),
      pl(3330, 560, 130), pl(3500, 540, 120), pl(3660, 560, 120),
      pl(2300, 520, 150), pl(2550, 430, 140), pl(2800, 360, 160), pl(450, 520, 140), pl(4300, 500, 160)],
    hazards: [sp(2650, 90), sp(4150, 80)],
    enemies: [en('crawler', 1000), en('floater', 1250, 450), en('crawler', 2000), en('hopper', 2300), en('crawler', 2650), en('floater', 2800, 400), en('floater', 3050, 450),
      en('crawler', 4000), en('spitter', 4350), en('hopper', 4550), en('crawler', 4800)],
    benches: [2000, 4700],
    npcs: [],
    tablets: [
      { id: 't1a', x: 1300, title: 'Tablet: Entities', lines: [
        'ENTITIES: failed creations made by the Creators. Give one too much mana, the body cannot contain it, and the figure twists and turns in inhumane ways.',
        'Some bend almost in half. Others hang in the air, their uneven limbs reaching for the ground. They were Stickmen once.',
        'These entities have no true purpose. They are just in it for the memes and lore.',
        'Review: 1 star. Would not be twisted again.'] },
      { id: 't1b', x: 4200, title: 'Tablet: The Battle of the Great', lines: [
        'The Creators were dictators who did not believe in equality. This triggered the Battle of the Great.',
        'The Absorbers ended the war with overwhelming power. No one knows what happened to them.',
        'Rumor A: they ascended to a higher plane. Rumor B: they went to get snacks.'] },
    ],
    pickups: [{ id: 'dash', x: 900, y: GY - 40, type: 'dash' }],
  },
  {
    id: 2, name: 'Mana Caverns', sub: 'Smells of both something and nothing', width: 5200, theme: 'cave', surf: 'cave', music: 2,
    story: [
      'The walls are threaded with mana: the life force that made living things, even the Creators themselves.',
      'Ancients defended the Creators. The first Ancients, the Absorbers, were given consciousness instead of orders. The war began there.',
      'Each step makes the staff answer with a second heartbeat. Is something alive inside it?',
    ],
    objective: 'Find the truth beneath the Caverns',
    palette: { sky1: '#0a0613', sky2: '#25143d', far: '#1a0f2d', mid: '#130a22', near: '#0b0615', ground: '#0d0817', edge: '#8c6bd6', fog: '#6b4fb0', accent: '#c9a8ff', mote: '#e0ccff' },
    solids: [gr(0, 1400, 'cave'), gr(1570, 5200, 'cave'),
      pl(2300, 560, 130, 'cave'), pl(2450, 480, 130, 'cave'), pl(2600, 400, 170, 'cave'),
      pl(3250, 430, 110, 'cave'), pl(900, 520, 150, 'cave'), pl(1900, 520, 150, 'cave'), pl(3600, 520, 150, 'cave')],
    hazards: [sp(1050, 80), sp(3000, 100), sp(3900, 90)],
    enemies: [en('crawler', 600), en('hopper', 900), en('floater', 1200, 450), en('crawler', 1800), en('spitter', 2100), en('hopper', 2000),
      en('floater', 2700, 400), en('crawler', 3000), en('hopper', 3300), en('spitter', 3600), en('floater', 3800, 450), en('crawler', 4050)],
    benches: [700, 3900],
    npcs: [],
    tablets: [
      { id: 't2a', x: 1250, title: 'Tablet: Ancients', lines: [
        'ANCIENTS: created by the Creators to serve and protect at any cost. Some were gifted divine powers that ordinary Stickmen could not comprehend.',
        'They were the last line of defence in the Battle of the Great. They have no will, no thought, no emotion.',
        'They ARE in a really good mood though.'] },
      { id: 't2b', x: 3600, title: 'Tablet: Spells', lines: [
        'RITUAL (a circle). SPELL (a tornado). SACRIFICE (a cross). All the same. All for power. Some are made from greed, others from desperation.',
        'Nobody asked the tornado if it consented.'] },
    ],
    pickups: [{ id: 'djump', x: 2680, y: 360, type: 'djump' }, { id: 'mask1', x: 3290, y: 390, type: 'thread' }],
    boss: { kind: 'gary', trigger: 4300, arenaL: 4150, spawnX: 4850, name: 'LARRY, THE OVERFILLED', title: 'Gary\'s Cousin, also a Failed Creation',
      intro: ['Larry: Oh no. Not you. I have a... a boss thing today.',
        'Larry: Look, my contract says I must fight you. I\'m a failed creation. I have no true purpose.',
        'Larry: But hey! If I win I get to be in the lore. If I lose I ALSO get to be in the lore. It\'s a win-win!',
        'Larry: Prepare to be... mildly inconvenienced!'],
      outro: ['Larry: Ow. Tell Gary... he still owes me 5 shards.', 'Larry: At least I\'m in the lore now. Worth it.'] },
  },
  {
    id: 3, name: 'Ancient Ruins', sub: 'The last line of defence. Currently on break.', width: 5600, theme: 'ruins', surf: 'stone', music: 3,
    story: [
      'The last line of defence still stands. Four-eyed Ancients watch a battlefield that has been empty for centuries.',
      'The old pages say no one knows where the Absorbers went. Another account claims the Creators sealed them in a staff.',
      'Your staff has stopped pretending to be an ordinary stick.',
    ],
    objective: 'Pass the Ancients and uncover the staff',
    palette: { sky1: '#130b0b', sky2: '#4a2a22', far: '#2a1814', mid: '#1d100e', near: '#110908', ground: '#150c0a', edge: '#d98a5b', fog: '#b0674a', accent: '#ffb088', mote: '#ffd7bd' },
    solids: [gr(0, 1500, 'stone'), gr(1880, 5600, 'stone'),
      pl(500, 540, 140, 'stone'), pl(2300, 540, 150, 'stone'), pl(2550, 450, 150, 'stone'), pl(2800, 360, 170, 'stone'), pl(3300, 520, 150, 'stone'), pl(3550, 440, 150, 'stone'), pl(4000, 520, 180, 'stone')],
    hazards: [sp(1000, 90), sp(3100, 100), sp(3900, 80)],
    enemies: [en('ancient', 700), en('spitter', 1000), en('ancient', 1300), en('ancient', 2100), en('hopper', 2500), en('floater', 2700, 400), en('ancient', 3000), en('spitter', 3400),
      en('ancient', 3700), en('hopper', 3900), en('floater', 4100, 450), en('spitter', 4300)],
    benches: [2000, 4400],
    npcs: [],
    tablets: [
      { id: 't3a', x: 1350, title: 'Tablet: Absorbers', lines: [
        'ABSORBERS: an ancient clan long gone in the Battle of the Great. They absorbed materials, sometimes living things, and manipulated the power they held.',
        'Using this power they sucked in more. In the end the power was overwhelming and ended the war.',
        'The identities are unknown, yet the influence they left behind still stands. That ink-dark figure near this tablet may be a memory. The staff refuses to say.'] },
      { id: 't3b', x: 4500, title: 'Tablet: Creators', lines: [
        'CREATORS: the so-called winners of the Battle of the Great. They created everything, including life, at the cost of mana of course.',
        'The war was believed to be won by sealing the Absorbers into a STAFF.',
        'Fun question: what are YOU carrying on your back? (Do not read this out loud.)'] },
    ],
    pickups: [],
    boss: { kind: 'ancientBoss', trigger: 4800, arenaL: 4650, spawnX: 5350, name: 'THE UNBLINKING ANCIENT', title: 'Four eyes. Zero thoughts.',
      intro: ['...', 'The Ancient has no will. No thought. No emotion.', '(All four of its eyes are locked onto your staff.)', 'Ancient: ...Staff. Absorbers. Staff. Absorbers. (It seems to be stuck on a loop.)'],
      outro: ['The Ancient crumbles. Its last words: "I... felt... something?"', 'Oops. The Creators DID make the mistake of giving them consciousness. The staff hums warmly.'] },
  },
  {
    id: 4, name: 'Creator\'s Spire', sub: 'Dictators hate paperwork', width: 3400, theme: 'spire', surf: 'stone', music: 4,
    story: [
      'The so-called winners of the Battle of the Great live above the ruins they made.',
      'The Creators could make anything from mana, but would not make a world where everyone was equal.',
      'Beyond this door is the one who knows whether the Absorbers fled, ascended, or were sealed in your staff.',
    ],
    objective: 'Face the Creator and learn what was sealed',
    palette: { sky1: '#05060f', sky2: '#1c2150', far: '#141838', mid: '#0e1129', near: '#080a1a', ground: '#0a0c1e', edge: '#9aa6ff', fog: '#6670d8', accent: '#e8ecff', mote: '#ffffff' },
    solids: [gr(0, 3400, 'stone'), pl(500, 540, 150, 'stone'), pl(800, 450, 150, 'stone'), pl(1100, 540, 150, 'stone')],
    hazards: [],
    enemies: [en('floater', 700, 420), en('spitter', 1000), en('ancient', 1300), en('floater', 1500, 420)],
    benches: [300],
    npcs: [],
    tablets: [
      { id: 't4a', x: 1650 - 150, title: 'Sign on the Door', lines: [
        'THE CREATOR\'S OFFICE. Capable of creating anything, at the cost of mana.',
        'No Absorbers. No Ancients. No Entities. No Daves.'] },
    ],
    pickups: [],
    boss: { kind: 'creator', trigger: 1800, arenaL: 1700, spawnX: 2800, name: 'THE CREATOR', title: 'Dictator. Allergic to equality.',
      intro: ['Creator: At last. The little yellow thing that carries my greatest mistake.',
        'Creator: I created everything. Life. Mana. Rituals. Spells. Sacrifices. ...Tuesday.',
        'Creator: I am a dictator because equality is simply too much paperwork.',
        'Creator: The Absorbers are sealed in that stick. Hand it over. I shall make a better world. With fewer stickmen.',
        'Creator: Prepare to be un-created.'],
      outro: ['Creator: Impossible... mana... both everything and nothing...',
        'Creator: ...I am going to nothing now. Please tell the Entities I am sorry about the memes.',
        'The staff trembles. Voices whisper: "Thank you. We have been so, so bored in here."',
        'The Absorbers ascend to a higher plane. The war is finally over. Stickhollow can have Sacrifice Tuesday in peace.'] },
  },
];

export const DEATH_QUOTES = [
  'You were drained. Mana: both everything and nothing. You: just nothing.',
  'You became a husk. Husks cannot read lore. Respawning...',
  'The ritual was a success. For the entity.',
  'That was not a spell. That was a sacrifice. Of your health.',
  'A body being controlled by a force is not living. A body bent by an Entity is not doing great, either.',
  'Cultist Dave would like you to know this was "technically a spell".',
  'Remember: crosses are not furniture.',
  'The entities did it for the memes.',
  'Gary says: "Skill issue." Gary is a failed creation.',
  'Your life force was drained. It couldn\'t be felt, seen, tasted, heard or smelt. But it was definitely gone.',
];

export const TIPS = [
  'Tip: Rituals, Sacrifices and Spells are all the same. Pick whichever has the best snacks.',
  'Tip: Press R to choose a Working, then Q to use it. A Sacrifice costs one Will Thread.',
  'Tip: Entities have no true purpose. Neither does this tip.',
  'Tip: Mana is everything and nothing. So is your bank account.',
  'Tip: If a cross appears, do not volunteer.',
  'Tip: Sitting in a Ritual Circle saves your game. Sitting in a Spell tornado does not.',
  'Tip: Ancients have no emotion. Do not tell them jokes. (They will not laugh. They will not.)',
  'Tip: The Absorbers fled. Or ascended. Or got snacks. Scientists are still unsure.',
  'Tip: Hit enemies with your staff to gather mana. Mana can\'t be felt, so just trust us.',
];

export const SHOP = [
  { id: 'nail', name: 'Sharper Stick', cost: 150, once: true, desc: '+1 staff damage. Now 12% pointier.' },
  { id: 'mask', name: 'Spare Will Thread', cost: 250, once: true, desc: '+1 will. Gary wove it himself. Mostly.' },
  { id: 'siphon', name: 'Mana Siphon', cost: 180, once: true, desc: 'More mana per hit. Absorber-approved.' },
  { id: 'quick', name: 'Quick Slash', cost: 120, once: true, desc: 'Swing faster. Gary calls it "the twitch".' },
  { id: 'ritual', name: 'Ritual Starter Kit', cost: 40, once: false, desc: 'Restores 44 mana. Contains 1 chalk, 7 candles, 0 safety instructions.' },
  { id: 'chicken', name: 'Sacrificial Chicken', cost: 5, once: false, desc: 'Does nothing. The chicken is thrilled to be alive.' },
];

export const SHOP_JOKES = [
  'Gary: Thanks! The chicken says thanks too. Probably.',
  'Gary: Do NOT use the kit on a Tuesday. Trust me.',
  'Gary: No refunds. The chicken is already attached to you emotionally.',
  'Gary: You know it\'s all the same, right? Ritual, spell, sacrifice? Anyway, receipt?',
  'Gary: Another satisfied customer! Statistically, 100% of you survive. (Not verified.)',
];

export const STORY = [
  { title: 'Storyline_1', sections: [
    { heading: 'Spells', art: 'spell', text: 'Rituals, Sacrifices, Spells. They are all the same. Some are made out of greed, others out of desperation. Everything ties to power. No matter the spell, it is made for power. The power to create, destroy and change all comes from mana. Mana is both everything and nothing at the same time. So are spells that primarily use mana. It can\'t be felt, seen, tasted, heard or smelt. It simply drains life force. It is both something and nothing.' },
    { heading: 'Entities', art: 'entity', text: 'Failed creations created by the creators. By giving one too much mana that the body can\'t contain, their figures twist and turn in inhumane ways, ultimately creating entities. These entities have no true purpose. They are just in it for the memes and lore.' },
  ] },
  { title: 'Storyline_2', sections: [
    { heading: 'Ancients', art: 'ancient', text: 'Created by the creators to serve and protect at any cost. Some were gifted divine powers that ordinary Stickmen could not comprehend. They were the last line of defence in the battle of the great. Some were given 4 eyes to analyse the battlefield. They have no will, no thought, no emotion. The absorbers were the first ancients to be created, but the creators made the mistake of giving them consciousness in an attempt to increase intelligence. Yet it made the first sparks of a blazing war that would last centuries.' },
    { heading: 'Mana', art: 'mana', text: 'The very life force used to create all living things including the Creators. Mana can be manipulated and bent to create many things including life, Spells, and Entities. Draining Mana from one will leave them dead, only a husk. It is the fundamental strings in holding together one\'s will. If they do not have a will then they are dead; simply a body being controlled by a force is not living.' },
  ] },
  { title: 'Storyline_3', sections: [
    { heading: 'Absorbers', art: 'absorber', text: 'An ancient clan long gone in the battle of the great. They absorbed materials, sometimes living things, and manipulated the power it held. Using this power they sucked more; in the end the power was overwhelming and ended the war. No one knows what happened. It was believed that after seeing the enemies\' power, they fled. Others think that they may have won, but absorbing so much power made them ascend to a higher plane. The identities are unknown, yet the influence they left behind still stands.' },
    { heading: 'Creators', art: 'creator', text: 'The so called winners in the battle of the great. They created everything including life, yet they were dictators and simply didn\'t believe in equality. This triggered the battle of the great. They were capable of creating anything, at the cost of mana of course. The battle of the great was believed to be won by sealing the absorbers into a staff.' },
  ] },
];

export const CREDITS = [
  'Roy Rampal',
  'Armaan Singh Virk',
  'Artemiy Borodulin',
  'Kirill Sheludov',
  'Satvik Sahoo',
  'Artemii Borodulin Alekseevich',
];
