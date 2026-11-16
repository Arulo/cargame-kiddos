# Taller Turbo 🚗

Juego web para chicos (8–12 años): se arma un coche pieza por pieza, se guarda en el garaje y se sale a manejar por distintos paisajes. Gráficos pixel art de 16 bits, todos generados por código.

## Probarlo en la compu

```bash
npm install
npm run dev
```

Abrir la URL que muestra la consola. Como `host` está activado, también se puede abrir desde el iPad en la misma red Wi-Fi con `http://IP-DE-LA-MAC:5173`.

- `?debug=1` en la URL muestra abajo a la izquierda qué breakpoint está activo y el tamaño de la pantalla.
- `debug.html` (sólo en modo dev) muestra una grilla de coches de prueba.
- Teclado al manejar: ← / → frenar y acelerar, espacio = bocina, L = luces.

## Publicarlo (GitHub Pages)

1. Crear un repo en GitHub y subir esta carpeta (`git init`, `git add .`, `git commit`, `git push`).
2. En el repo ir a **Settings → Pages → Source** y elegir **GitHub Actions**.
3. Cada push a `main` publica el juego en `https://USUARIO.github.io/REPO/`.

## Instalarlo en el iPad como app

1. Abrir la URL publicada en **Safari**.
2. Tocar Compartir → **Agregar a pantalla de inicio**.
3. Se abre a pantalla completa, sin barra de Safari, y funciona sin internet.

Notas de iOS: el sonido se activa con el primer toque. Si el iPad tiene el modo silencio activado, puede que no se escuche. Los coches se guardan en el dispositivo; si se borran los datos de Safari, se pierde el garaje.

## Estructura

```
src/
  gfx/pixel.ts        mini motor de pixel art (buffer, círculos, polígonos, contorno)
  gfx/palette.ts      colores de pintura (rampas de 5 tonos)
  car/parts.ts        CATÁLOGO DE PIEZAS y configuración del coche
  car/build.ts        arma el sprite del coche y lo dibuja (ruedas, antena, luces)
  scene/themes.ts     fondos con parallax (ciudad, playa, bosque, desierto, noche)
  scene/props.ts      semáforo, patitos, conos, carteles
  scene/drive.ts      física de manejo y eventos de la ruta
  ui/                 pantallas: inicio, taller, garaje, elegir fondo, manejar
  styles/breakpoints.css   ← tamaños de la interfaz por tipo de pantalla
  audio.ts            sonidos sintetizados (bocina, motor, efectos)
  storage.ts          garaje guardado en localStorage
```

## Cómo encajan las piezas

Todo se dibuja en "espacio coche": `x = 0` es la costura entre el frente y la parte de atrás, y `y = 0` es el piso de la carrocería.

- Las dos mitades del chasis tienen siempre la cubierta a `y = -14` en los primeros ~20 px desde la costura. Por eso cualquier cabina encaja con cualquier frente o parte trasera.
- El tamaño de la rueda decide la altura del coche: la parte de arriba de la rueda queda siempre a la misma altura y el coche se "levanta" con ruedas más grandes.
- Cada mitad define dónde va su rueda y su luz. La cabina define su techo, y ahí se enchufan la antena y el accesorio de techo.

Para agregar una pieza nueva hay que sumar una entrada en `car/parts.ts`. Si es de techo, extra o dibujo, también hay que agregar su `case` de dibujo en `car/build.ts`.

## Breakpoints

Se miden por **alto** de pantalla, porque el juego siempre corre en horizontal:

| nombre | alto | dispositivos |
|---|---|---|
| phone | < 500px | celulares en horizontal |
| tablet | 500–899px | iPad, iPad mini, iPad Air |
| tablet-xl | ≥ 900px | iPad Pro 12.9", compu |

Todos los tamaños están en variables dentro de `src/styles/breakpoints.css`. El dibujo pixel se escala aparte, siempre en múltiplos enteros, para que los píxeles se vean nítidos.
