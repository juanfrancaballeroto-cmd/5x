import { z } from 'zod';

export const PARTY_IDS = ['orden', 'progreso'] as const;
export const CAUSE_IDS = ['vivienda', 'impuestos', 'agua', 'empleo', 'sanidad', 'paisaje'] as const;
export const COLLECTIVE_IDS = [
  'inquilinos',
  'propietarios',
  'jovenes',
  'pensionistas',
  'autonomos',
  'turistico',
  'migrantes',
  'ecologistas',
] as const;
export const CHARACTER_IDS = [
  'cunado',
  'jefa_gabinete',
  'concejal_urbanismo',
  'constructor',
  'tesorero',
  'interventora',
] as const;
export const ZONE_IDS = ['urbano', 'rustico', 'vega'] as const;
export const STAT_IDS = [
  'protectedHomes',
  'freeHomes',
  'jobs',
  'irrigatedHa',
  'taxCut',
  'consults',
  'protectedHa',
] as const;
export const CRIME_KINDS = [
  'cohecho',
  'prevaricacion',
  'malversacion',
  'trafico_influencias',
  'blanqueo',
  'falsedad',
  'financiacion_ilegal',
  'fraude_electoral',
] as const;
export const ENDING_IDS = [
  'reeleccion_limpia',
  'reeleccion_rastro',
  'derrota',
  'imputacion',
  'expulsion',
  'cabeza_turco',
  'arrepentido',
] as const;
export const ACTION_IDS = [
  'journalist_collaborate',
  'journalist_bribe',
  'audit',
] as const;

export const PartyId = z.enum(PARTY_IDS);
export const CauseId = z.enum(CAUSE_IDS);
export const CollectiveId = z.enum(COLLECTIVE_IDS);
export const CharacterId = z.enum(CHARACTER_IDS);
export const ZoneId = z.enum(ZONE_IDS);
export const StatId = z.enum(STAT_IDS);
export const CrimeKind = z.enum(CRIME_KINDS);
export const EndingId = z.enum(ENDING_IDS);
export const AdjudicationMode = z.enum(['clean', 'dedo']);

export const EffectsSchema = z
  .object({
    power: z.number(),
    image: z.number(),
    budget: z.number(),
    blackMoney: z.number(),
    suspicion: z.number(),
    compass: z.number(),
    journalist: z.number(),
    fraud: z.number(),
    incomeDelta: z.number(),
    collectives: z.partialRecord(CollectiveId, z.number()),
    legacy: z.partialRecord(CauseId, z.number()),
    loyalty: z.partialRecord(CharacterId, z.number()),
    stats: z.partialRecord(StatId, z.number()),
    flags: z.record(z.string(), z.number()),
    schedule: z.array(z.object({ id: z.string(), delay: z.number().int().min(0) })),
    plotZone: z.object({ plot: z.string(), zone: ZoneId }),
    build: z.object({ plot: z.string(), building: z.string(), mode: AdjudicationMode }),
    delayConstruction: z.object({ building: z.string(), months: z.number().int() }),
    action: z.enum(ACTION_IDS),
    ending: EndingId,
  })
  .partial()
  .strict();
export type Effects = z.infer<typeof EffectsSchema>;

export const CorruptSchema = z
  .object({
    kind: CrimeKind,
    evidence: z.number().int().min(1).max(5),
    visibility: z.number().int().min(1).max(5),
    witnesses: z.array(CharacterId),
  })
  .strict();
export type Corrupt = z.infer<typeof CorruptSchema>;

export const ConfigSchema = z.object({
  time: z.object({
    monthSeconds: z.number().positive(),
    totalMonths: z.number().int().positive(),
    speeds: z.array(z.number().positive()),
    startYear: z.number().int(),
  }),
  start: z.object({
    power: z.number(),
    image: z.number(),
    budget: z.number(),
    blackMoney: z.number(),
    suspicion: z.number(),
    compass: z.number(),
  }),
  economy: z.object({
    baseIncome: z.number(),
    baseExpense: z.number(),
    debtImagePenalty: z.number(),
    debtPowerPenalty: z.number(),
  }),
  suspicion: z.object({
    monthlyDecay: z.number(),
    blackMoneyPerPoint: z.number().positive(),
    visibilityMultiplier: z.number(),
    max: z.number(),
  }),
  image: z.object({
    inertia: z.number().min(0).max(1),
    suspicionPenalty: z.number(),
    collectiveScale: z.number(),
  }),
  power: z.object({
    imageFactor: z.number(),
    suspicionThreshold: z.number(),
    suspicionFactor: z.number(),
    decreeToggleCost: z.number(),
  }),
  compass: z.object({ perCorruptAct: z.number(), tiers: z.array(z.number()).length(4) }),
  collectives: z.object({ neutral: z.number(), reversion: z.number(), min: z.number(), max: z.number() }),
  loyalty: z.object({
    leakBelow: z.number(),
    shieldAbove: z.number(),
    leakChance: z.number().min(0).max(1),
    leakSuspicionPerEvidence: z.number(),
    leakImagePerEvidence: z.number(),
    leakInterestPerEvidence: z.number(),
    honestWitnessPenalty: z.number(),
    shieldSuspicionAfter: z.number(),
  }),
  adjudication: z.object({
    clean: z.object({ costMult: z.number(), timeMult: z.number() }),
    dedo: z.object({
      costMult: z.number(),
      timeMult: z.number(),
      commission: z.number(),
      evidence: z.number().int(),
      visibility: z.number().int(),
      witnesses: z.array(CharacterId),
    }),
  }),
  launder: z.object({
    chunk: z.number().positive(),
    fee: z.number().min(0).max(1),
    evidence: z.number().int(),
    visibility: z.number().int(),
    witnesses: z.array(CharacterId),
  }),
  blackActions: z.object({
    fundParty: z.object({
      cost: z.number(),
      power: z.number(),
      evidence: z.number().int(),
      visibility: z.number().int(),
      witnesses: z.array(CharacterId),
    }),
    bonus: z.object({ cost: z.number(), loyalty: z.number(), evidence: z.number().int(), visibility: z.number().int() }),
    campaign: z.object({
      cost: z.number(),
      image: z.number(),
      evidence: z.number().int(),
      visibility: z.number().int(),
      witnesses: z.array(CharacterId),
    }),
  }),
  expedientes: z.object({ minGap: z.number().int().min(1), maxGap: z.number().int().min(1), firstMonth: z.number().int() }),
  journalist: z.object({
    perVisibility: z.number(),
    maxMonthlyGain: z.number(),
    decay: z.number(),
    memoryMonths: z.number().int().positive(),
    stages: z.array(z.number()).length(3),
    silenceMonths: z.number().int(),
  }),
  events: z.object({ monthlyChance: z.number().min(0).max(1), minGap: z.number().int() }),
  election: z.object({
    imageWeight: z.number(),
    collectiveWeight: z.number(),
    suspicionPenalty: z.number(),
    noise: z.number(),
    threshold: z.number(),
    fraudDiscoveryPerPoint: z.number(),
  }),
  scapegoat: z.object({ suspicion: z.number(), power: z.number(), chance: z.number() }),
  debt: z.object({ allowBuildBelow: z.number() }),
});
export type Config = z.infer<typeof ConfigSchema>;

export const CollectiveSchema = z.object({
  id: CollectiveId,
  weight: z.number().positive(),
  color: z.string(),
  start: z.object({ orden: z.number().min(0).max(10), progreso: z.number().min(0).max(10) }),
});

export const CauseSchema = z.object({ id: CauseId, goal: z.number().positive(), stat: StatId });

export const CharacterSchema = z.object({
  id: CharacterId,
  loyalty: z.number().min(0).max(10),
  honest: z.boolean(),
});

export const BuildingSchema = z.object({
  id: z.string(),
  zones: z.array(ZoneId).min(1),
  cost: z.number(),
  months: z.number().int().positive(),
  height: z.number().positive(),
  monthly: EffectsSchema,
  complete: EffectsSchema,
});
export type BuildingDef = z.infer<typeof BuildingSchema>;

export const DecreeSchema = z.object({ id: z.string(), monthly: EffectsSchema });
export type DecreeDef = z.infer<typeof DecreeSchema>;

export const EventSchema = z.object({
  id: z.string(),
  duration: z.number().int().positive(),
  weight: z.number().positive(),
  minMonth: z.number().int(),
  card: z.string().optional(),
  onStart: EffectsSchema,
  monthly: EffectsSchema,
});
export type EventDef = z.infer<typeof EventSchema>;

export const ConditionSchema = z
  .object({
    minMonth: z.number().int(),
    maxMonth: z.number().int(),
    cause: CauseId,
    party: PartyId,
    flags: z.record(z.string(), z.number()),
    notFlags: z.array(z.string()),
    building: z.object({ id: z.string(), status: z.enum(['built', 'building', 'any']) }),
    decree: z.string(),
    minSuspicion: z.number(),
    maxSuspicion: z.number(),
    minTrail: z.number().int(),
    minBlackMoney: z.number(),
    minBudget: z.number(),
    anyConstruction: z.boolean(),
  })
  .partial()
  .strict();
export type Condition = z.infer<typeof ConditionSchema>;

export const OptionSchema = z
  .object({
    id: z.string(),
    requires: z.object({ budget: z.number(), blackMoney: z.number() }).partial().optional(),
    effects: EffectsSchema,
    hidden: EffectsSchema.optional(),
    corrupt: CorruptSchema.optional(),
  })
  .strict();
export type OptionDef = z.infer<typeof OptionSchema>;

export const ExpedienteSchema = z
  .object({
    id: z.string(),
    weight: z.number().positive().default(1),
    repeatable: z.boolean().default(false),
    chainOnly: z.boolean().default(false),
    when: ConditionSchema.default({}),
    onShow: EffectsSchema.optional(),
    options: z.array(OptionSchema).min(2).max(4),
  })
  .strict();
export type ExpedienteDef = z.infer<typeof ExpedienteSchema>;

export const TileKind = z.enum(['grass', 'field', 'river', 'bridge', 'road', 'house', 'townhall', 'church', 'plaza']);
export const MapSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tiles: z.array(z.string()),
  legend: z.record(z.string(), z.object({ kind: TileKind, height: z.number().min(0) })),
  plots: z.array(
    z.object({
      id: z.string(),
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      w: z.number().int().positive(),
      h: z.number().int().positive(),
      zone: ZoneId,
    }),
  ),
});
export type MapDef = z.infer<typeof MapSchema>;
export type PlotDef = MapDef['plots'][number];

export const PartySchema = z.object({ id: PartyId, color: z.string() });
