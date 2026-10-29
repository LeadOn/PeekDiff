# PeekDiff — Design System « Protocol » v1

> Source de vérité du design de PeekDiff, le JungleDiff de Valorant (suivi des stats du crew).
> Tokens : [`tokens.css`](tokens.css) · Assets du jeu : [`valorant-assets.ts`](valorant-assets.ts) ·
> Vitrine visuelle : [`showcase.html`](showcase.html).
> Pour une page donnée, regarder d'abord `design-system/pages/<page>.md` s'il existe : il prime sur
> ce fichier.

## 1. Intention

**Un HUD tactique qui lit un terminal.** Noir profond, rouge Valorant, blanc os. La structure vient
du jeu (angles coupés, filets fins, chiffres énormes en capitales condensées) ; la texture vient de
l'ASCII (cadres en box-drawing, boutons entre crochets, barres `█░`, journaux horodatés). L'ASCII
est une **couche d'accent**, pas un thème rétro : on doit pouvoir le retirer et garder une interface
lisible et complète.

Trois mots : **précis, sec, nocturne.**

| On veut | On évite |
|---|---|
| Angles vifs, coins coupés, filets 1px | Rayons arrondis, cartes « pilule » (c'était JungleDiff) |
| Profondeur par surfaces et hairlines | Ombres portées douces, glassmorphism |
| Rouge rare et chargé de sens | Rouge partout, dégradés néon multicolores |
| ASCII aux endroits structurants | ASCII dans le corps de texte, ASCII seul porteur d'info |
| Animations courtes et nettes | Rebonds (`ease-spring`), glitch permanent, scanlines fortes |

## 2. Couleurs

Thème **sombre par défaut** (`:root`), variante claire **Bone** via `.light` sur `<html>`.
Jamais de hex dans un composant : toujours une classe issue de `@theme`.

### Night (défaut)

| Rôle | Token Tailwind | Valeur | Contraste sur `bg` |
|---|---|---|---|
| Fond de page | `bg-bg-base` | `#0B0C0F` | — |
| Carte | `bg-surface-base` | `#121418` | — |
| Carte relevée / en-tête de tableau | `bg-surface-high` | `#181B20` | — |
| Creux (inputs, terminal) | `bg-surface-sunken` | `#07080A` | — |
| Texte principal | `text-text-main` | `#ECE8E1` (os) | 16:1 |
| Texte secondaire | `text-text-sec` | `#A8A39B` | 7.8:1 |
| Texte tertiaire (labels) | `text-text-ter` | `#85817A` | 5:1 |
| Rouge marque (texte, filets, glow) | `text-brand-red` | `#FF4655` | 5.8:1 |
| Rouge plein (bouton, texte blanc) | `bg-brand-red-fill` | `#D62A3B` | blanc dessus 4.9:1 |
| Victoire / allié | `text-win` · `text-ally` | `#33D1B2` | 10:1 |
| Défaite / ennemi | `text-loss` · `text-enemy` | `#FF4655` | 5.8:1 |
| MVP du match | `text-mvp` | `#F2C14E` | 11:1 |
| MVP d'équipe | `text-mvp-team` | `#C3C9CC` | 12:1 |
| Spike / alerte | `text-spike` | `#F5A623` | 9.5:1 |
| Filet | `border-border-base` | os 10 % | — |
| Filet appuyé | `border-border-strong` | os 22 % | — |
| Glyphes ASCII décoratifs | `text-border-ascii` | os 28 % | décoratif, `aria-hidden` |

### Bone (clair)

Fond `#ECE8E1`, cartes `#F6F3EE`, encre `#0F1114`. Le rouge texte fonce à `#C8202F`, la victoire à
`#0B7562`, le MVP à `#7A570F`, le spike à `#8A5100` : tous ≥ 4.5:1 sur le fond. Le rouge plein des boutons ne change pas.

### Règles d'usage du rouge

1. **Un seul CTA rouge plein par écran** (Rafraîchir, Analyser, Synchroniser…).
2. Le rouge signale : la marque, l'action principale, la défaite, l'équipe adverse, le focus clavier.
   Rien d'autre.
3. La défaite partage le rouge de la marque, comme en jeu. Un résultat est donc **toujours**
   accompagné de sa lettre : **V** (victoire), **D** (défaite), **N** (nul). Pareil pour les camps :
   libellé « ALLIÉS » / « ENNEMIS » ou icône.

### Couleurs de données

- **Rangs** : `tier-iron` → `tier-radiant` (9 teintes), reprises du champ `color` de la table des
  rangs de valorant-api.com (Immortel éclairci à `#DB4D72` pour le contraste). En pastille pleine
  avec texte `night`, ou en filet de 2px à gauche d'une ligne. Toujours accompagnées de l'emblème
  ou du nom du rang (§8).
- **Rôles d'agent** : `role-duelist` (corail), `role-initiator` (vert lime), `role-controller`
  (indigo), `role-sentinel` (cyan). Toujours avec l'icône et le nom du rôle.

## 3. Typographie

| Usage | Police | Réglages |
|---|---|---|
| Titres, chiffres héros (RR, ACS, score) | **Big Shoulders** 800–900 | MAJUSCULES, interlignage 0.9, approche +0.01em |
| Interface, paragraphes | **Barlow** 400 / 500 / 600 | 16px base, interlignage 1.5 |
| Chiffres, labels techniques, tout l'ASCII | **JetBrains Mono** 400 / 500 / 700 | chiffres tabulaires, ligatures coupées |

Chargées par `@nuxt/fonts` (auto-hébergées, `font-display: swap`).

Échelle : `11 · 12 · 14 · 16 · 18 · 24 · 32 · 48 · 72 · 112`.

- **Label** : mono 11–12px, MAJUSCULES, approche +0.08em, `text-ter`. Ex. `// RATIO K/D`.
- **Titre de section** : display 32px. **Titre de carte** : sans 600 16px ou cadre ASCII (§5).
- **Chiffre-clé** : display 48–72px ; son unité en mono 12px à côté (`RR`, `%`, `ACS`).
- **Valeur de tableau** : mono 14px, chiffres tabulaires, alignée à droite.
- Ne jamais mettre de paragraphe en mono ni en display.

## 4. Forme, espace, profondeur

- **Rayon : 0.** Seules les pastilles de 20px de haut ou moins prennent `rounded-[2px]`.
- **Coin coupé** (`notch`, 12px en haut à droite) : signature sur cartes principales et bouton
  primaire. `notch-2` (haut droite + bas gauche) réservé aux héros. Max une famille d'angle par carte.
- **Ticks** (`ticks`) : quatre équerres de viseur aux coins. Pour les blocs « focus » : joueur de la
  semaine, KPI vedette, état vide. Pas sur toutes les cartes.
- **Filets** : 1px `border-base` partout ; 2px rouge pour l'élément actif (onglet, ligne du joueur
  connecté) ; 2px couleur de rang pour les lignes du classement.
- **Espacement** : grille 4px. Paliers de section 16 / 24 / 32 / 48. Gouttière mobile 16px, desktop
  24px, conteneur max 1280px. Rail latéral à partir de `rail:` (1100px), comme JungleDiff.
- **Profondeur** : `surface-sunken` < `bg` < `surface` < `surface-high`. Pas d'ombre portée sur les
  cartes ; `shadow-float` seulement pour palette de recherche, menus, tooltips ; `shadow-glow-red`
  seulement au survol du CTA rouge et sur la ligne live.
- **Texture** : `scanlines` (2.5 % d'opacité) sur les héros et le bloc coach, jamais sur du texte
  courant. `page-wash` : un halo rouge discret en haut à droite de la page.
- **Z-index** : 0 contenu · 10 sticky (onglets) · 20 header · 40 bottom bar mobile · 100 overlays ·
  1000 toasts.

## 5. Le langage ASCII

Huit motifs, et seulement ceux-là. Tous en `ascii` (JetBrains Mono), couleur `border-ascii` sauf
mention contraire, et **`aria-hidden="true"`** dès qu'ils sont décoratifs.

| # | Motif | Exemple | Où |
|---|---|---|---|
| 1 | **Index de section** | `// 01 ── CLASSEMENT` | au-dessus de chaque titre de section ; le numéro en rouge |
| 2 | **Cadre de carte** | `┌─[ DERNIÈRES PARTIES ]──────┐` | titre de carte posé sur le filet supérieur ; cartes de liste et de données |
| 3 | **Bouton crochet** | `[ RAFRAÎCHIR ]` | boutons secondaires et ghost ; les crochets se resserrent au survol |
| 4 | **Barre glyphe** | `███████░░░ 68%` | HS %, taux de victoire, KAST dans les listes ; vrai graphe ailleurs |
| 5 | **Sparkline glyphe** | `▁▂▄▃▅▇▆` | tendance RR sur une ligne du classement |
| 6 | **Journal** | `[07:42] JETT ──▸ SAGE  ◎HS` | kill feed, historique de synchro, admin |
| 7 | **Prompt** | `>_ chercher un joueur█` | palette de recherche (⌘K), états vides, coach |
| 8 | **Trame** | `░▒▓█` | fond des héros, en dégradé, 6–10 % d'opacité |

Glyphes de rounds (frise de manche) : `✕` élimination · `◆` spike désamorcé · `✶` spike explosé ·
`◷` temps écoulé. Couleur du camp gagnant de la manche, info doublée par un `title`/`aria-label`.

Spinner : braille `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` (80ms/frame) ou barre `[■■■□□□□□]`. Avec
`prefers-reduced-motion`, glyphe figé + texte « Chargement… ».

**Garde-fous**

- Au plus **trois motifs ASCII par vue**, hors index de section (qui est systématique).
- Une barre ou une sparkline glyphe a toujours la valeur en clair à côté **et** un `aria-label`
  (« Pourcentage de headshots : 68 % »).
- Jamais d'ASCII dans une phrase, un bouton primaire, un message d'erreur.
- Les cadres box-drawing se tracent en CSS (bordures + `::before` pour le titre) quand la largeur
  varie ; le texte box-drawing littéral est réservé aux blocs de largeur fixe (états vides, splash).
- Pas d'ASCII art figuratif de personnages ou de logos (droits) : géométrie seulement — viseur,
  spike, frise.

## 6. Mouvement

Tactique : rapide, décidé, **sans rebond**. Tokens : `ease-snap`, `duration-fast` 120ms (survol,
pression), `duration-base` 200ms (états), `duration-slow` 320ms (entrées).

- **Entrée** (`animate-enter`) : 8px de translation + fondu, décalage de 40ms entre éléments d'une
  liste, 6 éléments max animés.
- **Wipe** (`animate-wipe`) : filet rouge qui se dessine de gauche à droite sous un titre de héros.
- **Déchiffrage** : sur le chiffre-clé d'un héros uniquement, les caractères défilent
  (`#%&@$0-9`) 300ms puis se figent. Une fois par chargement, jamais en boucle.
- **Curseur** (`animate-blink`) : prompt de recherche et coach qui écrit.
- **Ping** (`animate-ping`) : point « EN PARTIE ».
- Sortie ≈ 70 % de l'entrée. Rien ne bloque l'interaction. `prefers-reduced-motion` coupe tout
  (règle globale dans `tokens.css`) : le déchiffrage affiche directement la valeur.

## 7. Composants

### Boutons

| Variante | Rendu | Usage |
|---|---|---|
| **Primaire** | fond `brand-red-fill`, texte blanc, sans 600 MAJ., `notch`, icône `▸` à droite | une action par écran |
| **Secondaire** | `[ LIBELLÉ ]` mono, filet `border-strong`, fond transparent | actions courantes |
| **Ghost** | `[ libellé ]` sans filet, `text-sec` → `text-main` au survol | actions tertiaires, filtres |
| **Icône** | carré 40px, filet, `aria-label` obligatoire | barre d'outils |

Hauteur 44px (36px en dense desktop, zone de clic étendue à 44px). Désactivé : opacité 0.4 +
`cursor-not-allowed` + `disabled`. Chargement : le libellé devient `[■■■□□] SYNCHRO…` et le bouton
est `aria-busy`.

### Sélecteur segmenté

Filtres exclusifs d'une vue (`7 J · 30 J · 3 MOIS · TOUT`, files de jeu) : cadre 1px `border-base`
sur `surface`, options en mono 12px MAJ., hauteur 36px. L'option active prend `surface-high`, le texte
principal et le **filet bas rouge 2px** de l'élément actif ; les autres restent en `text-sec`. Les
libellés ne passent jamais à la ligne : sur mobile, le sélecteur défile horizontalement.
`aria-pressed` sur chaque option, `aria-label` sur le groupe (« Période »). Composant :
`ui/SegmentSwitch.vue`.

### Pastilles

- **Résultat** : carré 24px, lettre V/D/N en mono 700, fond teinté (`win-soft` / `loss-soft`).
  **R** pour une partie annulée (remake, 3 manches ou moins) : fond `surface-high`, texte `text-ter`,
  ligne à 70 % d'opacité ; elle ne compte dans aucune stat.
- **Rang** : emblème `smallicon` 20px + fond couleur du rang, texte `night`, mono 11px —
  `◈ DIAMANT 2`. Version compacte (ligne dense) : l'emblème seul, nom en `title` et `alt`.
- **RR** : `+18 RR` en `win` / `−21 RR` en `loss` / `±0 RR` en `text-sec`, mono.
- **Live** : point `brand-red` avec `animate-ping` + `EN PARTIE`.
- **Rôle** : icône + nom, filet 1px de la couleur du rôle.

### Cartes

- **Carte de données** : `surface-base`, filet 1px, `notch`, titre en cadre ASCII.
- **Carte vedette** : `ticks` + chiffre-clé en display.
- **Héros profil** : `night`, carte de joueur `wideart` en bandeau voilé, portrait de l'agent
  principal (`fullportrait`) détouré à droite, trame `░▒▓`, `notch-2`, filet rouge en
  `animate-wipe`, emblème du pic de rang (`ValorantPeakRankIconUrl`). Les cartes de joueur vont du
  presque noir à l'illustration saturée en plein jour : un voile plat `night` à 50 % passe **sous** le
  dégradé, sinon les rangs deviennent illisibles sur les plus claires. Le portrait n'apparaît qu'à
  partir de `md:`, masqué de 10 % à 55 % de sa largeur pour ne pas couvrir les rangs. Rangs actuel et
  pic, forme des classées (pastilles V/D), puis le CTA rouge « Synchroniser » (connecté uniquement)
  et « Synchro il y a X min ».
- **Héros match** : `splash` de la carte sous le voile `night`, portrait de l'agent joué.

### Lignes

- **Classement** : rang # en display, filet gauche 2px couleur du rang, carte de joueur `smallart`
  32px, Riot ID + tag en mono `text-ter`, emblème + pastille rang, RR, sparkline glyphe.
- **Partie (fil)** : pastille résultat, icône d'agent (`displayicon` 52px), bandeau de la carte
  (`listviewicon`) en fond voilé, score `13–9` en display, K/D/A mono, ACS, HS % en barre glyphe,
  pastille RR. Ligne entière cliquable, survol `surface-hover` + filet gauche rouge. Le lien est
  étiré depuis le nom de la carte (`after:inset-0`) vers la page de match ; les coéquipiers du crew
  (« En groupe avec … ») et les infobulles passent au-dessus (`z-[1]`). L'API ne sert pas les
  rôles d'agent : le filet bas de l'icône reste `border-strong`. Regroupement par jour (heure de
  Paris) sous un index `// AUJOURD'HUI` avec le bilan `2V · 1D` et le RR net du jour.

### Données de match

- **Camp** : une page de match se lit depuis un camp, comme en jeu. « Alliés » (`ally`) est l'équipe
  du joueur suivi, « Ennemis » (`enemy`) l'autre ; le score se lit alliés d'abord. Un camp n'est pas
  un résultat : la pastille V/D/N l'accompagne toujours.
- **Frise des manches** : 24+ cases carrées, glyphe du type de fin de manche, couleur du camp
  gagnant, séparateur à la mi-temps et en prolongation. Cases de 32px sur fond `ally-soft` /
  `enemy-soft`, filet 2px de la couleur du camp sur la manche sélectionnée, séparateurs libellés
  `MT` et `PROL.`, petit carré `mvp` dans le coin d'une manche à cérémonie (ace, clutch, sans
  faute…). Légende des glyphes au-dessus ; chaque case porte son libellé complet en `aria-label`.
- **Kill feed** : motif Journal avec les `killfeedportrait` (32×16) des deux agents, nom en `ally`
  ou `enemy`, `◎` pour headshot — l'API ne fournit pas encore le headshot par kill, le `◎` attend.
  Une manche à la fois (celle de la frise), avec pose et désamorçage du spike en tête ; le joueur
  suivi est souligné.
- **Tableau des scores** : en-tête `surface-high` mono MAJ. ; joueur connecté en
  `surface-selected` + filet rouge ; colonnes ACS · K · D · A · +/− · ADR · HS% · KAST · FK · FD
  (libellées PK / PM, premiers kills et premières morts). Un tableau par équipe, filet haut 2px de la
  couleur du camp ; sur mobile il défile à l'horizontale sous une colonne joueur collante.
- **Jour par jour** (accueil) : sept colonnes, une par jour (heure de Paris), barre empilée victoires
  (`win`) sur défaites (`loss`) proportionnelle au nombre de parties, le compte au-dessus, le RR net
  du jour en dessous (`—` sans classée), l'initiale du jour au pied, le jour courant en gras. Une
  légende sous la carte ; chaque colonne porte son résumé en `aria-label`.
- **Records** (accueil) : une carte par distinction, label `// TITRE`, valeur en display 44px et son
  unité en mono, ce qui a été compté en une ligne, puis sous un filet pointillé le joueur (lien vers
  son profil), la date et `[ LA PARTIE ]` quand le record tient en une partie. Les plus flatteuses
  d'abord. Pas de rouge : un record n'est ni une défaite ni une action.
- **Graphes** (chart.js) : grille `border-base`, axes mono 11px, allié `ally`, ennemi `enemy`,
  joueur sélectionné `brand-red`. Toujours un tooltip et une alternative tableau.

### Coach IA — « K.AI/O »

Persona du coach (clin d'œil à l'agent robot KAY/O ; skin UI uniquement, comme rAImmus). Rendu en
bloc terminal : `surface-sunken`, `scanlines`, en-tête `K.AI/O ── ANALYSE v1`, texte en sans (pas en
mono, c'est de la lecture), points clés préfixés `▸`. États : pas encore généré (prompt + CTA),
en file (`[■■□□□] POSITION 3`), rapport, abandonné, erreur.

### Navigation

- **Header** : mascotte 40px + wordmark `PEEK/DIFF` (le `/` en rouge), liens en mono MAJ. 12px, actif souligné
  rouge 2px, recherche `>_ ⌘K`, bascule thème.
- **Barre d'état** (pied de page desktop, comme une statusline) : fond `night`, mono 11px —
  `PEEKDIFF v1.0 │ SYNCHRO 07:42 │ PATCH 11.08 │ ● 2 EN PARTIE`.
- **Mobile** : bottom bar `night` 4 entrées (Crew, Parties, Recherche, Profil), icône + libellé.

### États vides et erreurs

Bloc `ticks`, petit viseur ASCII centré, titre clair, une action. Erreur : cause + action
(« L'API Riot ne répond pas. `[ RÉESSAYER ]` »).

## 8. Iconographie et assets du jeu

**Icônes d'interface** : Lucide (`@nuxt/icon`, comme JungleDiff), trait 1.75px, tailles 16 / 20 /
24. Pas d'emoji. Ne pas reproduire le logo Valorant.

**Logo** : la mascotte (Jett en chibi, geste « OK », détourée sur fond transparent) suivie du
wordmark `PEEK/DIFF`. Original 1024px dans [`logo/peekdiff-logo-1024.png`](logo/peekdiff-logo-1024.png),
128px dans `app/assets/img/PeekDiff_Logo.png` (rendu à 40px). Toujours posée telle quelle : ni
recadrée, ni recolorée, ni sous un filtre. Les icônes d'application (`apple-touch-icon`, manifeste)
la posent sur `night` avec une marge de sécurité ; le favicon la garde transparente. C'est une
illustration de fan d'un personnage Riot : la mention légale du pied de page la couvre.

**Assets du jeu** : tous servis par `media.valorant-api.com`, le CDN sur lequel GameOn-API construit
déjà ses URLs. Les constructeurs d'URL sont dans [`valorant-assets.ts`](valorant-assets.ts) (à
placer en `app/utils/`). Quand l'API envoie l'URL, on prend la sienne ; sinon le helper, qui
applique les mêmes règles qu'elle.

### Catalogue

| Asset | Source | Taille native | Rendu | Où |
|---|---|---|---|---|
| Emblème de rang (`smallicon`) | `ValorantRankHistory.SmallIconUrl` · `rankIconUrl(t)` | 256² | 20–32px | pastilles, lignes du classement |
| Emblème de rang (`largeicon`) | `LargeIconUrl` · `ValorantPeakRankIconUrl` | 256² | 64–96px | cartes de rang, pic de rang, héros |
| Flèche de promotion | `rankTriangleUrl(t, 'up' \| 'down')` | 125×111 | 12px | à côté d'un RR qui change de division |
| Carte de joueur `smallart` | `PlayerDto.ValorantPlayerCardSmallUrl` | 128² | 32–48px | avatar : header, classement, palette |
| Carte de joueur `wideart` | `ValorantPlayerCardWideUrl` | 452×128 | bandeau | héros profil, joueur de la semaine |
| Carte de joueur `largeart` | `ValorantPlayerCardLargeUrl` | 268×640 | colonne | rail du profil, podium |
| Icône d'agent | `agentImageUrl(id, 'icon')` | 1024² | 32–56px | fil, tableau des scores, agents joués |
| Portrait d'agent | `agentImageUrl(id, 'portrait')` | 2048×1860 | héros | héros profil et match, uniquement |
| Portrait kill feed | `agentImageUrl(id, 'killfeed')` | 128×64 | 32×16 | kill feed |
| Icône de rôle | `AGENT_ROLES[role].iconUrl` | 128² glyphe blanc | 12–16px | pastilles de rôle |
| Carte (bandeau) | `mapImageUrl(id, 'banner')` | 456×100 | fond de ligne | fil des parties |
| Carte (splash) | `mapImageUrl(id, 'splash')` | 1920×1080 | fond | héros match, tuiles de stats par carte |
| Carte (minimap) | `mapImageUrl(id, 'minimap')` | 1024² | 280–480px | onglet « Film de la partie » |

Règles de l'API reprises par le helper : les rangs valides sont 0 (non classé) et 3 (Fer 1) à 27
(Radiant), 1 et 2 n'ont pas d'image ; une carte de joueur vide (`null` ou GUID nul) n'a pas d'URL.
`ValorantRankHistory.MapId` peut être un chemin de jeu (`/Game/Maps/Ascent/Ascent`) :
`resolveMap` le convertit en uuid.

### Traitement dans Protocol

Les assets du jeu sont colorés et chargés ; Protocol les **calme** pour que le rouge reste le seul
accent.

- **Fonds** (splash, bandeau de carte, `wideart`) : toujours sous un voile, `night` dans les héros
  (dégradé 94 % → 55 %), couleur de la carte dans les lignes et les cartes (dégradé latéral, le texte
  côté opaque) ; `filter: grayscale(.35) contrast(1.05)`, `scanlines` sur les héros. Jamais de
  texte posé directement sur l'image.
- **Portraits d'agent** : détourés, ancrés en bas, jamais rognés au-dessus des épaules. Un
  `mask-image` en dégradé les fond dans le voile du côté du texte.
- **Icônes d'agent** : dans un carré `surface-high` sans arrondi, filet bas 2px de la couleur du
  rôle. Pas de cercle.
- **Icônes de rôle** : glyphes blancs ; on les teinte avec l'utilitaire `role-icon` (`mask` +
  `currentColor`), posé dans la pastille de rôle colorée. Le CDN répond `Access-Control-Allow-Origin: *`,
  ce qu'un masque cross-origin exige.
- **Emblèmes de rang** : jamais recolorés, jamais sous un filtre. Le gris ne s'applique qu'aux
  photos.
- **Light (Bone)** : les héros restent `night` (comme JungleDiff) ; seules les icônes vivent sur
  fond clair.

### Chargement, repli, sécurité

- Toujours `width` / `height` (ou `aspect-ratio`) et `loading="lazy"` hors du premier écran.
  Passer par un composant `AppImage`, comme JungleDiff.
- Les originaux sont lourds (icône d'agent 1024², portrait 2048px) : les servir redimensionnés via
  `@nuxt/image` (provider `ipx`, domaine `media.valorant-api.com` autorisé) — `displayicon` en 112px
  pour un rendu à 56px, `fullportrait` en 900px de large maximum.
- **Repli ASCII** quand une URL est `null` ou en erreur : carré `surface-high` avec les initiales
  en mono (`JT`), carte de joueur absente → motif trame `░▒`, rang inconnu → `[ — ]`. Jamais d'icône
  d'image cassée.
- CSP : ajouter `https://media.valorant-api.com` à `img-src` (JungleDiff pose sa CSP dans
  `server/plugins/csp.ts`).
- `alt` : nom de l'agent, du rang ou de la carte ; `alt=""` quand le nom est déjà écrit à côté.

### Mentions légales

Usage autorisé par la politique Riot pour les projets de fans (« Legal Jibber Jabber »), à
condition d'afficher en pied de page : *« PeekDiff n'est pas approuvé par Riot Games et ne reflète
pas les opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la
gestion des propriétés Riot Games. Riot Games et toutes les propriétés associées sont des marques
commerciales ou des marques déposées de Riot Games, Inc. »*

## 9. Accessibilité — non négociable

- Contraste texte ≥ 4.5:1 dans les deux thèmes (tableau §2) ; glyphes décoratifs exclus.
- Focus visible : contour 2px `brand-red`, décalage 2px.
- Couleur jamais seule : V/D/N, libellés de camp, noms de rangs et de rôles.
- ASCII décoratif `aria-hidden` ; ASCII porteur d'info doublé d'un `aria-label` ou d'un texte
  `sr-only`.
- Cibles tactiles ≥ 44px ; `prefers-reduced-motion` respecté.
- Les coins coupés (`clip-path`) rognent aussi l'outline : sur un élément `notch` focusable, poser
  le focus sur un pseudo-élément intérieur ou utiliser `outline-offset: -4px`.

## 10. Mapping JungleDiff → PeekDiff

| JungleDiff (LoL) | PeekDiff (Valorant) |
|---|---|
| Thème clair sauge par défaut | Thème sombre par défaut, Bone en option |
| Archivo + Geist Mono | Big Shoulders + Barlow + JetBrains Mono |
| Rayons 20–26px, pilules | Rayon 0, coin coupé, crochets ASCII |
| `ease-spring` | `ease-snap` |
| Or (marque) | Rouge (marque) |
| LP, champion, rôle (top/jungle…) | RR, agent, rôle (duelliste…) |
| Équipe bleue / rouge | Alliés (sarcelle) / ennemis (rouge) |
| MVP / ACE | MVP du match (or) / MVP d'équipe (argent) |
| rAImmus | K.AI/O |
| Film de la partie (minimap, or) | Frise des manches, kill feed, économie |
