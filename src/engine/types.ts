export type Lang = 'en' | 'pt';

export interface LocalizedText {
  en: string;
  pt: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type TwistKind =
  | 'classic'
  | 'outlaw'
  | 'uninvolved'
  | 'missing_piece'
  | 'liar'
  | 'time_travel'
  | 'split_grids'
  | 'secret_identities';

export type BookEdition = 'vol1' | 'vol2' | 'vol3';

export type CardThemeId =
  | 'classic'
  | 'wild_west'
  | 'pirate'
  | 'egypt'
  | 'medieval'
  | 'stone_age'
  | 'around_world';

export type PaperThemeId =
  | 'lilac'
  | 'cream'
  | 'sage'
  | 'peach'
  | 'powder'
  | 'lavender'
  | 'sand'
  | 'slate';

export type ThemeAccessoryId =
  | 'none'
  | 'lab_goggles'
  | 'lab_mask'
  | 'western_bandana'
  | 'masquerade_mask';

export type Gender = 'male' | 'female';

export interface CharacterProfile {
  id: string; // filename stem e.g. 'ashton'
  name: string; // display name e.g. 'Ashton'
  initial: string; // 'A'..'O', 'V'
  gender: Gender;
  svgPath: string; // '/assets/suspects/suspect_ashton.svg'
}

export interface GridCoord {
  r: number;
  c: number;
}

export interface RoomDef {
  id: string;
  name: LocalizedText;
  texture: string; // e.g. 'squaretile', 'woodentile', etc.
  floorColor: string; // soft pastel tint applied behind texture
  cells: GridCoord[];
  /** Optional sub-grid ID for Volume 3 Split Crime Scenes */
  subGridId?: 'A' | 'B';
  /** Optional override for badge position (defaults to widest bottom wall segment) */
  badgeCell?: GridCoord;
}

export interface MapObject {
  type: string; // verified object key from OBJECT_CATALOG e.g. 'chair', 'table', 'tv', 'shelf', 'carpet'
  r: number;
  c: number;
  /** True if a suspect can occupy this square (e.g. chair, bed, carpet, flowers, or era-overridden horse/boat/car) */
  walkable: boolean;
  /** Optional autotile group id if part of multi-cell table or carpet */
  tileIndex?: string; // '01'..'49'
  /** Optional wall orientation for wall objects like window */
  wall?: 'N' | 'S' | 'E' | 'W';
}

export interface MapPatchOption {
  id: 'A' | 'B' | 'C' | 'D';
  /** Local cells relative to patch origin (originR, originC) */
  objects: MapObject[];
  /** Room assignment for each cell inside the patch (key: "r,c" in global grid coords -> roomId) */
  roomOverrides?: Record<string, string>;
}

export interface MissingPieceTwist {
  kind: 'missing_piece';
  originR: number;
  originC: number;
  height: number;
  width: number;
  patches: MapPatchOption[];
  correctPatchId: 'A' | 'B' | 'C' | 'D';
}

export type OutlawCondition =
  | { kind: 'sitting_in_chair' }
  | { kind: 'beside_object'; objectType: string }
  | { kind: 'alone_in_room' }
  | { kind: 'in_room_corner' }
  | { kind: 'in_row'; row: number }
  | { kind: 'in_col'; col: number };

export interface OutlawTwist {
  kind: 'outlaw';
  condition: OutlawCondition;
  outlawSuspectId: string; // letter initial e.g. 'C'
}

export interface UninvolvedTwist {
  kind: 'uninvolved';
  uninvolvedSuspectId: string; // letter initial e.g. 'D'
}

export interface LiarTwist {
  kind: 'liar';
  mode: 'single_liar';
  liarSuspectId: string; // letter initial (never 'V')
}

/** Volume 2: Time Travel — exact 2 non-victim suspects swapped squares between Past and Present */
export interface TimeTravelTwist {
  kind: 'time_travel';
  swappedPair: [string, string]; // sorted suspect IDs e.g. ['A', 'D']
}

export interface SubGridSpec {
  id: 'A' | 'B';
  name: LocalizedText;
  rows: number;
  cols: number;
  colOffset: number;
}

/** Volume 3: Multiple Grids — 2 independent crime-scene grids with local N-rooks & global suspect pool */
export interface SplitGridsTwist {
  kind: 'split_grids';
  grids: [SubGridSpec, SubGridSpec];
}

export interface SecretRoleDef {
  id: string;
  title: LocalizedText;
  clauses: ClueClause[];
  clueText: LocalizedText;
}

/** Volume 3: Secret Identities — hidden role titles decoupled from suspect names */
export interface SecretIdentitiesTwist {
  kind: 'secret_identities';
  roles: SecretRoleDef[];
  /** Key role verified in VerdictModal alongside the murderer */
  keyRoleId: string;
}

export type TwistConfig =
  | { kind: 'classic' }
  | OutlawTwist
  | UninvolvedTwist
  | MissingPieceTwist
  | LiarTwist
  | TimeTravelTwist
  | SplitGridsTwist
  | SecretIdentitiesTwist;

export type ClueClause =
  | { kind: 'in_room'; roomId: string }
  | { kind: 'not_in_room'; roomId: string }
  | { kind: 'same_room_as'; targetId: string }
  | { kind: 'alone_in_room' }
  | { kind: 'room_occupant_count'; count: number }
  | { kind: 'beside_object'; objectType: string }
  | { kind: 'not_beside_object'; objectType: string }
  | { kind: 'sitting_in_chair' }
  | { kind: 'on_object'; objectType: string }
  | { kind: 'beside_person'; targetId: string }
  | { kind: 'not_beside_person'; targetId: string }
  | { kind: 'north_of'; targetId: string }
  | { kind: 'south_of'; targetId: string }
  | { kind: 'east_of'; targetId: string }
  | { kind: 'west_of'; targetId: string }
  | { kind: 'same_diagonal'; targetId: string }
  | { kind: 'in_row'; row: number }
  | { kind: 'in_col'; col: number }
  | { kind: 'in_room_corner' }
  | { kind: 'not_beside_wall' }
  | { kind: 'only_person_beside'; objectType: string }
  | { kind: 'only_person_sitting' }
  // Outlaw-specific clauses
  | { kind: 'same_room_as_outlaw' }
  | { kind: 'not_same_room_as_outlaw' }
  | { kind: 'north_of_outlaw' }
  | { kind: 'south_of_outlaw' }
  | { kind: 'east_of_outlaw' }
  | { kind: 'west_of_outlaw' }
  | { kind: 'not_the_outlaw' }
  | { kind: 'beside_outlaw' }
  // Volume 2: Time Travel clauses
  | { kind: 'past_in_room'; roomId: string }
  | { kind: 'past_beside_object'; objectType: string }
  | { kind: 'past_same_room_as'; targetId: string }
  | { kind: 'stayed_in_place' }
  | { kind: 'moved_in_time' }
  // Volume 3: Multiple Grids clauses
  | { kind: 'in_subgrid'; gridId: 'A' | 'B' }
  | { kind: 'same_subgrid_as'; targetId: string }
  | { kind: 'different_subgrid_from'; targetId: string }
  // Volume 3: Secret Identities clauses
  | { kind: 'has_role'; roleId: string }
  | { kind: 'not_role'; roleId: string }
  | { kind: 'same_room_as_role'; roleId: string }
  | { kind: 'north_of_role'; roleId: string }
  | { kind: 'south_of_role'; roleId: string }
  | { kind: 'east_of_role'; roleId: string }
  | { kind: 'west_of_role'; roleId: string };

export interface SuspectDef {
  /** Single-letter ID: 'A', 'B', 'C', ... and 'V' for Victim */
  id: string;
  profileId: string;
  name: string;
  gender: Gender;
  svgPath: string;
  cardBg: string; // soft pastel portrait backdrop
  accessory?: ThemeAccessoryId;
  isVictim: boolean;
  clauses: ClueClause[];
  /** Pre-rendered bilingual clue HTML-safe segments */
  clueText: LocalizedText;
}

export interface ProofStep {
  stepNumber: number;
  focusSuspectId?: string;
  focusRoomId?: string;
  text: LocalizedText;
}

export interface CaseSolution {
  /** Map of suspectId -> {r, c} (Present timeline for time_travel; uninvolved suspect omitted) */
  placements: Record<string, GridCoord>;
  murdererId: string;
  victimRoomId: string;
  outlawId?: string;
  uninvolvedId?: string;
  correctPatchId?: 'A' | 'B' | 'C' | 'D';
  liarId?: string;
  /** Volume 2 Time Travel: the 2 suspects who swapped between Past and Present */
  timeSwappedPair?: [string, string];
  pastPlacements?: Record<string, GridCoord>;
  /** Volume 3 Secret Identities: roleId -> suspectId */
  roleAssignment?: Record<string, string>;
}

export interface MurdokuCase {
  id: string;
  number: number; // Case number printed on page (e.g. 9)
  pageLeft: number; // Printed bottom-left page number (e.g. 24)
  pageRight: number; // Printed bottom-right page number (e.g. 25)
  volume: 'starter' | 'daily';
  edition?: BookEdition;
  chapterLabel?: LocalizedText; // e.g. 'Ancient Egypt' / 'Antarctica'
  cardTheme?: CardThemeId;
  /** Volume 2/3 environmental overrides making specific objects walkable (e.g. ['horse'], ['boat'], ['car']) */
  walkableOverrides?: string[];
  date?: string; // YYYY-MM-DD for daily cases
  title: LocalizedText;
  subtitle: LocalizedText;
  difficulty: Difficulty;
  paperTheme: PaperThemeId;
  rows: number;
  cols: number;
  /** Optional void cells outside irregular map silhouettes */
  voidCells?: GridCoord[];
  rooms: RoomDef[];
  objects: MapObject[];
  suspects: SuspectDef[];
  twist: TwistConfig;
  solution: CaseSolution;
  proofSteps: ProofStep[];
  /** Source tag for daily provenance */
  generatedBy?: 'starter' | 'gemini' | 'fallback';
}

export interface CreativeRoomBrief {
  name: LocalizedText;
  texture: string;
  floorColor: string;
  preferredObjects: string[];
}

export interface CreativeBrief {
  title: LocalizedText;
  subtitle: LocalizedText;
  paperTheme: PaperThemeId;
  themeAccessory: ThemeAccessoryId;
  edition?: BookEdition;
  chapterLabel?: LocalizedText;
  cardTheme?: CardThemeId;
  walkableOverrides?: string[];
  subGridNames?: [LocalizedText, LocalizedText];
  rooms: CreativeRoomBrief[];
}
