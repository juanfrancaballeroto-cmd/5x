const state = {
  minutes: 8 * 60,
  day: 1,
  speed: 5,
  paused: false,
  boostedUntil: 0,
  timeBank: 16,
  money: 2400,
  rest: 62,
  focus: 48,
  lifestyle: 51,
  weather: 'sun',
};

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function addLog(text, type = '') {
  const li = document.createElement('li');
  if (type) li.className = type;
  li.textContent = text;
  $('log').prepend(li);
}

function render() {
  const h = Math.floor(state.minutes / 60) % 24;
  const m = Math.floor(state.minutes % 60);
  $('dayLabel').textContent = `Día ${state.day}`;
  $('timeLabel').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  $('speedLabel').textContent = `${state.speed}x`;
  $('timeBank').textContent = `${Math.max(0, state.timeBank).toFixed(1)}h`;
  $('money').textContent = fmtMoney(state.money);
  $('rest').textContent = Math.round(state.rest);
  $('focus').textContent = Math.round(state.focus);
  $('lifestyle').textContent = Math.round(state.lifestyle);
  $('pauseBtn').textContent = state.paused ? 'Reanudar' : 'Pausar';
  $('rain').classList.toggle('on', state.weather === 'rain');
}

function spend({ hours = 0, money = 0, rest = 0, focus = 0, lifestyle = 0, income = 0, label }) {
  if (state.timeBank < hours) {
    addLog(`No tienes ${hours}h útiles. Puedes esperar o comprar tiempo.`, 'bad');
    return false;
  }
  if (state.money < money) {
    addLog(`No hay presupuesto suficiente para ${label}.`, 'bad');
    return false;
  }
  state.timeBank -= hours;
  state.minutes += hours * 60;
  state.money = state.money - money + income;
  state.rest = clamp(state.rest + rest);
  state.focus = clamp(state.focus + focus);
  state.lifestyle = clamp(state.lifestyle + lifestyle);
  normalizeDay();
  addLog(label, income > 0 ? 'good' : '');
  render();
  return true;
}

function normalizeDay() {
  while (state.minutes >= 24 * 60) {
    state.minutes -= 24 * 60;
    state.day += 1;
    state.timeBank = Math.min(18, state.timeBank + 10);
    state.rest = clamp(state.rest - 5);
    state.focus = clamp(state.focus - 2);
    maybeWeather();
    addLog(`Amanece el día ${state.day}. El mundo no espera.`, 'good');
  }
}

function maybeWeather() {
  const roll = Math.random();
  state.weather = roll > 0.72 ? 'rain' : 'sun';
  if (state.weather === 'rain') {
    state.lifestyle = clamp(state.lifestyle - 2);
    state.focus = clamp(state.focus - 1);
    addLog('Llueve. La luz natural cae y el espacio se siente distinto.');
  } else {
    state.rest = clamp(state.rest + 1);
  }
}

function tick() {
  if (!state.paused) {
    state.minutes += state.speed / 60;
    const hour = Math.floor(state.minutes / 60) % 24;
    if (hour >= 23 || hour < 6) state.rest = clamp(state.rest - 0.006);
    if (hour >= 9 && hour <= 18) state.focus = clamp(state.focus - 0.004);
    normalizeDay();
    render();
  }
}

$('pauseBtn').addEventListener('click', () => {
  state.paused = !state.paused;
  addLog(state.paused ? 'Tiempo pausado para diseñar con calma.' : 'El reloj vuelve a correr a 5x.');
  render();
});

$('boostBtn').addEventListener('click', () => {
  if (state.money < 499) return addLog('Comprar tiempo cuesta $499. Falta presupuesto.', 'bad');
  state.money -= 499;
  state.timeBank += 8;
  addLog('Compras +8h útiles. En 5x, el lujo real es tiempo.', 'good');
  render();
});

$('layerBtn').addEventListener('click', () => {
  $('isoScene').classList.toggle('layers');
  addLog($('isoScene').classList.contains('layers') ? 'Modo capas: estructura, interior y cubierta separados.' : 'Modo vivir: vuelves al espacio habitable.');
});

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'light') spend({ hours: 4, money: 380, rest: 9, lifestyle: 5, label: 'Instalas iluminación cálida. Dormir aquí empieza a tener sentido.' });
    if (action === 'desk') spend({ hours: 7, money: 720, focus: 14, lifestyle: 7, label: 'La mesa Northline cambia la forma de trabajar en casa.' });
    if (action === 'work') spend({ hours: 8, income: 950, rest: -12, focus: -6, label: 'Trabajas fuerte. Entra dinero, sale vida. Decisión válida, no gratis.' });
    if (action === 'sleep') spend({ hours: 9, rest: 24, focus: 6, label: 'Descansas bien. El apartamento no cambia, tú sí.', });
  });
});

addLog('Empiezas en un apartamento bonito, pero imperfecto. El tiempo corre a 5x.');
render();
setInterval(tick, 1000);
