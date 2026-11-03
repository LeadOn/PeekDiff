import type { BuyType } from '~/utils/val-game'

/**
 * What each figure the app prints means, in French: the single source of the `InfoTip` bubbles on the
 * profile, the match page and the home page. Every `formula` describes what the GameOn API actually
 * computes (`ValPerformanceMath`, `ValGameParticipantStatCalculator`); change it with the API, never
 * from what the figure "usually" means elsewhere.
 */

export interface StatHint {
  /** The figure's full name, abbreviation spelled out: "ACS · Average Combat Score". */
  term: string
  /** What it says about the player, in one or two sentences. */
  text: string
  /** How it is computed, printed in mono under the text. */
  formula?: string
}

export const STAT_HINTS = {
  winRate: {
    term: 'Taux de victoire',
    text: 'Part des parties gagnées. Les nuls comptent dans le total, les remakes non.',
    formula: 'victoires ÷ parties',
  },
  acs: {
    term: 'ACS · Average Combat Score',
    text: 'Le score de combat de Riot, ramené à une manche. Il récompense surtout les dégâts et les kills, davantage quand il reste beaucoup d\'ennemis en vie, et un peu les assistances.',
    formula: 'score de combat ÷ manches jouées',
  },
  adr: {
    term: 'ADR · Average Damage per Round',
    text: 'Dégâts infligés aux adversaires, en moyenne par manche.',
    formula: 'dégâts ÷ manches jouées',
  },
  kd: {
    term: 'Ratio K/D',
    text: 'Kills par mort. Au-dessus de 1, il tue plus qu\'il ne meurt.',
    formula: 'kills ÷ morts',
  },
  kda: {
    term: 'KDA',
    text: 'Le K/D, en comptant aussi les assistances.',
    formula: '(kills + assistances) ÷ morts',
  },
  kdaLine: {
    term: 'K/D/A',
    text: 'Kills, morts et assistances sur la partie.',
  },
  headshots: {
    term: 'Headshots',
    text: 'Part des balles qui touchent un adversaire à la tête. Seules les balles qui touchent comptent, pas les tirs manqués.',
    formula: 'tête ÷ (tête + corps + jambes)',
  },
  kast: {
    term: 'KAST · Kill, Assist, Survive, Trade',
    text: 'Part des manches où il a pesé : un kill, une assistance, une survie jusqu\'à la fin de la manche, ou une mort vengée par un coéquipier dans les 5 secondes.',
    formula: 'manches utiles ÷ manches jouées',
  },
  rating: {
    term: 'Note PeekDiff',
    text: 'Note de 0 à 10 que PeekDiff calcule pour chaque partie ; sur un profil, la moyenne de ces notes. C\'est elle qui élit le MVP.',
    formula: 'ACS 30 % · ADR 20 % · KAST 20 % · KDA 15 % · premiers duels 10 % · HS 5 %, +0,4 si victoire',
  },
  firstDuels: {
    term: 'Premiers duels',
    text: 'Le premier kill de la manche met une équipe à 5 contre 4. Le premier chiffre compte les manches qu\'il a ouvertes en tuant, le second celles où il est tombé le premier.',
    formula: 'premiers kills – premières morts',
  },
  firstKills: {
    term: 'PK · Premiers kills',
    text: 'Manches où il a fait le premier kill, celui qui met son équipe à 5 contre 4.',
  },
  firstDeaths: {
    term: 'PM · Premières morts',
    text: 'Manches où il est mort le premier, laissant son équipe à 4 contre 5.',
  },
  plusMinus: {
    term: 'Plus / moins',
    text: 'Kills moins morts. Positif, il a tué plus qu\'il n\'est mort.',
    formula: 'kills − morts',
  },
  kills: { term: 'K · Kills', text: 'Adversaires éliminés.' },
  deaths: { term: 'D · Morts', text: 'Fois où il a été éliminé (deaths).' },
  assists: {
    term: 'A · Assistances',
    text: 'Adversaires tués par un coéquipier après qu\'il les a touchés, aveuglés ou ralentis.',
  },
  playtime: {
    term: 'Temps de jeu',
    text: 'Durée cumulée des parties comptées. Les parties personnalisées et les combats à mort n\'en font pas partie.',
  },
  riotScore: {
    term: 'Note Riot (bêta)',
    text: 'Le score de performance que Riot attribue à chaque partie, environ de 100 à 320. Encore provisoire chez Riot, il ne se compare pas à la note PeekDiff.',
  },
  rr: {
    term: 'RR · Rank Rating',
    text: 'Points de classement gagnés ou perdus sur la partie. À 100 RR, on monte d\'une division ; sous 0, on redescend.',
  },
  rankRating: {
    term: 'RR · Rank Rating',
    text: 'Points de classement dans la division actuelle, de 0 à 100. À 100, on monte d\'une division. Au-delà d\'Immortel, les RR s\'accumulent sans plafond.',
  },
  rrWeek: {
    term: 'Progression sur 7 jours',
    text: 'RR gagnés ou perdus depuis le relevé de rang d\'il y a 7 jours, montées et descentes de division comprises.',
  },
  peakRank: {
    term: 'Pic de rang',
    text: 'Le meilleur rang qu\'il ait atteint, tous actes confondus, avec l\'acte où il l\'a atteint.',
  },
  form: {
    term: 'Forme',
    text: 'Résultats de ses dernières parties classées, la plus récente à gauche.',
  },
  leaderboard: {
    term: 'Leaderboard',
    text: 'Sa place dans le classement régional de Riot, ouvert à partir d\'Immortel.',
  },
  prestige: {
    term: 'Prestige',
    text: 'Le nombre d\'actes qu\'il a terminés dans chaque famille de rang, la plus haute d\'abord.',
  },
  rrNetCrew: {
    term: 'RR net',
    text: 'Les RR gagnés et perdus par chaque membre du crew sur ses parties classées, additionnés. Positif, le crew a monté.',
  },
  rrNetWeek: {
    term: 'RR net · 7 jours',
    text: 'Le rang de chaque joueur aujourd\'hui comparé à celui d\'il y a 7 jours, additionné sur le crew. Seuls comptent les joueurs dont on a les deux relevés.',
  },
  rankedGames: {
    term: 'Parties classées',
    text: 'Parties de compétition jouées par les membres du crew sur la période. Une partie jouée à trois compte trois fois.',
  },
  crewPlaytime: {
    term: 'Temps de jeu',
    text: 'Durée cumulée des parties de compétition du crew sur la période. Une partie jouée à trois compte trois fois.',
  },
  rankedPlayers: {
    term: 'Joueurs classés',
    text: 'Membres du crew qui ont un rang de compétition, de Fer à Radiant, sur tous ceux de l\'échelle.',
  },
  bestRank: {
    term: 'Meilleur rang',
    text: 'Le rang actuel le plus haut du crew, et qui le tient.',
  },
  crewPeak: {
    term: 'Pic du crew',
    text: 'Le meilleur rang jamais atteint par un membre du crew, tous actes confondus.',
  },
  mvp: {
    term: 'MVP',
    text: 'Meilleure note PeekDiff de la partie, toujours dans l\'équipe gagnante.',
  },
  teamMvp: {
    term: 'MVP équipe',
    text: 'Meilleure note PeekDiff de l\'équipe perdante.',
  },
  sideRounds: {
    term: 'Manches gagnées par côté',
    text: 'En attaque, son équipe pose le spike ; en défense, elle l\'en empêche. Part des manches gagnées de chaque côté.',
    formula: 'manches gagnées ÷ manches jouées du côté',
  },
  sideGap: {
    term: 'Écart',
    text: 'Défense moins attaque. La couleur et la mention disent quel côté lui réussit le mieux.',
  },
  clutch: {
    term: 'Clutch',
    text: 'Manche où il se retrouve dernier en vie de son équipe face à un ou plusieurs adversaires. 1v3 : seul contre trois. Gagné s\'il remporte la manche.',
  },
  trades: {
    term: 'Échange (trade)',
    text: 'Tuer l\'adversaire qui vient d\'éliminer un coéquipier, dans les 5 secondes. Une mort vengée ainsi n\'est pas une perte sèche pour l\'équipe.',
  },
  buyPistol: {
    term: 'Pistolets',
    text: 'La première manche de chaque mi-temps, où tout le monde repart de 800 crédits.',
  },
  buyEco: {
    term: 'Éco',
    text: 'L\'équipe économise : moins de 2 000 crédits d\'équipement par joueur.',
  },
  buySemi: {
    term: 'Semi (achat forcé)',
    text: 'L\'équipe achète sans avoir de quoi s\'équiper complètement : de 2 000 à 3 899 crédits par joueur.',
  },
  buyFull: {
    term: 'Achat complet',
    text: 'Fusil et armure pour tous : 3 900 crédits d\'équipement ou plus par joueur.',
  },
  loadout: {
    term: 'Valeur',
    text: 'Valeur de son équipement en début de manche : arme, armure et compétences achetées.',
  },
  bank: {
    term: 'Banque',
    text: 'Crédits qu\'il garde après ses achats, pour la manche suivante.',
  },
  roundDamage: { term: 'Dégâts', text: 'Dégâts infligés aux adversaires dans la manche.' },
  roundKills: { term: 'Kills', text: 'Adversaires éliminés dans la manche.' },
} satisfies Record<string, StatHint>

export type StatHintKey = keyof typeof STAT_HINTS

/** The bubble of a team's buy (`buyType` in `val-game.ts`). */
export const BUY_HINTS: Record<BuyType, StatHint> = {
  pistol: STAT_HINTS.buyPistol,
  eco: STAT_HINTS.buyEco,
  semi: STAT_HINTS.buySemi,
  full: STAT_HINTS.buyFull,
}
