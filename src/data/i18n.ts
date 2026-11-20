import type { Difficulty, Lang, TwistKind } from '../engine/types';

export interface UIStrings {
  appTitle: string;
  appSubtitle: string;
  dailyVolume: string;
  starterVolume: string;
  howToPlay: string;
  openTodayCase: string;
  browseContents: string;
  tableOfContents: string;
  backToCover: string;
  prevSpread: string;
  nextSpread: string;
  pageLabel: string;
  suspectsTab: string;
  mapTab: string;
  pencilDock: string;
  backOfBook: string;
  gridAid: string;
  gridAidTooltip: string;
  tapAssist: string;
  tapAssistTooltip: string;
  tapGridHint: string;
  rotateTitle: string;
  rotateBody: string;
  fingerDraw: string;
  penOnly: string;
  theMurdererIs: string;
  accuseTitle: string;
  accuseSubtitle: string;
  selectMurderer: string;
  selectOutlaw: string;
  selectUninvolved: string;
  selectPatch: string;
  selectLiar: string;
  selectTimeSwap: string;
  selectRoleHolder: string;
  secretRolesHeading: string;
  occupancyCan: string;
  occupancyCannot: string;
  volAll: string;
  vol1Label: string;
  vol2Label: string;
  vol3Label: string;
  verifyVerdict: string;
  verdictCorrectTitle: string;
  verdictCorrectBody: string;
  verdictWrongTitle: string;
  verdictWrongBody: string;
  tryAgain: string;
  viewSolution: string;
  nextCase: string;
  solvedStamp: string;
  todayBadge: string;
  dailyArchiveTitle: string;
  dailyLoading: string;
  dailyNotice: string;
  hintsTab: string;
  solutionTab: string;
  revealNextHint: string;
  allHintsRevealed: string;
  noHintsYet: string;
  officialGrid: string;
  yourGridInk: string;
  completeProof: string;
  clearPageLeft: string;
  clearPageRight: string;
  clearSpread: string;
  undo: string;
  redo: string;
  toolPencil: string;
  toolPen: string;
  toolHighlighter: string;
  toolEraser: string;
  close: string;
  moreOptions: string;
  autoMinimize: string;
  pencilDetectedLabel: string;
  pencilReadyLabel: string;
  strokeWidthLabel: string;
  gesturesHint: string;
  missingPatchesLabel: string;
  difficultyLabels: Record<Difficulty, string>;
  twistBadges: Record<TwistKind, string>;
  rulesTitle: string;
  rulesSubtitle: string;
  coreRulesHeading: string;
  coreRulesList: string[];
  twistsHeading: string;
  twistExplanations: Array<{ badge: string; title: string; body: string }>;
  pencilTipsHeading: string;
  pencilTipsBody: string;
}

export const UI_STRINGS: Record<Lang, UIStrings> = {
  en: {
    appTitle: 'MURDOKU',
    appSubtitle: 'Murder Mystery Logic Puzzles',
    dailyVolume: 'Daily Mystery Volume',
    starterVolume: 'Starter Anthology',
    howToPlay: 'Rules & Twists',
    openTodayCase: "Open Today's Case",
    browseContents: 'Table of Contents',
    tableOfContents: 'Contents',
    backToCover: 'Cover',
    prevSpread: 'Previous',
    nextSpread: 'Next',
    pageLabel: 'Page',
    suspectsTab: 'Suspects',
    mapTab: 'Map & Grid',
    pencilDock: 'Pencil',
    backOfBook: 'Back of Book',
    gridAid: 'Grid Aid',
    gridAidTooltip: 'Faintly stencil blocked furniture on the working grid (Book 2/3 style)',
    tapAssist: 'Stamp Grid',
    tapAssistTooltip: 'Tap squares on the torn working grid to stamp ✕ or suspect initials',
    tapGridHint: 'Tap any square below to stamp ✕ or an initial',
    rotateTitle: 'Rotate Your iPad Horizontally',
    rotateBody: 'Murdoku is designed as an open two-page book. Turn your device sideways to read and draw across both pages.',
    fingerDraw: 'Draw with Finger',
    penOnly: 'Apple Pencil Only',
    theMurdererIs: 'The murderer is...',
    accuseTitle: 'Submit Your Verdict',
    accuseSubtitle: 'Check your deduction without spoiling the grid.',
    selectMurderer: 'Who is the murderer?',
    selectOutlaw: 'Who is the Outlaw?',
    selectUninvolved: 'Who was uninvolved (alibi)?',
    selectPatch: 'Which map fragment completes the scene?',
    selectLiar: 'Who was lying?',
    selectTimeSwap: 'Which 2 suspects swapped places across time?',
    selectRoleHolder: 'Who holds this secret identity:',
    secretRolesHeading: 'Secret Identities Dossier',
    occupancyCan: 'Can occupy',
    occupancyCannot: 'Blocked',
    volAll: 'All',
    vol1Label: 'Vol. 1',
    vol2Label: 'Vol. 2 · Time',
    vol3Label: 'Vol. 3 · World',
    verifyVerdict: 'Check Verdict',
    verdictCorrectTitle: 'Case Closed!',
    verdictCorrectBody: 'Your deduction is spot-on. You caught the culprit!',
    verdictWrongTitle: 'Not quite...',
    verdictWrongBody: 'Double-check your clues and working grid, or peek at the next hint in the Back of Book.',
    tryAgain: 'Keep Investigating',
    viewSolution: 'Open Back of Book',
    nextCase: 'Next Case',
    solvedStamp: 'SOLVED',
    todayBadge: 'TODAY',
    dailyArchiveTitle: 'Daily Cases Archive',
    dailyLoading: "Typesetting today's case...",
    dailyNotice: 'One fresh mystery is printed every day and archived in this volume.',
    hintsTab: 'Step-by-Step Hints',
    solutionTab: 'Official Solution',
    revealNextHint: 'Reveal Next Deduction',
    allHintsRevealed: 'All deduction steps revealed.',
    noHintsYet: 'Stuck? Reveal one logical deduction at a time without spoiling the whole grid.',
    officialGrid: 'Official Solved Grid',
    yourGridInk: 'Your Working Grid',
    completeProof: 'Complete Deduction Proof',
    clearPageLeft: 'Clear Left',
    clearPageRight: 'Clear Right',
    clearSpread: 'Clear Both Pages',
    undo: 'Undo',
    redo: 'Redo',
    toolPencil: 'Pencil',
    toolPen: 'Fine Pen',
    toolHighlighter: 'Highlighter',
    toolEraser: 'Eraser',
    close: 'Close',
    moreOptions: 'More Options',
    autoMinimize: 'Auto-Minimize',
    pencilDetectedLabel: 'Apple Pencil Active',
    pencilReadyLabel: 'Apple Pencil Ready',
    strokeWidthLabel: 'Stroke Width',
    gesturesHint: '2-finger tap: Undo · 3-finger tap: Redo',
    missingPatchesLabel: 'Choose the missing map fragment:',
    difficultyLabels: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      expert: 'Expert',
    },
    twistBadges: {
      classic: 'Classic',
      outlaw: 'Vol. 2 · Outlaw',
      uninvolved: 'Vol. 3 · Alibi',
      missing_piece: 'Vol. 3 · Torn Map',
      liar: 'Vol. 2/3 · Liar',
      time_travel: 'Vol. 2 · Time Travel',
      split_grids: 'Vol. 3 · Split Grids',
      secret_identities: 'Vol. 3 · Secret Roles',
    },
    rulesTitle: 'How to Solve a Murdoku',
    rulesSubtitle: 'Every puzzle has one unique logical solution — no guessing required.',
    coreRulesHeading: 'Core Rules',
    coreRulesList: [
      'Every row and every column contains exactly one person.',
      'No one can stand on blocking furniture (tables, shelves, TVs, plants), but suspects CAN occupy chairs, beds, carpets, and flowers.',
      '"Beside" always means orthogonally adjacent (up, down, left, or right — never diagonal) AND inside the same room (never across a thick black wall).',
      'North, South, East, and West refer to anywhere strictly higher, lower, right, or left on the grid — not necessarily the same column or row.',
      'Rooms may contain 0, 1, 2, or more people — EXCEPT the Victim’s room, which always holds exactly 2 people: the Victim and the Murderer.',
    ],
    twistsHeading: 'Book 2 & Book 3 Chapter Twists',
    twistExplanations: [
      {
        badge: 'OUTLAW',
        title: 'The Hidden Outlaw',
        body: 'One suspect (never the Victim) is secretly an Outlaw who obeys a public condition printed at the top of the case. Other clues reference the Outlaw.',
      },
      {
        badge: 'ALIBI',
        title: 'The Uninvolved Suspect',
        body: 'There is one extra suspect card! One person was never at the crime scene at all and must be ruled out through contradictions.',
      },
      {
        badge: 'TORN MAP',
        title: 'Missing Map Fragment',
        body: 'A section of the crime scene map is missing. Four candidate patches (A–D) are printed — only one yields a valid unique solution.',
      },
      {
        badge: 'LIAR',
        title: 'The Liar',
        body: 'Exactly one suspect (never the Victim) is lying — their entire statement is false, while everyone else tells the truth.',
      },
    ],
    pencilTipsHeading: 'Apple Pencil & iPad Tips',
    pencilTipsBody:
      'Draw freely anywhere across both pages with Apple Pencil — resting your palm is ignored automatically. Double-tap the Pencil tip quickly on the page (or press E) to flip between your tool and the Eraser, and use 2-finger / 3-finger tap for Undo / Redo. Without a pencil, enable Stamp Grid to tap working-grid squares.',
  },
  pt: {
    appTitle: 'MURDOKU',
    appSubtitle: 'Puzzles de Lógica e Mistério',
    dailyVolume: 'Volume Diário',
    starterVolume: 'Antologia Inicial',
    howToPlay: 'Regras e Variantes',
    openTodayCase: 'Abrir Caso de Hoje',
    browseContents: 'Índice do Livro',
    tableOfContents: 'Índice',
    backToCover: 'Capa',
    prevSpread: 'Anterior',
    nextSpread: 'Seguinte',
    pageLabel: 'Página',
    suspectsTab: 'Suspeitos',
    mapTab: 'Planta e Grelha',
    pencilDock: 'Lápis',
    backOfBook: 'Soluções',
    gridAid: 'Ajuda Grelha',
    gridAidTooltip: 'Mostrar silhuetas suaves dos obstáculos na grelha de rascunho (estilo Livro 2/3)',
    tapAssist: 'Marcar Grelha',
    tapAssistTooltip: 'Toca nos quadrados da grelha de rascunho para marcar ✕ ou iniciais',
    tapGridHint: 'Toca num quadrado abaixo para marcar ✕ ou uma inicial',
    rotateTitle: 'Roda o iPad na Horizontal',
    rotateBody: 'O Murdoku foi desenhado como um livro aberto de duas páginas. Roda o ecrã na horizontal para jogar.',
    fingerDraw: 'Desenhar c/ Dedo',
    penOnly: 'Só Apple Pencil',
    theMurdererIs: 'O assassino é...',
    accuseTitle: 'Apresentar Veredicto',
    accuseSubtitle: 'Confirma a tua dedução sem revelar a grelha.',
    selectMurderer: 'Quem é o assassino?',
    selectOutlaw: 'Quem é o Fora-da-Lei?',
    selectUninvolved: 'Quem tem álibi (não esteve no local)?',
    selectPatch: 'Qual o fragmento que completa a planta?',
    selectLiar: 'Quem estava a mentir?',
    selectTimeSwap: 'Quais os 2 suspeitos que trocaram no tempo?',
    selectRoleHolder: 'Quem tem esta identidade secreta:',
    secretRolesHeading: 'Dossier de Identidades Secretas',
    occupancyCan: 'Ocupável',
    occupancyCannot: 'Bloqueado',
    volAll: 'Todos',
    vol1Label: 'Vol. 1',
    vol2Label: 'Vol. 2 · Tempo',
    vol3Label: 'Vol. 3 · Mundo',
    verifyVerdict: 'Verificar Veredicto',
    verdictCorrectTitle: 'Caso Encerrado!',
    verdictCorrectBody: 'Dedução impecável. Apanhaste o culpado!',
    verdictWrongTitle: 'Ainda não...',
    verdictWrongBody: 'Revê as pistas e a grelha de rascunho, ou espreita a próxima pista nas Soluções.',
    tryAgain: 'Continuar a Investigar',
    viewSolution: 'Abrir Soluções',
    nextCase: 'Caso Seguinte',
    solvedStamp: 'RESOLVIDO',
    todayBadge: 'HOJE',
    dailyArchiveTitle: 'Arquivo de Casos Diários',
    dailyLoading: 'A imprimir o caso de hoje...',
    dailyNotice: 'Um novo mistério é publicado todos os dias e arquivado neste volume.',
    hintsTab: 'Pistas Passo-a-Passo',
    solutionTab: 'Solução Oficial',
    revealNextHint: 'Revelar Próxima Dedução',
    allHintsRevealed: 'Todas as deduções reveladas.',
    noHintsYet: 'Bloqueado? Revela uma dedução lógica de cada vez sem estragar a grelha inteira.',
    officialGrid: 'Grelha Oficial Resolvida',
    yourGridInk: 'A Tua Grelha',
    completeProof: 'Demonstração Completa',
    clearPageLeft: 'Limpar Esq.',
    clearPageRight: 'Limpar Dir.',
    clearSpread: 'Limpar Ambas',
    undo: 'Desfazer',
    redo: 'Refazer',
    toolPencil: 'Lápis',
    toolPen: 'Caneta',
    toolHighlighter: 'Marcador',
    toolEraser: 'Borracha',
    close: 'Fechar',
    moreOptions: 'Mais Opções',
    autoMinimize: 'Minimizar Auto.',
    pencilDetectedLabel: 'Apple Pencil Ativo',
    pencilReadyLabel: 'Apple Pencil Pronto',
    strokeWidthLabel: 'Espessura',
    gesturesHint: '2 dedos: Desfazer · 3 dedos: Refazer',
    missingPatchesLabel: 'Escolhe o fragmento em falta:',
    difficultyLabels: {
      easy: 'Fácil',
      medium: 'Médio',
      hard: 'Difícil',
      expert: 'Perito',
    },
    twistBadges: {
      classic: 'Clássico',
      outlaw: 'Vol. 2 · Fora-da-Lei',
      uninvolved: 'Vol. 3 · Álibi',
      missing_piece: 'Vol. 3 · Planta Rasgada',
      liar: 'Vol. 2/3 · Mentiroso',
      time_travel: 'Vol. 2 · Viagem no Tempo',
      split_grids: 'Vol. 3 · Grelhas Separadas',
      secret_identities: 'Vol. 3 · Identidades Secretas',
    },
    rulesTitle: 'Como Resolver um Murdoku',
    rulesSubtitle: 'Cada puzzle tem uma única solução lógica — nunca precisas de adivinhar.',
    coreRulesHeading: 'Regras Base',
    coreRulesList: [
      'Cada linha e cada coluna contém exatamente uma pessoa.',
      'Ninguém pode ocupar mobiliário sólido (mesas, estantes, TVs, plantas), mas os suspeitos PODEM ocupar cadeiras, camas, tapetes e flores.',
      '"Ao lado de" significa sempre ortogonalmente adjacente (cima, baixo, esquerda ou direita — nunca diagonal) E na mesma divisão (nunca através de uma parede preta).',
      'Norte, Sul, Este e Oeste referem-se a qualquer ponto estritamente acima, abaixo, à direita ou à esquerda na grelha — não necessariamente na mesma linha ou coluna.',
      'Uma divisão pode ter 0, 1, 2 ou mais pessoas — EXCETO a divisão da Vítima, que tem sempre exatamente 2 pessoas: a Vítima e o Assassino.',
    ],
    twistsHeading: 'Variantes dos Livros 2 e 3',
    twistExplanations: [
      {
        badge: 'FORA-DA-LEI',
        title: 'O Fora-da-Lei Oculto',
        body: 'Um suspeito (nunca a Vítima) é secretamente o Fora-da-Lei e cumpre a condição impressa no topo da página. Outras pistas fazem referência ao Fora-da-Lei.',
      },
      {
        badge: 'ÁLIBI',
        title: 'O Suspeito com Álibi',
        body: 'Há uma carta de suspeito a mais! Uma pessoa não esteve no local do crime e deve ser descartada por contradição.',
      },
      {
        badge: 'PLANTA RASGADA',
        title: 'Fragmento em Falta',
        body: 'Falta um pedaço da planta do crime. Quatro fragmentos candidatos (A–D) estão impressos — apenas um permite uma solução única válida.',
      },
      {
        badge: 'MENTIROSO',
        title: 'O Mentiroso',
        body: 'Exatamente um suspeito (nunca a Vítima) está a mentir — toda a sua declaração é falsa, enquanto os restantes dizem a verdade.',
      },
    ],
    pencilTipsHeading: 'Dicas de Apple Pencil e iPad',
    pencilTipsBody:
      'Desenha livremente nas duas páginas com o Apple Pencil — a palma da mão é ignorada automaticamente. Dá um duplo toque rápido com a ponta do Pencil na página (ou tecla E) para alternar entre a ferramenta e a Borracha, e toca com 2/3 dedos para Desfazer/Refazer. Sem Pencil, ativa Marcar Grelha para preencher os quadrados por toque.',
  },
};
