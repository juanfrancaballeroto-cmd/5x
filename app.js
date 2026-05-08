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
  maquette: true,
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
scene.background = new THREE.Color(0xf8f6f0);
scene.fog = new THREE.Fog(0xf8f6f0, 20, 38);

const camera = new THREE.OrthographicCamera(-8, 8, 5.4, -5.4, .1, 100);
camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
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
  walnut: new THREE.MeshStandardMaterial({ color: 0x6f563f, roughness: .58 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xded7cb, roughness: .9 }),
  linen: new THREE.MeshStandardMaterial({ color: 0xe9e1d4, roughness: .96 }),
  clay: new THREE.MeshStandardMaterial({ color: 0xb88566, roughness: .82 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xd9e8ef, roughness: .1, transmission: .35, transparent: true, opacity: .48 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x7f9275, roughness: .72 }),
  child: new THREE.MeshStandardMaterial({ color: 0xf1cdb5, roughness: .7 }),
};
const outlineMat = new THREE.LineBasicMaterial({ color: 0x27231f, transparent: true, opacity: .18 });

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

function part(geometry, material, pos, rot = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function furnitureGroup(name, pos, rotY = 0, parts = []) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...pos);
  group.rotation.y = rotY;
  parts.forEach((mesh) => group.add(mesh));
  scene.add(group);
  return group;
}

function diningChair(name, pos, rotY = 0) {
  return furnitureGroup(name, pos, rotY, [
    part(new THREE.CylinderGeometry(.24, .26, .16, 20), mat.linen, [0, .34, 0]),
    part(new THREE.BoxGeometry(.48, .08, .08), mat.walnut, [0, .24, .18]),
    part(new THREE.BoxGeometry(.08, .46, .08), mat.walnut, [-.18, .25, -.18]),
    part(new THREE.BoxGeometry(.08, .46, .08), mat.walnut, [.18, .25, -.18]),
    part(new THREE.BoxGeometry(.08, .46, .08), mat.walnut, [-.18, .25, .18]),
    part(new THREE.BoxGeometry(.08, .46, .08), mat.walnut, [.18, .25, .18]),
    part(new THREE.BoxGeometry(.52, .52, .09), mat.linen, [0, .68, -.23], [-.18, 0, 0]),
  ]);
}

function loungeChair(name, pos, rotY = 0) {
  return furnitureGroup(name, pos, rotY, [
    part(new THREE.BoxGeometry(.95, .16, .86), mat.walnut, [0, .32, 0]),
    part(new THREE.BoxGeometry(.88, .24, .78), mat.linen, [0, .46, 0]),
    part(new THREE.BoxGeometry(.92, .24, .14), mat.walnut, [0, .22, -.4]),
    part(new THREE.BoxGeometry(.9, .72, .18), mat.linen, [0, .78, -.45], [-.35, 0, 0]),
    part(new THREE.BoxGeometry(.12, .34, .82), mat.walnut, [-.55, .52, 0]),
    part(new THREE.BoxGeometry(.12, .34, .82), mat.walnut, [.55, .52, 0]),
  ]);
}

function sideboard(name, pos, rotY = 0) {
  return furnitureGroup(name, pos, rotY, [
    part(new THREE.BoxGeometry(2.2, .72, .46), mat.walnut, [0, .38, 0]),
    part(new THREE.BoxGeometry(2.08, .04, .5), mat.marble, [0, .78, 0]),
    part(new THREE.BoxGeometry(.025, .5, .49), mat.ink, [-.35, .39, .01]),
    part(new THREE.BoxGeometry(.025, .5, .49), mat.ink, [.35, .39, .01]),
    part(new THREE.CylinderGeometry(.025, .025, .16, 12), mat.orange, [-.72, .42, .25], [Math.PI / 2, 0, 0]),
  ]);
}

function modularShelves(name, pos, rotY = 0) {
  const parts = [];
  for (let y = 0; y < 3; y++) parts.push(part(new THREE.BoxGeometry(1.55, .06, .34), mat.ink, [0, .32 + y * .45, 0]));
  for (let x of [-.72, 0, .72]) parts.push(part(new THREE.BoxGeometry(.06, 1.0, .34), mat.ink, [x, .77, 0]));
  parts.push(part(new THREE.BoxGeometry(.38, .18, .28), mat.clay, [-.36, .55, 0]));
  parts.push(part(new THREE.BoxGeometry(.46, .18, .28), mat.marble, [.38, 1.0, 0]));
  parts.push(part(new THREE.CylinderGeometry(.12, .12, .2, 18), mat.plant, [.72, .55, 0]));
  return furnitureGroup(name, pos, rotY, parts);
}

function floorLamp(name, pos) {
  return furnitureGroup(name, pos, 0, [
    part(new THREE.CylinderGeometry(.025, .025, 1.25, 16), mat.ink, [0, .62, 0]),
    part(new THREE.CylinderGeometry(.18, .3, .28, 28), mat.orange, [0, 1.34, 0]),
    part(new THREE.CylinderGeometry(.24, .24, .035, 24), mat.ink, [0, .02, 0]),
  ]);
}

function crib(name, pos, rotY = 0) {
  const parts = [
    part(new THREE.BoxGeometry(1.35, .18, .72), mat.linen, [0, .28, 0]),
    part(new THREE.BoxGeometry(1.45, .08, .08), mat.walnut, [0, .62, -.42]),
    part(new THREE.BoxGeometry(1.45, .08, .08), mat.walnut, [0, .62, .42]),
  ];
  for (let x = -.62; x <= .62; x += .31) {
    parts.push(part(new THREE.BoxGeometry(.035, .48, .035), mat.walnut, [x, .43, -.42]));
    parts.push(part(new THREE.BoxGeometry(.035, .48, .035), mat.walnut, [x, .43, .42]));
  }
  return furnitureGroup(name, pos, rotY, parts);
}

function addArchitecturalOutlines(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.noOutline || obj.geometry.type === 'SphereGeometry') return;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(obj.geometry, 24), outlineMat);
    edges.name = 'thin editorial outline';
    obj.add(edges);
  });
}

const floorMesh = box('floor', [10.5, .18, 7.2], [0, -.1, 0], mat.floor, false);
const backWall = box('back wall', [10.5, 2.8, .18], [0, 1.28, -3.55], mat.wall, false);
const sideWall = box('side wall', [.18, 2.8, 7.2], [-5.25, 1.28, 0], mat.wall, false);
const roofLayer = box('exploded ceiling layer', [10.25, .08, 7.0], [0, 4.28, 0], new THREE.MeshStandardMaterial({ color: 0xf7f3eb, transparent: true, opacity: .54, roughness: .9 }), false);
roofLayer.userData.noOutline = false;
box('window', [2.8, 1.3, .08], [-2.2, 1.55, -3.65], mat.glass, false);
box('kitchen block', [2.2, .9, .72], [3.55, .38, -2.65], mat.marble);
box('kitchen tower', [.8, 1.9, .72], [4.25, .86, -1.55], mat.wall);
box('island', [2.6, .55, .95], [1.05, .35, -1.05], mat.marble);
sideboard('Varo walnut sideboard', [2.8, .02, -3.05], 0);
modularShelves('606-inspired modular shelves', [-4.92, .02, -.9], Math.PI / 2);
box('dining table / Forma 5', [1.95, .18, 1.02], [-1.25, .55, 1.05], mat.wood);
for (const [x, z, r] of [[-2.45, 1.05, Math.PI / 2], [-.05, 1.05, -Math.PI / 2], [-1.25, -.05, 0], [-1.25, 2.15, Math.PI]]) {
  diningChair('molded dining chair', [x, .02, z], r);
}
loungeChair('low lounge chair', [2.55, .02, 1.85], -Math.PI / 2);
box('rug', [3.2, .04, 1.8], [2.35, .02, 1.65], new THREE.MeshStandardMaterial({ color: 0xc8b8a2, roughness: .95 }), false);
floorLamp('single orange floor lamp', [-4.15, .02, -.9]);
cyl('plant pot', .22, .32, [-4.35, .16, 2.55], mat.ink, 24);
cyl('plant', .36, .75, [-4.35, .72, 2.55], mat.plant, 7);

const workstation = furnitureGroup('workstation ghost', [3.45, .02, -.08], Math.PI / 2, [
  part(new THREE.BoxGeometry(1.55, .16, .68), mat.ink, [0, .58, 0]),
  part(new THREE.BoxGeometry(1.45, .08, .62), mat.walnut, [0, .68, 0]),
  part(new THREE.BoxGeometry(.62, .42, .06), mat.glass, [0, 1.02, -.25]),
  part(new THREE.CylinderGeometry(.07, .07, .34, 16), mat.orange, [-.62, .86, .2]),
]);
workstation.visible = false;
const nursery = crib('nursery modular crib', [-3.65, .02, 2.1], Math.PI / 2);
nursery.visible = false;

addArchitecturalOutlines(scene);

function setMaquetteMode(on) {
  state.maquette = on;
  roofLayer.visible = on;
  roofLayer.position.y = on ? 4.28 : 2.95;
  backWall.position.y = on ? 1.42 : 1.28;
  sideWall.position.y = on ? 1.42 : 1.28;
  floorMesh.material.color.set(on ? 0xe1d3bd : 0xd8c7ad);
  el('sceneTitle').textContent = on ? 'Modo maqueta editorial' : 'Modo vivir';
  el('maquetteBtn').textContent = on ? 'Modo vivir' : 'Modo maqueta';
}
setMaquetteMode(true);

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
el('maquetteBtn').onclick = () => {
  setMaquetteMode(!state.maquette);
  log(state.maquette ? 'Modo maqueta: cubierta elevada, lectura editorial y materiales a la vista.' : 'Modo vivir: la casa vuelve a sentirse habitada.');
};
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
  if (state.maquette) {
    roofLayer.position.y = 4.28 + Math.sin(clock.elapsedTime * .8) * .035;
  }

  renderHud();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

log('Prototipo 004: más cerca de la referencia, maqueta editorial con vida dentro.', 'good');
renderHud();
animate();
