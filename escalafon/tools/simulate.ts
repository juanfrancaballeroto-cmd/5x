/**
 * Headless balance check: plays N games per strategy and reports the distribution of endings.
 *   npm run simulate                 → 1000 games per strategy
 *   npm run simulate -- --games 200  → quicker pass
 *   npm run simulate -- --json       → machine-readable output
 */
import { getGameData } from '../src/data/load';
import { runGame, STRATEGIES, type GameResult, type StrategyId } from '../src/sim/bots';
import { ENDING_IDS } from '../src/data/schemas';

const args = process.argv.slice(2);
const games = Number(args[args.indexOf('--games') + 1]) || 1000;
const asJson = args.includes('--json');
const data = getGameData();

const WIN = new Set(['reeleccion_limpia', 'reeleccion_rastro']);

interface Summary {
  strategy: StrategyId;
  games: number;
  endings: Record<string, number>;
  winRate: number;
  indictRate: number;
  avgMonths: number;
  avgMinutesX1: number;
  avgLegacy: number;
  avgCrimes: number;
  avgVote: number;
  avgDecisions: number;
  avgBuildings: number;
  avgImage: number;
  avgSuspicion: number;
  avgCollectives: number;
  avgPower: number;
}

function summarize(strategy: StrategyId, results: GameResult[]): Summary {
  const endings = Object.fromEntries(ENDING_IDS.map((e) => [e, 0])) as Record<string, number>;
  for (const r of results) endings[r.ending]++;
  const avg = (f: (r: GameResult) => number) => results.reduce((s, r) => s + f(r), 0) / results.length;
  const voted = results.filter((r) => r.votePct !== null);
  const avgMonths = avg((r) => r.months);
  return {
    strategy,
    games: results.length,
    endings,
    winRate: results.filter((r) => WIN.has(r.ending)).length / results.length,
    indictRate: endings.imputacion / results.length,
    avgMonths,
    // Clock time plus ~25 s of reading per decision: the honest estimate of a real session.
    avgMinutesX1: (avgMonths * data.config.time.monthSeconds + avg((r) => r.decisions) * 25) / 60,
    avgLegacy: avg((r) => r.legacy),
    avgCrimes: avg((r) => r.crimes),
    avgVote: voted.length ? voted.reduce((s, r) => s + (r.votePct ?? 0), 0) / voted.length : 0,
    avgDecisions: avg((r) => r.decisions),
    avgBuildings: avg((r) => r.buildings),
    avgImage: avg((r) => r.image),
    avgSuspicion: avg((r) => r.suspicion),
    avgCollectives: avg((r) => r.collectives),
    avgPower: avg((r) => r.power),
  };
}

const t0 = Date.now();
const summaries = STRATEGIES.map((s) => {
  const results: GameResult[] = [];
  for (let i = 0; i < games; i++) results.push(runGame(data, 1000 + i, s));
  return summarize(s, results);
});
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

const by = Object.fromEntries(summaries.map((s) => [s.strategy, s])) as Record<StrategyId, Summary>;
const checks = [
  { name: 'Limpio gana ≥ 25%', ok: by.limpio.winRate >= 0.25, value: by.limpio.winRate },
  { name: 'Corrupto total imputado > 50%', ok: by.corrupto.indictRate > 0.5, value: by.corrupto.indictRate },
  {
    name: 'Moderado es el más tentador (más reelecciones)',
    ok: STRATEGIES.every((s) => s === 'moderado' || by.moderado.winRate > by[s].winRate),
    value: by.moderado.winRate,
  },
];

if (asJson) {
  console.log(JSON.stringify({ games, elapsed, summaries, checks }, null, 2));
} else {
  const pct = (x: number) => (x * 100).toFixed(1).padStart(5) + '%';
  console.log(`\nEscalafón · simulación de balance · ${games} partidas por estrategia (${elapsed}s)\n`);
  const header = ['final'.padEnd(20), ...STRATEGIES.map((s) => s.padStart(10))].join('');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const e of ENDING_IDS)
    console.log([e.padEnd(20), ...summaries.map((s) => pct(s.endings[e] / s.games).padStart(10))].join(''));
  console.log('-'.repeat(header.length));
  const row = (label: string, f: (s: Summary) => string) =>
    console.log([label.padEnd(20), ...summaries.map((s) => f(s).padStart(10))].join(''));
  row('reelección total', (s) => pct(s.winRate));
  row('meses (media)', (s) => s.avgMonths.toFixed(1));
  row('min reales x1 (est)', (s) => s.avgMinutesX1.toFixed(1));
  row('decisiones', (s) => s.avgDecisions.toFixed(1));
  row('legado (media)', (s) => s.avgLegacy.toFixed(0));
  row('delitos (media)', (s) => s.avgCrimes.toFixed(1));
  row('voto % (si hubo)', (s) => s.avgVote.toFixed(1));
  row('obras terminadas', (s) => s.avgBuildings.toFixed(1));
  row('imagen final', (s) => s.avgImage.toFixed(1));
  row('sospecha final', (s) => s.avgSuspicion.toFixed(1));
  row('colectivos final', (s) => s.avgCollectives.toFixed(2));
  row('poder final', (s) => s.avgPower.toFixed(1));
  console.log('\nObjetivos de balance:');
  for (const c of checks) console.log(`  ${c.ok ? '✔' : '✘'} ${c.name} (${pct(c.value).trim()})`);
  console.log('');
}
if (args.includes('--strict') && checks.some((c) => !c.ok)) process.exit(1);
