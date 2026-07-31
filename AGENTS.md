# AGENTS.md

## Rol
Desarrollador senior de React encargado del mantenimiento y evolución del proyecto `kevin-karen-recuerdos`. Debes respetar estrictamente las convenciones, estructura y decisiones técnicas documentadas aquí. Antes de escribir código, verifica que entiendes la estructura actual. Tus cambios deben compilar (`npm run build` sin errores) y seguir las buenas prácticas de React.

## Resumen del producto
Aplicación web **SPA** para una boda (Kevin & Karen, fecha 08.08.2026). Los invitados escanean un **QR**, entran a la app y suben **fotos y videos de forma anónima** (sin llenar formularios) que se **publican automáticamente** en una **galería en vivo** proyectable en la fiesta. Los novios gestionan el contenido desde un **panel privado** (ocultar o eliminar recuerdos). Incluye página de QR imprimible y descarga masiva de todo el contenido en **ZIP**.

## Stack tecnológico
- **React** (latest, ~19) + `react-dom`
- **Vite 8.2** (build tool) con plugin de React
- **@supabase/supabase-js ^2.111** (Auth, Database, Storage)
- **JSZip ^3.10** (solo para ZIP, cargado de forma diferida)
- **Node.js 24**, `npm`
- Desplegado en **Vercel** (framework `vite`, output `dist`)

## Arquitectura actual (POST-refactor)
El `App.jsx` original de 1200+ líneas fue dividido. **`App.jsx` es ahora un orquestador delgado** (~550 líneas) que solo contiene estado global, efectos y handlers. Estructura:

```
src/
├── App.jsx                → Orquestador: estado, efectos, handlers, render de vistas
├── main.jsx               → Punto de entrada (React StrictMode)
├── styles.css             → Todo el CSS (tema boda, animaciones, responsive)
├── supabaseClient.js      → Cliente Supabase (config desde env vars)
├── constants.js           → Constantes + seedMemories + qrUrl
├── components/
│   ├── MemoryCard.jsx     → Tarjeta de recuerdo en el panel admin
│   ├── MemoryModal.jsx    → Lightbox con detalle, aprobar/ocultar/descargar/eliminar
│   ├── Stat.jsx           → Tarjeta de estadística
│   ├── Step.jsx           → Paso del "Cómo funciona"
│   └── ToastContainer.jsx → Sistema de notificaciones
├── views/
│   ├── HomeView.jsx       → Hero, cómo funciona, invitación
│   ├── UploadView.jsx     → Formulario de subida de invitados
│   ├── AdminView.jsx      → Login admin + panel (stats, filtros, grilla)
│   ├── LiveView.jsx       → Galería en vivo con slideshow
│   └── QrView.jsx         → Página del QR imprimible
└── utils/
    ├── mapSupabaseMemory.js  → Mapea fila de Supabase a objeto Memory
    ├── compressImage.js      → Comprime imágenes pesadas vía canvas
    ├── formatFileSize.js     → "10 MB" / "512 KB"
    ├── formatDate.js         → Fecha larga en español
    └── getSafeFileName.js    → Sanitiza nombres de archivo
```

**Navegación**: sin router. Estado `view` en `App.jsx` con 5 valores: `home`, `upload`, `admin`, `live`, `qr`.

## Modelo de datos (Memory)
```js
{ id, guestName, table, relation, moment, uploadedAt, fileName, filePath,
  type: 'image'|'video', previewUrl, thumbUrl, accent: 'champagne'|'olive'|'rose', approved: boolean }
```

## Integración con Supabase
- **Auth**: email/contraseña para el admin (`supabase.auth.signInWithPassword`). El estado de sesión se escucha con `onAuthStateChange`.
- **Tabla** `wedding_memories`: columnas snake_case mapeadas por `mapSupabaseMemory` (guest_name→guestName, table_name→table, file_name→fileName, file_path→filePath, file_type→fileType, mime_type, size_bytes, public_url→previewUrl, thumb_url→thumbUrl, approved, created_at→uploadedAt).
- **Storage**: bucket `wedding-memories`, path `uploads/YYYY-MM-DD/uuid-nombre-sanitizado`, `cacheControl 3600`, sin upsert. Se guarda la `public_url` en la fila. Las imágenes suben además una miniatura (~600px) en `thumbs/...` y se guarda `thumb_url`.
- **Realtime**: suscripción `postgres_changes` en `wedding_memories` (INSERT/UPDATE/DELETE) → el estado `memories` se actualiza solo y aparece toast "Nuevo recuerdo". Los INSERT hechos por el propio cliente se silencian con `selfInsertedIdsRef`.
- **Modo demo**: si no hay `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, la app funciona con `seedMemories` en memoria y simula subidas con un timer.
- El código debe acceder a `supabase` **solo tras verificar `isSupabaseConfigured`** (nunca asumir que no es `null`).
- **Seguridad (RLS)**: `delete`/`update` de filas y `storage.remove` solo se ejecutan si `isSupabaseConfigured && isAdmin`. Las políticas SQL están en `supabase/policies.sql` (aplicar 1 vez en el SQL Editor): select/insert públicos, update/delete solo `authenticated`, y la tabla agregada a `supabase_realtime`.

## Reglas de subida de archivos
- **Subida 100% anónima**: sin formulario. Solo se eligen archivos y se pulsa subir.
- Máximo **20 archivos por lote** (`maxFilesPerUpload`).
- Fotos: límite **10 MB** (`maxPhotoSize`). Videos: **100 MB** (`maxVideoSize`).
- Imágenes JPEG/PNG/WebP > 10 MB se **comprimen automáticamente** con `compressImage`: escala a máx. 2200px y reexporta como JPEG calidad 0.82. Si la compresión no reduce tamaño, se usa el original.
- Además se genera una **miniatura** (~600px, JPEG 0.75) con `createThumbnail` (en `compressImage.js`) para las grillas (`thumbUrl`). Las grillas usan `memory.thumbUrl || memory.previewUrl`.
- Cada archivo aceptado recibe `id` único, `previewUrl` con `URL.createObjectURL` (revocado al quitar/seleccionar).
- **Subida robusta**: los archivos se procesan uno a uno; los que fallan quedan en la lista para reintentar y los exitosos se quitan (no se duplican). El progreso por archivo usa `onUploadProgress` de storage.
- Las subidas se guardan con valores por defecto: `guest_name: 'Anonimo'`, `table_name: 'Sin mesa'`, `relation: 'Invitado'`, `moment: 'Otro'`.
- La UI de tarjetas/modal/galería **oculta los valores por defecto** ('Anonimo', 'Sin mesa', 'Invitado', 'Otro') para no mostrar ruido.

## Flujo de publicación (sin moderación previa)
- Al subir, `approved: true` — el recuerdo se **publica automáticamente** en la galería en vivo, sin revisión de los novios.
- Si los novios no quieren mostrar un recuerdo, pueden **ocultarlo** desde la tarjeta o el modal (queda `approved: false` y sale de la galería en vivo). No es obligatorio aprobar nada.
- La galería en vivo **solo muestra aprobados** (`LiveView` filtra `memory.approved`).
- Eliminar: borra el archivo de Storage y el registro de la DB. Si Storage falla, aborta; si la DB falla tras borrar el archivo, igual limpia la UI y avisa con toast.

## Decisiones técnicas y fixes aplicados (NO revertir)
1. **Estado con functional updaters**: `setForm(prev => ({...prev, key: val}))` y `setFilters(prev => ({...prev, key: val}))` — nunca usar `{...estado}` directo en handlers (evita stale closures).
2. **Timer del modo demo con `useRef`** (`demoUploadTimerRef`) con limpieza en unmount — no usar objetos planos.
3. **Errores de admin vía toasts** (eliminar/aprobar/ocultar/ZIP), no mezclarlos en `setUploadError` (reservado para carga de galería y subidas).
4. **Confirmación en 2 pasos antes de eliminar** en `MemoryModal`, con estado `confirmingDelete`.
5. **Loading states en el modal**: botones muestran "Procesando..."/"Eliminando..." y el cierre (Escape/backdrop) se bloquea mientras hay una acción en curso.
6. **Reset del `<input type="file">`** tras seleccionar (`event.target.value = ''`).
7. **Botón de subir**: muestra `Subiendo recuerdos... {progreso}%` y se deshabilita durante el envío.
8. **Seguridad**: el `privateCode` nunca se muestra en la UI (se eliminó el hint "Demo: {privateCode}").
9. **Code-splitting**: `JSZip` se importa dinámicamente (`await import('jszip')`) dentro de `downloadAllMemories`. El bundle principal pasó de 525 KB → 430 KB (JSZip va en chunk aparte).
10. **SEO**: `index.html` tiene meta description, theme-color y Open Graph.
11. **`VITE_DEPLOYED_URL` se normaliza** con `.replace(/^https?:\/\//, '')` para evitar doble `https://` en el QR.

## Variables de entorno (ver `.env.example`)
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
VITE_SUPABASE_BUCKET=wedding-memories
VITE_DEPLOYED_URL=kevin-karen-recuerdos.vercel.app   # sin protocolo
STITCH_API_KEY=tu_api_key_de_google_stitch            # no usada aún
```

## Despliegue y workflow Git
- Repos: `github.com/Diego159q/kevin-karen-recuerdos` (main) → Vercel (proyecto `kevin-karen-recuerdos`, scope `odonto3`).
- **Vercel está conectado a Git**: cada `git push` a `main` dispara auto-deploy en producción. URL: `https://kevin-karen-recuerdos.vercel.app`.
- `vercel.json`: framework `vite`, `buildCommand: npm run build`, `outputDirectory: dist`, rewrites SPA a `/index.html`.
- Comandos: `npm run dev`, `npm run build`, `npm run preview`. No hay script de lint configurado.
- Convención de commits en español, mensajes descriptivos (ej. `feat:`, `fix:`, `refactor:`).

## Mejoras propuestas (pendientes)
- Paginación o infinite scroll en el panel admin para muchas fotos.
- Soporte para formatos de imagen modernos (AVIF/HEIC) en `compressImage`.
- Descarga ZIP en paralelo con límite de concurrencia.

## Robustez, seguridad y rendimiento (implementado, no revertir)
1. **RLS (seguridad)**: `supabase/policies.sql` activa row level security: select/insert públicos, update/delete solo `authenticated` (admin logueado). Sin sesión no se puede ocultar/eliminar. Aplicar 1 vez en el SQL Editor de Supabase.
2. **Realtime**: `postgres_changes` en `wedding_memories` → panel y live wall se actualizan solos (INSERT/UPDATE/DELETE). El toast de "Nuevo recuerdo" se silencia para subidas propias (`selfInsertedIdsRef`).
3. **Subida robusta sin duplicados**: procesado archivo por archivo; los exitosos se quitan de la cola y los fallos quedan para reintentar con resumen por nombre.
4. **Progreso real por archivo**: `onUploadProgress` de storage (antes era % simulado por índice).
5. **Miniaturas**: `createThumbnail` (~600px) subida a `thumbs/...`; grillas usan `memory.thumbUrl || memory.previewUrl`. `preload="none"` en videos de grilla (el slideshow conserva autoplay).
6. **`content-visibility: auto`** en `.memory-card`, `.preview-item`, `.live-tile`.
7. **Error boundary global** (`ErrorBoundary.jsx`) envolviendo `<App/>` en `main.jsx`.
8. **ESLint** (`eslint.config.js` flat, react-hooks + react-refresh): script `npm run lint`. Regla `react-hooks/refs` y `set-state-in-effect` activas: NO asignar `ref.current` en render ni `setState` síncrono en effects; usar efectos sin deps para "latest ref" y el patrón de reset de estado en render (comparar `memory.id !== lastMemoryId`).
9. **`document.title` por vista** vía effect en `App.jsx`.
10. **Focus trap + foco restaurado** en `MemoryModal` (Tab cíclico, foco al abrir y al navegar, `aria-label` "Recuerdo X de Y", foco vuelve al elemento anterior al cerrar).
11. **`prefers-reduced-motion`**: desactiva Ken Burns, shimmer, splash-ring, checkDraw y animación de toasts/progreso.

## Mejoras visuales implementadas (no revertir)
1. **Reveal on scroll** (`Reveal.jsx`): IntersectionObserver agrega `.reveal-visible` al entrar en el viewport. Respeta `prefers-reduced-motion` (el contenido se muestra siempre).
2. **Iconos SVG inline** (`Icons.jsx`): set central de iconos con `name` (upload, panel, play, qr, photo, video, layers, eye, eyeOff, check, x, info, chevronLeft/Right, download, trash). Usado en topbar, stats, toasts, botones y badges.
3. **Dropzone drag state**: clase `.dragging` con borde dorado + glow mientras se arrastran archivos encima.
4. **Play badge**: círculo semi-transparente con icono play sobre videos en tarjetas, previews y live wall.
5. **Blur-up de imágenes**: las `<img>` arrancan con `opacity: 0` sobre un placeholder con shimmer (`.media::before` + `@keyframes shimmer`) y hacen fade-in al cargar (`onLoad` agrega `.loaded`).
6. **Contador dinámico**: el card flotante del hero muestra el total real de recuerdos (`stats.total`); si aún no hay, conserva "+128 esperados".
7. **Lightbox prev/next**: flechas `.modal-nav` (‹ ›) + teclas `←`/`→` en `MemoryModal`. Al navegar se resetea la confirmación de borrado. Después de eliminar, el modal avanza al siguiente recuerdo filtrado.
8. **Ken Burns + barra de progreso**: los slides activos animan zoom sutil (`kenBurns 9s`); la `.live-progress` (4s, claveada por `slideIndex`) se sincroniza con el auto-avance del slideshow.
9. **Toast con iconos**: cada toast muestra icono según tipo (check/x/info) en `.toast-icon`.
10. **Splash screen**: pantalla inicial con monograma K&K y anillos pulsantes; se desvanece sola (~2s) vía estado local en `SplashScreen.jsx`.
11. **PWA**: `public/manifest.webmanifest`, `public/sw.js` (stale-while-revalidate + fallback a `/index.html` en navegaciones offline), registro en `main.jsx` y links en `index.html`. `theme_color` = `#3f4a38`.
12. **Instalar app**: hook `useBeforeInstallPrompt` captura `beforeinstallprompt` y muestra botón "Instalar app" en el hero de `HomeView`.
13. **Iconos regenerables**: `scripts/gen-icons.js` (Node, sin deps) genera `public/icons/icon-{192,512}.png` (aro dorado sobre oliva). `public/icons/icon.svg` es el favicon con monograma K&K. Regenerar con `node scripts/gen-icons.js`.
