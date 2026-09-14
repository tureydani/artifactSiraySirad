# SIRA + SIRAD — Animática interactiva

Animática publicitaria de 9 escenas para **SIRA** (app ciudadana) y **SIRAD** (panel institucional del GAMC), con un visor 3D del teléfono (three.js) que muestra capturas reales de ambas apps.

Proyecto estático, sin backend, construido con [Vite](https://vitejs.dev/) (JavaScript vanilla — el artifact original no usaba React, así que se conservó la misma tecnología para no alterar el diseño ni el comportamiento).

## Estructura del proyecto

```
.
├── index.html              # documento raíz (Vite entry point)
├── package.json
├── vite.config.js
├── vercel.json
├── src/
│   ├── main.js              # timeline de las 9 escenas, controles, reproducción
│   ├── phone3d.js           # visor 3D del teléfono (three.js + GLTFLoader)
│   └── styles.css           # todos los estilos, animaciones y variables de color
└── public/
    └── assets/
        ├── images/          # capturas reales de SIRA/SIRAD, logos, fondo de mapa
        ├── models/
        │   └── phone.glb    # modelo 3D del teléfono (geometría, sin texturas)
        ├── videos/          # (vacío — no se usa actualmente ningún video)
        ├── icons/           # (vacío — todos los iconos son SVG inline en index.html)
        └── fonts/           # (vacío — ver "Fuentes" más abajo)
```

> No se usó React ni componentes de framework porque el artifact original tampoco los usaba: es una sola página con temporizador central (`src/main.js`) que activa/desactiva 9 bloques `<div class="scene">`. Dividirlo en "componentes" habría significado reinventar la arquitectura, con riesgo de romper el diseño — algo que pediste evitar explícitamente.

## Recursos externos (los únicos 2 que no están alojados localmente)

| Recurso | Dónde se usa | Por qué sigue siendo externo |
|---|---|---|
| **Google Fonts** (`Unbounded`, `Manrope`, `IBM Plex Sans`, `IBM Plex Mono`) | `@import` al inicio de `src/styles.css` | Es un CDN público estándar (no depende de Claude). Funciona igual en Vercel. Si quieres cero llamadas externas, más abajo te indico cómo auto-alojar las fuentes. |
| **three.js** (librería 3D) | `import * as THREE from 'three'` en `src/phone3d.js` | Ya **no** es una URL externa: se instala como dependencia npm (`three` en `package.json`) y Vite la empaqueta dentro de tu propio build. Lo menciono solo para que sepas que antes (dentro de Claude) se cargaba desde un CDN por restricciones del sandbox; en este proyecto ya no depende de ningún CDN. |

Todo lo demás (imágenes, logos, el modelo 3D del teléfono) son archivos locales dentro de `public/assets/`.

### Si quieres auto-alojar las fuentes (opcional)

1. Descarga los `.woff2` de [Unbounded](https://fonts.google.com/specimen/Unbounded), [Manrope](https://fonts.google.com/specimen/Manrope), [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) e [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) en los pesos usados (700/800/900, 600/700/800, 400/500/600, 400/500).
2. Colócalos en `public/assets/fonts/`.
3. Reemplaza la línea `@import url('https://fonts.googleapis.com/...')` en `src/styles.css` por reglas `@font-face` apuntando a `/assets/fonts/...`.

## Recursos que se dejaron fuera (no están en uso actualmente)

Estas capturas existieron en versiones anteriores de la animática pero **ya no están referenciadas** por ninguna de las 9 escenas actuales, así que no se incluyeron para no arrastrar peso muerto: `sira_00.jpg`, `sirad_alertas.jpg`, `sirad_gps.jpg`, y un video (`rob.mp4`) que se usó temporalmente en la escena de asignación y luego se reemplazó por 5 imágenes fijas. Si en algún momento quieres recuperarlos, avísame y te los paso.

## Ejecutar localmente

Requiere [Node.js](https://nodejs.org/) 18 o superior.

```bash
npm install
npm run dev
```

Abre la URL que muestra la terminal (normalmente `http://localhost:5173`).

Para generar el build de producción y previsualizarlo:

```bash
npm run build
npm run preview
```

## Subir a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Initial commit: animática SIRA + SIRAD"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

## Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com/) → **Add New... → Project**.
2. Importa el repositorio de GitHub que acabas de subir.
3. Vercel detecta automáticamente el framework **Vite** (build command `npm run build`, output `dist`) — no necesitas cambiar nada, pero `vercel.json` ya lo deja explícito por si acaso.
4. Deploy. Cada push a `main` volverá a desplegar automáticamente.

## Qué se conservó exactamente igual

- Las 9 escenas, su orden y su contenido de texto.
- Todas las animaciones y transiciones CSS (fundes, desplazamientos, pulsos, parpadeos, kenburns).
- El visor 3D del teléfono: giro rápido con rebote al cambiar de pantalla, desvanecimiento en la escena de seguimiento (login → contenido), respiración/flotación idle.
- El diseño responsive (breakpoints de 560px y modo retrato angosto).
- Controles de reproducción (play/pausa, barra de progreso, puntos de escena) y el aviso de "movimiento reducido".
