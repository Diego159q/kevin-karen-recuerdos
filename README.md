# Kevin & Karen - Recuerdos de Boda

Web app profesional con la tematica de la invitacion de Kevin & Karen para que invitados suban fotos y videos mediante QR, y para que los novios revisen una galeria privada con datos de quien subio cada recuerdo.

## Ejecutar

```bash
npm.cmd install
npm.cmd run dev
```

Luego abre la URL que muestra Vite, normalmente `http://localhost:5173`.

## Supabase

1. Crea un proyecto en Supabase.
2. Abre `SQL Editor`.
3. Copia y ejecuta el contenido de `supabase/schema.sql`.
4. Copia `.env.example` como `.env`.
5. Completa estas variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
VITE_SUPABASE_BUCKET=wedding-memories
```

6. Reinicia el servidor de desarrollo:

```bash
npm.cmd run dev
```

La app detecta Supabase automaticamente. Si las variables no existen, sigue funcionando en modo demo.

Nota: las politicas de `supabase/schema.sql` permiten insertar, leer y eliminar desde el frontend para que la primera version funcione rapido. Para produccion conviene proteger el panel con autenticacion real antes de permitir eliminaciones.

## Deploy En Vercel

Antes de publicar, configura estas variables en Vercel:

```env
VITE_SUPABASE_URL=https://wfnhyrpvrolohdmuwzbx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_public_key
VITE_SUPABASE_BUCKET=wedding-memories
```

En Vercel se agregan en:

```text
Project Settings -> Environment Variables
```

Configuracion esperada:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

El archivo `vercel.json` ya deja esa configuracion lista y agrega fallback a `index.html` para que la app funcione como SPA.

## Panel privado

Codigo demo:

```text
kevinkaren2026
```

## Stitch MCP

El archivo `opencode.json` ya esta configurado para usar Stitch con variable de entorno:

```json
"X-Goog-Api-Key": "{env:STITCH_API_KEY}"
```

En PowerShell puedes configurar la clave para la sesion actual asi:

```powershell
$env:STITCH_API_KEY="TU_API_KEY"
```

Para dejarla persistente en Windows:

```powershell
setx STITCH_API_KEY "TU_API_KEY"
```

Despues de cambiar `opencode.json` o la variable de entorno, reinicia opencode para que el MCP se cargue.

## Nota de seguridad

No guardes la API key directamente en el proyecto. Si ya compartiste una clave real en un chat, lo recomendable es revocarla y crear una nueva desde Google Cloud.

## Incluye

- Landing premium con monograma K&K, fecha 08.08.2026 y estilo crema/dorado.
- Flujo de subida con nombre, mesa, momento, previews y progreso.
- Campo de relacion con los novios.
- Aviso de privacidad y consentimiento antes de subir.
- Subida real a Supabase Storage cuando las variables estan configuradas.
- Guardado de metadatos en la tabla `wedding_memories`.
- URL recomendada para QR: `kevin-karen-boda.netlify.app/recuerdos`.
- Enlace de regreso a la invitacion oficial.
- Panel privado con login, estadisticas, filtros y galeria.
- Vista detalle por archivo con metadatos.
- Galeria en vivo para pantalla de fiesta.
- Diseno responsive mobile y desktop.
