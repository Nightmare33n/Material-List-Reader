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
- Grid tipo inventario de Minecraft: slots beveled, modelos 3D girando, contador tipo stack.
- Conteo en **stacks** o en items, con toggle. El tamaño de stack es el real de cada item (los carteles son 16, no 64).
- Tooltip por bloque: nombre, id, total en items, desglose en stacks y en shulkers.
- Búsqueda por nombre/id y orden por cantidad (asc/desc) o alfabético.

### Formato del conteo

En modo stacks, la esquina del slot muestra una etiqueta compacta:

| Cantidad | Stack | Etiqueta | Significado |
| --- | --- | --- | --- |
| 619 | 64 | `9x64+43` | 9 stacks y 43 sueltos |
| 352 | 64 | `5x64+32` | 5 stacks y 32 sueltos |
| 128 | 64 | `2x64` | 2 stacks exactos |
| 43 | 64 | `43` | menos de un stack |
| 55 | 16 | `3x16+7` | carteles: stack de 16 |

El tooltip siempre muestra el total exacto y, a partir de 27 stacks, el equivalente en shulker boxes.

## Modelos 3D

Cada bloque se renderiza con su **modelo real de Minecraft**, no con una textura plana, así que se distinguen escaleras, losas, trampillas, vallas y muros de un bloque completo.

El pipeline (`src/mc/`):

1. `modelResolver.ts` descarga `blocks_models.json` de [`PrismarineJS/minecraft-assets`](https://github.com/PrismarineJS/minecraft-assets) (vía jsDelivr, versión `1.21.11`) y resuelve la cadena de `parent` del modelo, heredando texturas y `elements`. Para bloques cuyo modelo depende del blockstate se prueban sufijos (`_inventory`, `_bottom`, `_post`, `_1`, `_top`) y se quita el prefijo `waxed_`.
2. `buildMesh.ts` convierte los `elements` en geometría: cada cara se emite como un quad con sus UVs del modelo (incluida la rotación de cara), aplicando las rotaciones de elemento con `rescale`. Se genera una malla por textura y el sombreado se hornea en los colores de vértice.
3. `renderPool.ts` dibuja todos los bloques con un único canvas WebGL.

### Rendimiento del render

Un canvas por slot no escala: los navegadores limitan los contextos WebGL activos (~16), y copiar cada render al canvas del slot con `drawImage` obliga a un viaje GPU → CPU → GPU por bloque y por frame, que es lo que hacía ir la página a tirones.

En su lugar hay **un solo canvas WebGL fijo al viewport**, detrás de la rejilla. Cada slot solo reserva su hueco; el render loop recorre los bloques, lee el rectángulo del slot y dibuja dentro de él con `setViewport` + `setScissor`. Así no se copia nada de vuelta por CPU y el framebuffer no crece con la longitud de la lista.

Además:

- **`powerPreference: "high-performance"`**, para pedir la GPU dedicada en equipos que tengan dos. Si el navegador no da contexto WebGL, todos los bloques caen a icono plano en vez de romperse.
- **Culling por viewport**: los slots fuera de pantalla ni se dibujan, así que el coste depende de lo que se ve, no del tamaño de la lista.
- **30 FPS**: el giro se ve igual de fluido y son la mitad de draw calls.
- **Materiales compartidos**: el sombreado y el tinte van en los colores de vértice, así que el material solo depende de la textura y se reutiliza entre bloques (las escaleras, la losa y los tablones de mangle comparten uno).

Detalles que replican el render de Minecraft:

- **Sombreado por cara** con los factores fijos del juego (arriba 1.0, abajo 0.5, norte/sur 0.8, este/oeste 0.6) en vez de luces reales.
- **Escala compartida**: todos los bloques se encuadran igual, así que una losa se ve a media altura y una cadena delgada, como en el inventario.
- **Tinte de bioma** (`tints.ts`): Minecraft guarda el césped y el follaje en escala de grises y los multiplica por un color de bioma al renderizar; por eso `grass_block_top` se ve gris si no se tinta. Se aplica el color del bioma llanura a las caras con `tintindex`, más los casos que Mojang tiene hardcodeados (abeto, abedul, nenúfar, agua, redstone, tallos).

### Bloques sin modelo

Carteles, cofres, camas, banners y estatuas los dibuja el juego como entidades y no tienen geometría; los items normales tampoco. Esos usan un icono plano (`BlockIcon2D.tsx`), buscando en este orden:

1. La textura que Mojang declara para el item en `items_textures.json`.
2. La textura `particle` del modelo del bloque, que es la imagen que el juego usa para representarlo (cubre las estatuas de golem de cobre).
3. `items/<id>.png` y `blocks/<id>.png`.
4. `items/<id>_00.png`, para items animados que traen un PNG por frame (brújula, reloj).

Excepción propia: los banners declaran `oak_planks` como icono porque el real se compone de patrones en runtime, así que se sustituye por la lana del color correspondiente.

Con esta cascada los 1504 items del juego muestran algo; el placeholder magenta/negro de "missing texture" queda solo como red de seguridad.

## Caché

- `items.json` (nombres y tamaños de stack) e `items_textures.json` (iconos planos) se guardan en `localStorage` 7 días.
- `blocks_models.json` pesa ~1.4 MB, demasiado para `localStorage`, así que se descarga una vez por carga de página y se deja en la caché HTTP del navegador.
- Las texturas se comparten entre bloques mediante una caché en memoria.

## Limitaciones conocidas

- Se muestra siempre la variante por defecto del bloque (una trampilla se ve cerrada, un muro como poste), porque la material list no guarda blockstates.
- El tinte de bioma es el de llanuras; en otros biomas el verde real difiere.
- Los bloques con render de entidad se ven en 2D, y algunos con la textura genérica que declara Mojang (el cofre sale como tablas de roble).

## Stack

- React 19 + TypeScript
- Vite
- three.js para el render de modelos
- Sin librerías de UI (CSS propio inspirado en el GUI de Minecraft)
