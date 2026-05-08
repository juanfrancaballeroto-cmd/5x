# 5x

**5x** es una demo inicial de un juego minimalista de interiorismo y vida simulada.

El núcleo: el tiempo avanza en tiempo real a **5x velocidad**. Diseñar no es solo decorar: cada decisión consume tiempo, dinero y energía, y cambia cómo vive el jugador.

## Dirección

- Estética isométrica editorial, tipo maqueta arquitectónica.
- Inspiración funcional tipo Dieter Rams / Braun.
- Paleta sobria con un único acento naranja.
- Casas premium, minimalistas y aspiracionales.
- Tiempo como recurso principal y posible moneda de avance.
- Mobiliario ficticio, sin marcas ni licencias reales.

## Demo actual

Incluye:

- Reloj a 5x.
- Tiempo útil como recurso.
- Botón para comprar +8h útiles.
- Decisiones de diseño y vida con costes/consecuencias.
- Métricas: dinero, descanso, foco y estilo de vida.
- Vista isométrica CSS.
- Modo capas / exploded view.
- Clima simple sol/lluvia.

## Ejecutar localmente

```bash
python3 -m http.server 8788
```

Luego abre:

```txt
http://127.0.0.1:8788
```

## Próximos pasos

- Convertir la escena CSS en motor canvas/WebGL o Three.js.
- Añadir catálogo de piezas con marcas ficticias.
- Guardar progreso.
- Diseñar primer apartamento, objetivos y tutorial.
- Crear sistema real de eventos vitales y coste de oportunidad.
