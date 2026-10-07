# Escalafón · Peldaño 6: Alcalde

Prototipo jugable en navegador de **Escalafón**, un juego satírico de gestión isométrica sobre un político que asciende y se corrompe por buenas intenciones. Este prototipo cubre solo el peldaño 6: un mandato de alcalde de Villanueva (Reino de Hesperia), 48 meses de juego, de la toma de posesión a la portada final.

Todo es ficticio: país, ciudad, partidos, personas y casos.

## Arrancar

```bash
cd escalafon
npm install
npm run dev        # juego en http://localhost:5173
npm test           # tests unitarios (Vitest) de src/sim, datos y textos
npm run simulate   # 1.000 partidas por estrategia sin gráficos + objetivos de balance
npm run build      # typecheck + build de producción en dist/
npm run smoke      # smoke test Playwright: arranca, construye, resuelve un expediente, captura
```

`npm run simulate -- --games 200` para una pasada rápida, `--json` para salida máquina y `--strict` para que falle si no se cumplen los objetivos.

Atajos útiles para iterar: `/?autostart=1&seed=7` salta la pantalla inicial; `&lang=en` arranca en inglés.

## Cómo se juega

1. Eliges nombre, partido (Conservador del Orden o Progresista Unido: solo cambia qué colectivos te quieren al empezar) y tres causas personales.
2. El tiempo corre (un mes = 10 s a x1; x2, x3 y pausa con la barra espaciadora o 1/2/3).
3. **Construir**: pulsa una parcela con estacas. Cada edificio se adjudica por **concurso público** (x1,4 de coste, x2 de plazo, sin rastro) o **a dedo** (precio base, mitad de plazo, sobre del 15% en dinero negro, rastro con Pórtico y la interventora como testigos).
4. **Expedientes**: cada uno o dos meses llega una carpeta. Mientras está sobre la mesa el reloj se para. Las opciones muestran sus efectos visibles; las corruptas además el riesgo y tu autojustificación del momento según la Brújula. Algunas tienen costes ocultos que llegan meses después.
5. **Ordenanzas**: seis decretos activables con efecto mensual. Aprobar o derogar cuesta Poder.
6. **Caja B**: blanquear (vía la consultora del cuñado), financiar al partido, campaña paralela y sobres para asegurar lealtades. La interventora no acepta sobres.
7. **Mes 48**: elecciones. Si no has caído antes, la portada de El Eco de Villanueva te despide con cifras.

### Sistemas

| Sistema | Rango | Qué hace |
|---|---|---|
| Poder | 0 a 100 | Sube con la Imagen, baja con la Sospecha alta. En 0, expulsión. |
| Imagen | 0 a 100 | Tiende a lo que sienten los colectivos menos la Sospecha. Base del voto. |
| Presupuesto | € | Ingresos base, licencias, tasas y mantenimiento. En negativo penaliza Imagen y Poder. |
| Dinero negro | € | Lo no blanqueado suma Sospecha cada mes (1 punto por cada 250 k€). |
| Sospecha | 0 a 100 | Sube por visibilidad de cada acto, filtraciones y prensa; baja 1 al mes. En 100, imputación. |
| Rastro | oculto | Registro de cada acto corrupto con testigos y pruebas. Alimenta filtraciones, periodista, auditorías y la portada. |
| Brújula | 0 a 100 | De Íntegro a Cínico, en 4 tramos de autojustificación. |
| Legado | puntos | Progreso en tus tres causas, con cifras concretas (viviendas, hectáreas, empleos...). |
| Lealtades | 0 a 10 | Por debajo de 3 pueden filtrar lo que vieron; por encima de 8 cargan con tu culpa una vez. |
| Colectivos | 0 a 10 | Ocho colectivos con peso electoral. Vuelven poco a poco a un ánimo base gruñón: gobernar desgasta. |

Además: trama de **La Vega** (cuñado testaferro, recalificación, reparto de la plusvalía), **Lucía Ferrán**, periodista local con cadena de tres cartas según el Rastro reciente, **crisis** aleatorias (sequía, subida de tipos, cierre de la conservera, temporada turística récord) y **amaño electoral** (voto por correo, autobús de jubilados) con probabilidad de descubrimiento.

Finales: reelección limpia, reelección con Rastro, derrota, imputación, expulsión, cabeza de turco y arrepentido.

## Balance

Resultado de `npm run simulate` (1.000 partidas por estrategia, semillas 1000 a 1999):

| | limpio | moderado | corrupto | aleatorio |
|---|---|---|---|---|
| Reelección limpia | 34,8% | | | |
| Reelección con Rastro | | 47,9% | 0,0% | 0,1% |
| Derrota | 64,0% | 45,4% | 6,2% | 50,4% |
| Imputación | | 4,5% | **77,1%** | 15,9% |
| Expulsión | 1,2% | 2,2% | | 0,6% |
| Cabeza de turco | | | 16,7% | 16,8% |
| Arrepentido | | | | 16,2% |
| Legado medio | 225 | **257** | 213 | 107 |
| Meses de media | 48,0 | 47,9 | 27,3 | 42,5 |

Objetivos: limpio gana al menos el 25% (34,8%), corrupto total imputado en más del 50% (77,1%), moderado es la más tentadora (más reelecciones y más legado). Un test de Vitest vigila estos objetivos sobre una muestra pequeña.

Las estrategias viven en `src/sim/bots.ts`:

- **limpio**: concurso siempre, nunca una opción corrupta, elige lo que más ayuda a sus causas y colectivos.
- **moderado**: oportunista prudente. A dedo o corrupto solo con Sospecha baja y testigos leales; campaña paralela al final y amaño solo si la encuesta está ajustada.
- **corrupto**: todo a dedo, todas las opciones corruptas, compra Poder y lealtades.
- **aleatorio**: decisiones al azar.

Sobre la duración: el reloj solo son 8 minutos a x1 (48 meses x 10 s), pero el juego se para en cada expediente (unos 31 por partida) y al construir. La estimación del simulador, con 25 s de lectura por carpeta, es de unos 21 minutos; con exploración del mapa, paneles y ordenanzas, una primera partida debería rondar los 30. Si se quiere más largo, `data/config.json → time.monthSeconds`.

## Estructura

```
escalafon/
├── data/            Contenido y balance (JSON validado con zod al cargar)
│   ├── config.json      todos los parámetros numéricos
│   ├── buildings.json   10 edificios
│   ├── decrees.json     6 ordenanzas
│   ├── expedientes.json 53 cartas (42 de mazo + cadenas)
│   ├── collectives.json, causes.json, characters.json, events.json, map.json, parties.json
├── i18n/            es.json (principal) y en.json; mismas claves, test de paridad
├── assets/          manifest.json y sprites/ (publicDir de Vite)
├── src/
│   ├── data/        esquemas zod y cargador con validación de referencias cruzadas
│   ├── sim/         simulación pura y determinista (semilla dentro del estado)
│   ├── render/      PixiJS v8: proyección isométrica y MapView
│   ├── ui/          HTML/CSS sobre el canvas: paneles, carpetas, portada
│   └── main.ts
├── tests/           Vitest (sim, datos, textos, guardado, bots) y e2e/ (Playwright)
└── tools/simulate.ts
```

La simulación no sabe nada del render: `advanceMonth(state, data)` avanza un mes, las acciones del jugador son funciones (`startBuilding`, `resolveExpediente`, `toggleDecree`, `launder`...) y todo el azar sale de un PRNG cuyo estado viaja dentro de `GameState`. Por eso una partida guardada y cargada continúa exactamente igual (hay test).

## Ajustar sin tocar código

- Números de balance: `data/config.json` (economía, Sospecha, filtraciones, periodista, elecciones, adjudicaciones, Caja B).
- Edificios, decretos y crisis: efectos mensuales y al inaugurar en su JSON.
- Expedientes: condiciones (`when`), peso, opciones con `effects`, `hidden` (costes ocultos), `corrupt` (tipo de delito, pruebas, visibilidad y testigos) y `requires`.
- Textos: `i18n/*.json`. Regla de contenido comprobada por test: ningún guion largo en textos ni datos.

Tras cualquier cambio: `npm test && npm run simulate`.

## Arte

Ahora mismo todo son prismas isométricos de color plano sobre casillas en rombo 2:1, con una silueta distinta por tipo para que se lean de un vistazo. Para sustituir un placeholder por arte final, deja un PNG isométrico 2:1 con fondo transparente en `assets/sprites/` y pon su ruta en `assets/manifest.json` (`"sprite": "sprites/hotel.png"`). `anchor` indica qué punto del PNG se apoya en la esquina inferior de la huella; el sprite se escala al ancho de la parcela. Si el PNG no carga, se vuelve al prisma.

## Guardado

Botón **Guardar** en la barra superior: descarga `escalafon-mesN.json` con el estado completo. **Cargar partida** (en la barra o en la pantalla inicial) lo valida y continúa.

## Limitaciones conocidas

- Solo el peldaño 6. No hay transición a otros peldaños.
- Sin sonido ni animación de personajes; el mapa es estático salvo obras y edificios.
- El layout está pensado para escritorio (a partir de unos 1.200 px de ancho); en pantallas estrechas se apila.
- Las estrategias automáticas juegan bastante bien; un jugador humano que explore probablemente esté entre "aleatorio" y "limpio" en su primera partida.
