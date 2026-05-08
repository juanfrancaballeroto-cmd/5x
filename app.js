import * as THREE from 'three';

const state = {
  day: 1,
  minutes: 8 * 60,
  speed: 5,
  paused: false,
  timeBank: 16,
  money: 2400,
  rest: 62,
  focus: 48,
  social: 35,
  family: 0,
  weather: 'sun',
  hasNursery: false,
};

const el = (id) => document.getElementById(id);
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const money = (v) => `$${Math.round(v).toLocaleString('en-US')}`;

function log(text, cls = '') {
  const li = document.createElement('li');
  li.textContent = text;
  if (cls) li.className = cls;
  el('log').prepend(li);
}

function renderHud() {
  const h = Math.floor(state.minutes / 60) % 24;
  const m = Math.floor(state.minutes % 60);
  el('day').textContent = `Día ${state.day}`;
  el('clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  el('speed').textContent = state.speed;
  el('timeBank').textContent = `${state.timeBank.toFixed(1)}h`;
  el('money').textContent = money(state.money);
  el('rest').textContent = Math.round(state.rest);
  el('focus').textContent = Math.round(state.focus);
  el('social').textContent = Math.round(state.social);
  el('family').textContent = state.family;
  el('pauseBtn').textContent = state.paused ? 'Reanudar' : 'Pausar';
}

const wrap = el('canvasWrap');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f1eb);
scene.fog = new THREE.Fog(0xf4f1eb, 18, 34);

const camera = new THREE.OrthographicCamera(-8, 8, 5.4, -5.4, .1, 100);
camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xffffff, 0xc9b99e, 2.1);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 3.1);
sun.position.set(-5, 9, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const mat = {
  floor: new THREE.MeshStandardMaterial({ color: 0xd8c7ad, roughness: .78 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xeee9df, roughness: .86 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x20201d, roughness: .6 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff6a21, roughness: .45, emissive: 0x331000 }),
  marble: new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: .38, metalness: .02 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xb99a72, roughness: .65 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xded7cb, roughness: .9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xd9e8ef, roughness: .1, transmission: .35, transparent: true, opacity: .48 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x7f9275, roughness: .72 }),
  child: new THREE.MeshStandardMaterial({ color: 0xf1cdb5, roughness: .7 }),
};

function box(name, size, pos, material, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function cyl(name, radius, height, pos, material, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

box('floor', [10.5, .18, 7.2], [0, -.1, 0], mat.floor, false);
box('back wall', [10.5, 2.8, .18], [0, 1.28, -3.55], mat.wall, false);
box('side wall', [.18, 2.8, 7.2], [-5.25, 1.28, 0], mat.wall, false);
box('window', [2.8, 1.3, .08], [-2.2, 1.55, -3.65], mat.glass, false);
box('kitchen block', [2.2, .9, .72], [3.55, .38, -2.65], mat.marble);
box('kitchen tower', [.8, 1.9, .72], [4.25, .86, -1.55], mat.wall);
box('island', [2.6, .55, .95], [1.05, .35, -1.05], mat.marble);
box('table', [1.85, .18, 1.0], [-1.25, .55, 1.05], mat.wood);
for (const [x, z] of [[-2.45, 1.05], [-.05, 1.05], [-1.25, -.05], [-1.25, 2.15]]) {
  cyl('chair', .27, .42, [x, .22, z], mat.fabric, 18);
}
box('sofa', [2.35, .55, .88], [2.55, .38, 1.82], mat.fabric);
box('rug', [3.2, .04, 1.8], [2.35, .02, 1.65], new THREE.MeshStandardMaterial({ color: 0xc8b8a2, roughness: .95 }), false);
cyl('lamp accent', .16, 1.25, [-4.15, .65, -.9], mat.orange, 24);
cyl('plant pot', .22, .32, [-4.35, .16, 2.55], mat.ink, 24);
cyl('plant', .36, .75, [-4.35, .72, 2.55], mat.plant, 7);

const workstation = box('workstation ghost', [1.6, .18, .72], [3.5, .58, -.05], new THREE.MeshStandardMaterial({ color: 0x20201d, transparent: true, opacity: .18 }));
workstation.visible = false;
const nursery = box('nursery ghost', [1.7, .42, 1.15], [-3.65, .26, 2.1], new THREE.MeshStandardMaterial({ color: 0xff6a21, transparent: true, opacity: .18 }));
nursery.visible = false;

function makePerson(color = 0x20201d, scale = 1, name = 'person') {
  const group = new THREE.Group();
  group.name = name;
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: .65 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8a17e, roughness: .75 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.18 * scale, .55 * scale, 8, 16), bodyMat);
  body.position.y = .55 * scale;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.18 * scale, 20, 20), skinMat);
  head.position.y = 1.05 * scale;
  const marker = new THREE.Mesh(new THREE.TorusGeometry(.32 * scale, .025 * scale, 20, 48), mat.orange);
  marker.rotation.x = Math.PI / 2;
  marker.position.y = .025;
  group.add(body, head, marker);
  group.castShadow = true;
  scene.add(group);
  return group;
}

const player = makePerson(0x20201d, 1, 'you');
player.position.set(-.5, .03, 1.9);
const people = [player];
const waypoints = [
  new THREE.Vector3(-.5, .03, 1.9),
  new THREE.Vector3(-1.2, .03, .75),
  new THREE.Vector3(1.1, .03, -1.25),
  new THREE.Vector3(3.0, .03, 1.45),
  new THREE.Vector3(-4.0, .03, 2.35),
  new THREE.Vector3(3.6, .03, -.2),
];
let waypointIndex = 1;

const rain = new THREE.Group();
for (let i = 0; i < 90; i++) {
  const drop = new THREE.Mesh(new THREE.BoxGeometry(.015, .45, .015), new THREE.MeshBasicMaterial({ color: 0x8ba6b7, transparent: true, opacity: .42 }));
  drop.position.set(THREE.MathUtils.randFloatSpread(11), THREE.MathUtils.randFloat(2.2, 6), THREE.MathUtils.randFloatSpread(7.4));
  drop.rotation.z = .35;
  rain.add(drop);
}
rain.visible = false;
scene.add(rain);

function resize() {
  const { clientWidth, clientHeight } = wrap;
  renderer.setSize(clientWidth, clientHeight, false);
  const aspect = clientWidth / Math.max(clientHeight, 1);
  camera.left = -7.2 * aspect;
  camera.right = 7.2 * aspect;
  camera.top = 5.2;
  camera.bottom = -5.2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function spend({ hours = 0, cost = 0, income = 0, rest = 0, focus = 0, social = 0, label, ok = true }) {
  if (state.timeBank < hours) return log(`Faltan horas útiles para: ${label}`, 'bad');
  if (state.money < cost) return log(`No hay presupuesto para: ${label}`, 'bad');
  state.timeBank -= hours;
  state.money = state.money - cost + income;
  state.rest = clamp(state.rest + rest);
  state.focus = clamp(state.focus + focus);
  state.social = clamp(state.social + social);
  state.minutes += hours * 60;
  normalizeDay();
  log(label, ok ? 'good' : '');
  renderHud();
}

function normalizeDay() {
  while (state.minutes >= 1440) {
    state.minutes -= 1440;
    state.day += 1;
    state.timeBank = Math.min(18, state.timeBank + 10);
    state.rest = clamp(state.rest - 5 - state.family * 1.5);
    state.focus = clamp(state.focus - 2);
    if (state.family > 0 && !state.hasNursery) log('El niño necesita espacio propio. La casa empieza a quedarse corta.', 'bad');
    state.weather = Math.random() > .72 ? 'rain' : 'sun';
    rain.visible = state.weather === 'rain';
    if (rain.visible) log('Llueve: baja la luz natural, sube el valor del confort interior.');
    log(`Día ${state.day}. El tiempo no negocia.`, 'good');
  }
}

el('pauseBtn').onclick = () => { state.paused = !state.paused; log(state.paused ? 'Pausas para pensar el diseño.' : 'El tiempo vuelve a correr a 5x.'); renderHud(); };
el('boostBtn').onclick = () => {
  if (state.money < 499) return log('Comprar tiempo cuesta $499.', 'bad');
  state.money -= 499;
  state.timeBank += 8;
  log('Compras +8h útiles. 5x vende tiempo, no monedas.', 'good');
  renderHud();
};
el('inviteBtn').onclick = () => spend({ hours: 3, cost: 120, social: 12, rest: -3, label: 'Invitas a un amigo. El salón importa más de lo que parecía.' });
el('partnerBtn').onclick = () => {
  if (people.length < 2) {
    const partner = makePerson(0x70685f, .96, 'partner');
    partner.position.set(2.8, .03, 1.35);
    people.push(partner);
  }
  state.family = Math.max(state.family, 1);
  spend({ hours: 6, cost: 320, social: 10, rest: -4, label: 'Empiezas a vivir en pareja. El espacio ya no es solo tuyo.' });
};
el('childBtn').onclick = () => {
  if (state.family < 2) {
    const child = makePerson(0xff6a21, .62, 'child');
    child.position.set(-3.6, .03, 2.2);
    people.push(child);
  }
  state.family = Math.max(state.family, 2);
  spend({ hours: 10, cost: 650, social: 6, rest: -18, focus: -8, label: 'Llega un hijo. Nace una vida nueva y una lista brutal de necesidades.', ok: false });
};

document.querySelectorAll('[data-action]').forEach((button) => {
  button.onclick = () => {
    const action = button.dataset.action;
    if (action === 'light') spend({ hours: 4, cost: 380, rest: 10, focus: 2, label: 'Instalas luz cálida regulable. Menos ruido visual, mejor descanso.' });
    if (action === 'workstation') { workstation.visible = true; spend({ hours: 7, cost: 720, focus: 16, label: 'Añades una workstation Northline. El trabajo remoto deja de comerse la casa.' }); }
    if (action === 'social') spend({ hours: 6, cost: 540, social: 18, rest: -2, label: 'La mesa extensible Varo convierte cenar con gente en una posibilidad real.' });
    if (action === 'nursery') { nursery.visible = true; state.hasNursery = true; spend({ hours: 10, cost: 900, rest: 8, social: 4, label: 'Creas una zona infantil modular. La casa aprende a crecer.' }); }
  };
});

const clock = new THREE.Clock();
function animate() {
  const dt = clock.getDelta();
  if (!state.paused) {
    state.minutes += state.speed * dt / 60;
    state.rest = clamp(state.rest - dt * .018 * (1 + state.family * .25));
    state.focus = clamp(state.focus - dt * .01);
    normalizeDay();

    people.forEach((person, idx) => {
      const target = waypoints[(waypointIndex + idx * 2) % waypoints.length];
      const dir = target.clone().sub(person.position);
      if (dir.length() < .08 && idx === 0) waypointIndex = (waypointIndex + 1) % waypoints.length;
      if (dir.length() > .02) {
        dir.normalize();
        person.position.addScaledVector(dir, dt * (.85 - idx * .08));
        person.lookAt(person.position.x + dir.x, person.position.y, person.position.z + dir.z);
      }
      person.children[0].scale.y = 1 + Math.sin(clock.elapsedTime * 8 + idx) * .025;
    });

    rain.children.forEach((drop) => {
      drop.position.y -= dt * 5.5;
      if (drop.position.y < .1) drop.position.y = THREE.MathUtils.randFloat(3, 6);
    });
  }

  const hour = (state.minutes / 60) % 24;
  const warm = hour < 7 || hour > 18;
  sun.intensity = state.weather === 'rain' ? 1.15 : warm ? 2.2 : 3.1;
  ambient.intensity = state.weather === 'rain' ? 1.35 : 2.1;

  renderHud();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

log('Prototipo 3D iniciado. Ahora la casa no está quieta: alguien vive dentro.', 'good');
renderHud();
animate();
