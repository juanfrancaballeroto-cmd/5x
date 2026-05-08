# 5x

**5x** es un prototipo de juego minimalista de interiorismo y vida simulada.

El núcleo: el tiempo avanza en tiempo real a **5x velocidad**. Diseñar no es solo decorar: cada decisión consume tiempo, dinero y energía, y cambia cómo vive el jugador.

## Prototype 002

La demo actual ya no es una maqueta CSS: usa **Three.js** desde CDN para crear una escena 3D isométrica directamente en navegador.

Incluye:

- Escena 3D isométrica de un apartamento inicial.
- Mobiliario procedural más cuidado: lounge chair, sillas moldeadas, aparador, estantería modular, cuna y lámpara naranja.
- Personaje autónomo moviéndose por la vivienda.
- Posibilidad de añadir pareja e hijo.
- Necesidades: dinero, descanso, foco, vida social y familia.
- Decisiones de diseño con coste en tiempo/dinero y consecuencias.
- Tiempo útil como recurso principal.
- Botón pay-to-advance: comprar +8h útiles.
- Clima simple con lluvia visual.
- Estética funcional tipo Dieter Rams/Braun, con un único acento naranja.
- Mobiliario ficticio, sin marcas ni licencias reales.

## Librerías / assets recomendados

Para traer muebles y personajes reales al prototipo sin sustos de licencias:

- **Poly Haven**: CC0, ideal para materiales/HDRI/texturas.
- **Kenney**: packs limpios para prototipos y juegos.
- **Quaternius**: low-poly/estilizado, licencias muy utilizables.
- **Sketchfab**: solo modelos descargables con licencia clara, preferiblemente CC0/CC-BY/comercial permitida.
- **BlenderKit**: útil para interiores, revisando licencia de cada asset.
- **Mixamo**: personajes y animaciones para caminar, sentarse, hablar, etc.

Regla 5x: nada de marcas reales, nombres de diseñador ni siluetas protegidas en el MVP. Mejor piezas originales con ADN de diseño reconocible.

## Ejecutar localmente

Por usar módulos ES y Three.js desde import map, sirve la carpeta con HTTP:

```bash
python3 -m http.server 8788
```

Luego abre:

```txt
http://127.0.0.1:8788
```

## Link de prueba sin GitHub Pages

```txt
https://raw.githack.com/juanfrancaballeroto-cmd/5x/main/index.html
```

## Dirección de producto

5x no trata de diseñar una casa bonita. Trata de diseñar una vida que cambia:

- vivir solo
- invitar amigos
- vivir en pareja
- tener hijos
- niños creciendo
- nuevas rutinas
- nuevas necesidades
- coste de oportunidad del tiempo

## Próximos pasos

- Sustituir geometrías básicas por modelos `.glb/.gltf` originales o CC0.
- Añadir pathfinding real y estados de personaje: dormir, trabajar, cocinar, descansar.
- Sistema de eventos vitales: mudanza, pareja, bebé, colegio, trabajo remoto, crisis económica.
- Catálogo de piezas con marcas ficticias y atributos de diseño.
- Guardado de progreso.
- Publicar con GitHub Pages o Vercel.
