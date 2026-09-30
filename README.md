# SortForge

A small web tool to build programs for the **Logic Sorter** in [Stationeers](https://store.steampowered.com/app/544550/Stationeers/) and export them as IC10 code.

Instead of shifting bits by hand, you pick the filter instructions in a list and copy the finished code into your IC chip.

**Live:** https://ghardo.github.io/stationeers-sort-forge/

## Features

- All sorter instructions: prefab hash equals / not equals, sorting class, slot type, quantity and "limit next execution by count"
- Mode selection: All / Any / None
- Three output styles:
  - `ins` – inserts each field as a bit field (default)
  - `sll` / `or` – classic shift-and-or
  - Compact – every instruction precomputed as a number, one `put` per line
- Import of existing IC10 sorter code (all three styles, plus `define` / `alias`)
- Checks for the IC10 limits (128 lines, 90 characters per line) and the sorter memory (32 instructions)
- UI in German and English
- Configuration is saved in the browser

## Example output

```
clr d0
s d0 Mode 1
move r0 SorterInstruction.FilterSortingClassCompare
ins r0 Equals 8 8
ins r0 SortingClass.Ores 16 16
put d0 0 r0
move r0 SorterInstruction.FilterPrefabHashEquals
ins r0 HASH("ItemSteelIngot") 8 32
put d0 1 r0
```

## Instruction layout

Each instruction is a 64-bit word in the sorter's memory (bit 0 = least significant bit).

| Instruction                 | Opcode `[0..7]` | Argument 1                      | Argument 2              |
| --------------------------- | --------------- | ------------------------------- | ----------------------- |
| `FilterPrefabHashEquals`    | 1               | Prefab hash `[8..39]`           |                         |
| `FilterPrefabHashNotEquals` | 2               | Prefab hash `[8..39]`           |                         |
| `FilterSortingClassCompare` | 3               | Condition `[8..15]`             | Sorting class `[16..31]` |
| `FilterSlotTypeCompare`     | 4               | Condition `[8..15]`             | Slot type `[16..31]`    |
| `FilterQuantityCompare`     | 5               | Condition `[8..15]`             | Quantity `[16..31]`     |
| `LimitNextExecutionByCount` | 6               | Count `[8..39]`                 |                         |

Conditions: `Equals` = 0, `Greater` = 1, `Less` = 2, `NotEquals` = 3.

Matching items go to the second export slot, everything else to the first one. Source: [Stationeers Community Wiki – Logic Sorter](https://stationeers-wiki.com/Logic_Sorter) and the in-game Stationpedia.

## Development

Requires Node.js 20 or newer.

```
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # static build in dist/
```

The build is a static site and can be hosted anywhere (relative paths, no server needed). The live version is published from the `gh-pages` branch.

Built with Vue 3 and Vite.

## License

[MIT](LICENSE)
