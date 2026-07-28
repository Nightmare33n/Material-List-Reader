# Material List Reader

App web (React + Vite + TypeScript) para visualizar listas de materiales estilo Litematica con iconos de bloques y una UI inspirada en el inventario de Minecraft.

## Uso

```bash
npm install
npm run dev
```

Abre la URL que muestre Vite (por defecto `http://localhost:5173`), arrastra un archivo `.json` con la material list o haz clic en la zona de drop para elegirlo desde el explorador.

## Formato del JSON de entrada

```json
{
  "name": "entrada",
  "items": [
    { "id": "minecraft:dirt", "count": 11 },
    { "id": "minecraft:grass_block", "count": 619 }
  ]
}
```

- `name`: título de la lista (se muestra en la barra superior del panel).
- `items`: array de `{ id, count }`. `id` puede llevar o no el prefijo `minecraft:`.

## Funcionalidad

- Drag & drop o selección manual de archivo, con validación de formato.
- Grid tipo inventario de Minecraft: slots beveled, iconos pixelados, contador tipo stack, tooltip con nombre formateado y cantidad exacta.
- Búsqueda por nombre/id y orden por cantidad (asc/desc) o alfabético.
- Contador de tipos de bloque únicos y total de bloques.

## Resolución de iconos

Los iconos se resuelven en tiempo real contra el dataset público [`PrismarineJS/minecraft-assets`](https://github.com/PrismarineJS/minecraft-assets) (vía CDN de jsDelivr, versión `1.21.11`), sin empaquetar texturas de Mojang en el repo.

Orden de resolución por bloque (`src/textureResolver.ts`):

1. Textura oficial resuelta desde `blocks_textures.json` (mapping block → textura real, incluye casos donde el bloque no tiene textura propia, ej. `mangrove_stairs` → `mangrove_planks`).
2. `blocks/<id>.png` (coincidencia directa).
3. `items/<id>.png` (coincidencia directa como item).
4. `blocks/<id>_top.png` (bloques con textura superior distinta, ej. troncos).
5. Para variantes de forma (`_wall`, `_stairs`, `_slab`, `_fence`, `_fence_gate`, `_door`, `_button`, `_pressure_plate`) que el manifest no resolvió: se prueba la textura del material base y su forma plural (ej. `red_nether_brick_wall` → `red_nether_bricks`).
6. Si ninguna candidata carga, se muestra un placeholder estilo "missing texture" de Minecraft (cuadros magenta/negro).

El manifest de texturas se cachea en `localStorage` por 7 días para no volver a descargarlo en cada visita.

## Limitaciones conocidas

- Algunos bloques muy recientes o con formas irregulares pueden no tener textura mapeada y caer al placeholder.
- Los iconos son texturas planas (2D), no los renders isométricos que Minecraft muestra en su inventario real para bloques con forma (escaleras, losas, etc.).

## Stack

- React 19 + TypeScript
- Vite
- Sin dependencias de UI externas (CSS propio inspirado en el GUI de Minecraft)
