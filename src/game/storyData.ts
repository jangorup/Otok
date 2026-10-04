/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IntroSlide {
  id: number;
  title: string;
  subtitle: string;
  text: string;
  icon: string;
  badge: string;
}

export interface NPCDialogue {
  id: string;
  name: string;
  role: string;
  avatarIcon: string;
  color: string;
  defaultTileX: number;
  defaultTileY: number;
  dialogue: string;
  secondaryDialogue?: string;
  associatedSecretId?: string;
}

export interface SecretItem {
  id: string;
  title: string;
  description: string;
  isDiscovered: boolean;
  hint: string;
  category: 'LORE' | 'SURVIVAL' | 'EXPLORATION';
}

export interface QuestGoal {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  steps: {
    id: string;
    text: string;
    completed: boolean;
  }[];
}

// --- STORY INTRO SLIDES (3-4 slides in Croatian) ---
export const INTRO_SLIDES: IntroSlide[] = [
  {
    id: 1,
    badge: 'Poglavlje I',
    title: 'Dolazak na Zaboravljeno Otočje',
    subtitle: 'Nakon dugog lutanja maglovitim morem...',
    text: 'Tvoj se čamac nasukao na tihe obale arhipelaga obavijenog gustom morskom izmaglicom. Miris borovine i soli miješa se s neobičnim, drevnim nemirom.',
    icon: '⛵',
  },
  {
    id: 2,
    badge: 'Poglavlje II',
    title: 'Kletva Morskih Bičeva',
    subtitle: 'Svake noći more donosi teror...',
    text: 'Otočani žive u strahu. Čim sunce utone u horizont, iz crnih morskih dubina uzdižu se sablasni, svjetlucavi bičevi čiste magije. Šibaju obale i tjeraju ljude u zaklon.',
    icon: '🌊',
  },
  {
    id: 3,
    badge: 'Poglavlje III',
    title: 'Drevna Zagonetka Mora',
    subtitle: 'Odgovor leži u zaboravljenim pričama...',
    text: 'Preostali stanovnici generacijama šapuću o kletvi koja je pala na ove vode. Nitko se godinama nije usudio suprotstaviti silama koje vrebaju u valovima.',
    icon: '📜',
  },
  {
    id: 4,
    badge: 'Poglavlje IV',
    title: 'Tvoj Zadatak',
    subtitle: 'Budi onaj koji će donijeti svjetlost...',
    text: 'Sagradi sigurno utočište, razgovaraj s uplašenim otočanima, istraži svaki kutak otoka i pronađi način da zauvijek prekineš kletvu koja pritišće ove vode.',
    icon: '✨',
  },
];

// --- NPC VILLAGERS (Standing near buildings / key points) ---
export const NPC_VILLAGERS: NPCDialogue[] = [
  {
    id: 'npc_goran',
    name: 'Starac Goran',
    role: 'Seoski starješina',
    avatarIcon: '👴',
    color: '#f59e0b',
    defaultTileX: 23,
    defaultTileY: 25,
    dialogue: 'Svake noći, čim padne mrak, iz mora se uzdižu svjetleći bičevi... Ne idi blizu vode noću, putniče. Kletva ne prašta.',
    secondaryDialogue: 'Ako želiš preživjeti noć, sagradi čvrsto Utočište dalje od valova. Magija mora ne dopire daleko na kopno.',
    associatedSecretId: 'secret_whips_legend',
  },
  {
    id: 'npc_mate',
    name: 'Ribar Mate',
    role: 'Otočni ribar',
    avatarIcon: '🎣',
    color: '#06b6d4',
    defaultTileX: 20,
    defaultTileY: 28,
    dialogue: 'Više se ne usuđujemo isploviti nakon zalaska sunca. More je prokleto, a valovi noću ključaju sablasnim plavetnilom.',
    secondaryDialogue: 'Vidim kako te čudne niti svjetla plešu nad pučinom... Kao da nešto živo i bijesno diše u ponorima.',
    associatedSecretId: 'secret_sea_shallows',
  },
  {
    id: 'npc_mara',
    name: 'Travarica Mara',
    role: 'Poznavateljica tajni',
    avatarIcon: '🌿',
    color: '#10b981',
    defaultTileX: 16,
    defaultTileY: 21,
    dialogue: 'Bilje na ovom otoku noću poprima neobičan sjaj. Kažu da more krije odgovor na to tko je bacio ovu kletvu.',
    secondaryDialogue: 'Drži se čvrstog tla kad sunce zađe. Otočne šume nude mir od noćnog morskog zraka.',
    associatedSecretId: 'secret_island_herbs',
  },
];

// --- MAIN QUEST & JOURNAL CONTENT ---
export const MAIN_QUEST: QuestGoal = {
  id: 'quest_curse_of_islands',
  title: 'Oslobodi otoke od kletve',
  description: 'Istraži misteriozno otočje, prikupi materijale, sagradi utočište i otkrij drevne tajne kako bi oslobodio otočane od noćnih morskih bičeva.',
  isCompleted: false,
  steps: [
    {
      id: 'step_shelter',
      text: 'Prikupi drvo i vlakna te sagradi Utočište (sklonište od kletve).',
      completed: false,
    },
    {
      id: 'step_talk_villagers',
      text: 'Razgovaraj s troje preostalih otočana i poslušaj njihove priče.',
      completed: false,
    },
    {
      id: 'step_survive_night',
      text: 'Dočekaj noć i promatraj pojavu tajanstvenih morskih bičeva.',
      completed: false,
    },
    {
      id: 'step_explore_island',
      text: 'Otkrij maglu cijelog otoka i zabilježi tragove u Dnevnik.',
      completed: false,
    },
  ],
};

// --- INITIAL SECRETS IN JOURNAL ---
export const INITIAL_SECRETS: SecretItem[] = [
  {
    id: 'secret_whips_legend',
    title: 'Legenda o morskim bičevima',
    description: 'Starješina Goran svjedoči da se bičevi uzdižu samo noću iz najdubljeg dijela mora. Voda tada zrači sablasnim sjajem.',
    hint: 'Porazgovaraj sa starješinom Goranom u selu.',
    category: 'LORE',
    isDiscovered: false,
  },
  {
    id: 'secret_sea_shallows',
    title: 'Zabranjene noćne vode',
    description: 'Ribar Mate upozorava da se noću niti jedan čamac ne vraća čitav s otvorenog mora.',
    hint: 'Pronađi ribara Matu uz južnu obalu.',
    category: 'SURVIVAL',
    isDiscovered: false,
  },
  {
    id: 'secret_island_herbs',
    title: 'Tajanstveni miris noćnog bilja',
    description: 'Travarica Mara primjećuje da otočno raslinje upija energiju noćnih valova dok bičevi obasjavaju obale.',
    hint: 'Razgovaraj s travaricom Marom u šumarku.',
    category: 'EXPLORATION',
    isDiscovered: false,
  },
];
