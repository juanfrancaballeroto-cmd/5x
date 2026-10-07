import { z } from 'zod';
import {
  BuildingSchema,
  CauseSchema,
  CharacterSchema,
  CollectiveSchema,
  ConfigSchema,
  DecreeSchema,
  EventSchema,
  ExpedienteSchema,
  MapSchema,
  PartySchema,
  type Effects,
} from './schemas';

import configJson from '../../data/config.json';
import collectivesJson from '../../data/collectives.json';
import causesJson from '../../data/causes.json';
import charactersJson from '../../data/characters.json';
import buildingsJson from '../../data/buildings.json';
import decreesJson from '../../data/decrees.json';
import eventsJson from '../../data/events.json';
import expedientesJson from '../../data/expedientes.json';
import mapJson from '../../data/map.json';
import partiesJson from '../../data/parties.json';

export const GameDataSchema = z.object({
  config: ConfigSchema,
  collectives: z.array(CollectiveSchema),
  causes: z.array(CauseSchema),
  characters: z.array(CharacterSchema),
  buildings: z.array(BuildingSchema),
  decrees: z.array(DecreeSchema),
  events: z.array(EventSchema),
  expedientes: z.array(ExpedienteSchema),
  map: MapSchema,
  parties: z.array(PartySchema),
});
export type GameData = z.infer<typeof GameDataSchema>;

export const rawGameData = {
  config: configJson,
  collectives: collectivesJson,
  causes: causesJson,
  characters: charactersJson,
  buildings: buildingsJson,
  decrees: decreesJson,
  events: eventsJson,
  expedientes: expedientesJson,
  map: mapJson,
  parties: partiesJson,
};

/** Parses and cross-checks all content. Throws a readable error on the first problem set. */
export function loadGameData(raw: unknown = rawGameData): GameData {
  const data = GameDataSchema.parse(raw);
  const errors = crossValidate(data);
  if (errors.length) throw new Error('Datos inválidos:\n' + errors.join('\n'));
  return data;
}

export function crossValidate(data: GameData): string[] {
  const errors: string[] = [];
  const ids = (xs: { id: string }[], label: string) => {
    const set = new Set<string>();
    for (const x of xs) {
      if (set.has(x.id)) errors.push(`${label}: id duplicado ${x.id}`);
      set.add(x.id);
    }
    return set;
  };
  const buildingIds = ids(data.buildings, 'buildings');
  const expIds = ids(data.expedientes, 'expedientes');
  const decreeIds = ids(data.decrees, 'decrees');
  ids(data.events, 'events');
  const plotIds = ids(data.map.plots, 'plots');
  ids(data.collectives, 'collectives');
  ids(data.causes, 'causes');
  ids(data.characters, 'characters');

  if (data.collectives.length !== 8) errors.push('Se esperan 8 colectivos');
  if (data.causes.length !== 6) errors.push('Se esperan 6 causas');
  if (data.buildings.length !== 10) errors.push('Se esperan 10 edificios');
  if (data.decrees.length !== 6) errors.push('Se esperan 6 decretos');

  const checkEffects = (e: Effects | undefined, where: string) => {
    if (!e) return;
    for (const s of e.schedule ?? []) if (!expIds.has(s.id)) errors.push(`${where}: schedule a expediente inexistente ${s.id}`);
    if (e.build) {
      if (!buildingIds.has(e.build.building)) errors.push(`${where}: edificio inexistente ${e.build.building}`);
      if (!plotIds.has(e.build.plot)) errors.push(`${where}: parcela inexistente ${e.build.plot}`);
    }
    if (e.plotZone && !plotIds.has(e.plotZone.plot)) errors.push(`${where}: parcela inexistente ${e.plotZone.plot}`);
    if (e.delayConstruction && e.delayConstruction.building !== '*' && !buildingIds.has(e.delayConstruction.building))
      errors.push(`${where}: edificio inexistente ${e.delayConstruction.building}`);
  };

  for (const b of data.buildings) {
    checkEffects(b.monthly, `building ${b.id}.monthly`);
    checkEffects(b.complete, `building ${b.id}.complete`);
  }
  for (const d of data.decrees) checkEffects(d.monthly, `decree ${d.id}`);
  for (const ev of data.events) {
    if (ev.card && !expIds.has(ev.card)) errors.push(`event ${ev.id}: carta inexistente ${ev.card}`);
    checkEffects(ev.onStart, `event ${ev.id}.onStart`);
    checkEffects(ev.monthly, `event ${ev.id}.monthly`);
  }
  for (const x of data.expedientes) {
    const optIds = new Set<string>();
    for (const o of x.options) {
      if (optIds.has(o.id)) errors.push(`expediente ${x.id}: opción duplicada ${o.id}`);
      optIds.add(o.id);
      checkEffects(o.effects, `expediente ${x.id}.${o.id}`);
      checkEffects(o.hidden, `expediente ${x.id}.${o.id}.hidden`);
    }
    if (x.when.building && !buildingIds.has(x.when.building.id))
      errors.push(`expediente ${x.id}: condición con edificio inexistente ${x.when.building.id}`);
    if (x.when.decree && !decreeIds.has(x.when.decree)) errors.push(`expediente ${x.id}: decreto inexistente`);
    checkEffects(x.onShow, `expediente ${x.id}.onShow`);
  }

  const { map } = data;
  if (map.tiles.length !== map.height) errors.push('map: número de filas incorrecto');
  map.tiles.forEach((row, y) => {
    if (row.length !== map.width) errors.push(`map: fila ${y} con ancho incorrecto`);
    for (const ch of row) if (!map.legend[ch]) errors.push(`map: carácter sin leyenda '${ch}'`);
  });
  const occupied = new Set<string>();
  for (const p of map.plots) {
    if (p.x + p.w > map.width || p.y + p.h > map.height) errors.push(`plot ${p.id}: fuera del mapa`);
    for (let dx = 0; dx < p.w; dx++)
      for (let dy = 0; dy < p.h; dy++) {
        const key = `${p.x + dx},${p.y + dy}`;
        if (occupied.has(key)) errors.push(`plot ${p.id}: se solapa en ${key}`);
        occupied.add(key);
        const ch = map.tiles[p.y + dy]?.[p.x + dx];
        const kind = ch ? map.legend[ch]?.kind : undefined;
        if (kind && kind !== 'grass' && kind !== 'field') errors.push(`plot ${p.id}: pisa ${kind} en ${key}`);
      }
  }
  return errors;
}

let cached: GameData | null = null;
export function getGameData(): GameData {
  if (!cached) cached = loadGameData();
  return cached;
}
