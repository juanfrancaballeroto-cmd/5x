import { getGameData } from './data/load';
import { runGame } from './sim/bots';

// Hito 1: sin interfaz todavía. Juega una partida limpia sin gráficos y la muestra.
const data = getGameData();
const r = runGame(data, 1, 'limpio');
document.querySelector('#app')!.textContent = `Escalafón: partida de prueba terminada en el mes ${r.months} con final "${r.ending}".`;
