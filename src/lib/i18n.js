// Minimal i18n: reactive locale + t(key, params). Placeholders: {name}
import { ref, watch } from 'vue'

const STORAGE_KEY = 'stationeers-sorter-locale'

const messages = {
  de: {
    'app.source': 'Quellcode auf GitHub',
    'app.subtitle': 'Anweisungen für den Stationeers Logic Sorter zusammenstellen und als IC10-Code exportieren.',

    'settings.device': 'Gerät',
    'settings.clear': 'Speicher leeren (clr)',
    'settings.setMode': 'Mode setzen',
    'settings.register': 'Register',
    'settings.style': 'Code-Stil',
    'settings.compact': 'Kompakt (vorberechnete Zahlen)',
    'settings.compactHint': 'Berechnet jede Anweisung vorab als Zahl – 1 Zeile pro Eintrag.',
    'settings.comments': 'Kommentare',
    'style.ins': 'ins (Bitfeld einfügen)',
    'style.shift': 'sll / or',

    'mode.All': 'All – alle Filter müssen zutreffen',
    'mode.Any': 'Any – mind. ein Filter muss zutreffen',
    'mode.None': 'None – kein Filter darf zutreffen',

    'add.prefab': '+ Prefab',
    'add.sortingClass': '+ Sorting Class',
    'add.slotType': '+ Slot-Typ',
    'add.quantity': '+ Menge',
    'add.limit': '+ Limit',
    'btn.import': 'IC10 importieren',
    'btn.clearAll': 'Alle löschen',
    'btn.copy': 'Kopieren',
    'btn.copied': 'Kopiert ✓',
    'btn.close': 'Schließen',
    'btn.cancel': 'Abbrechen',
    'btn.apply': 'Übernehmen',
    'confirm.clearAll': 'Alle Anweisungen entfernen?',
    'confirm.replace': 'Aktuelle Anweisungen durch den Import ersetzen?',
    'empty': 'Noch keine Anweisungen – oben eine hinzufügen.',

    'out.lines': '{n} / {max} Zeilen',
    'out.slots': '{n} / {max} Slots',
    'warn.invalid': '{n} fehlerhafte Anweisung(en)',
    'warn.tooManyLines': 'Zu viele Zeilen für einen Chip – „Kompakt“ aktivieren oder aufteilen.',
    'warn.longLines': '{n} Zeile(n) länger als {max} Zeichen',
    'warn.tooManyInstructions': 'Der Sorter hat nur {max} Speicherplätze ({n} Anweisungen).',

    'import.title': 'IC10 importieren',
    'import.hint': 'Bestehenden Sorter-Code einfügen – die put-Anweisungen werden in die Liste übernommen.',
    'import.none': 'Keine Sorter-Anweisungen (put) gefunden.',
    'imp.line': 'Zeile {n}',
    'imp.unknownValue': 'Unbekannter Wert „{v}“',
    'imp.registerExpected': 'Register erwartet: {v}',
    'imp.ignored': '„{v}“ ignoriert',
    'imp.unknownOpcode': 'Opcode {v} unbekannt – übersprungen',
    'imp.unknownCondition': 'Bedingung {v} unbekannt',
    'imp.unknownSortingClass': 'Sorting Class {v} unbekannt',

    'op.FilterPrefabHashEquals': 'Prefab ist gleich',
    'op.FilterPrefabHashNotEquals': 'Prefab ist ungleich',
    'op.FilterSortingClassCompare': 'Sorting Class vergleichen',
    'op.FilterSlotTypeCompare': 'Slot-Typ vergleichen',
    'op.FilterQuantityCompare': 'Menge vergleichen',
    'op.LimitNextExecutionByCount': 'Nächste Anweisung begrenzen',

    'row.prefabPlaceholder': 'Prefab-Name oder Hash',
    'row.slotPlaceholder': 'z.B. SlotClass.Ore oder Zahl',
    'row.resolvedInGame': 'Wert wird im Spiel aufgelöst',
    'row.up': 'Nach oben',
    'row.down': 'Nach unten',
    'row.duplicate': 'Duplizieren',
    'row.remove': 'Entfernen',

    'val.prefabMissing': 'Prefab-Name fehlt',
    'val.prefabChars': 'Prefab-Name darf keine Leerzeichen/Anführungszeichen enthalten',
    'val.slotMissing': 'Slot-Typ fehlt',
    'val.slotSpaces': 'Slot-Typ darf keine Leerzeichen enthalten',
    'val.range': 'Wert muss zwischen {min} und {max} liegen',
  },
  en: {
    'app.source': 'Source code on GitHub',
    'app.subtitle': 'Build instructions for the Stationeers Logic Sorter and export them as IC10 code.',

    'settings.device': 'Device',
    'settings.clear': 'Clear memory (clr)',
    'settings.setMode': 'Set mode',
    'settings.register': 'Register',
    'settings.style': 'Code style',
    'settings.compact': 'Compact (precomputed numbers)',
    'settings.compactHint': 'Precomputes every instruction as a number – 1 line per entry.',
    'settings.comments': 'Comments',
    'style.ins': 'ins (insert bit field)',
    'style.shift': 'sll / or',

    'mode.All': 'All – every filter must match',
    'mode.Any': 'Any – at least one filter must match',
    'mode.None': 'None – no filter may match',

    'add.prefab': '+ Prefab',
    'add.sortingClass': '+ Sorting class',
    'add.slotType': '+ Slot type',
    'add.quantity': '+ Quantity',
    'add.limit': '+ Limit',
    'btn.import': 'Import IC10',
    'btn.clearAll': 'Clear all',
    'btn.copy': 'Copy',
    'btn.copied': 'Copied ✓',
    'btn.close': 'Close',
    'btn.cancel': 'Cancel',
    'btn.apply': 'Apply',
    'confirm.clearAll': 'Remove all instructions?',
    'confirm.replace': 'Replace the current instructions with the import?',
    'empty': 'No instructions yet – add one above.',

    'out.lines': '{n} / {max} lines',
    'out.slots': '{n} / {max} slots',
    'warn.invalid': '{n} invalid instruction(s)',
    'warn.tooManyLines': 'Too many lines for one chip – enable “Compact” or split it up.',
    'warn.longLines': '{n} line(s) longer than {max} characters',
    'warn.tooManyInstructions': 'The sorter only has {max} memory slots ({n} instructions).',

    'import.title': 'Import IC10',
    'import.hint': 'Paste existing sorter code – its put instructions are loaded into the list.',
    'import.none': 'No sorter instructions (put) found.',
    'imp.line': 'Line {n}',
    'imp.unknownValue': 'Unknown value “{v}”',
    'imp.registerExpected': 'Register expected: {v}',
    'imp.ignored': '“{v}” ignored',
    'imp.unknownOpcode': 'Unknown opcode {v} – skipped',
    'imp.unknownCondition': 'Unknown condition {v}',
    'imp.unknownSortingClass': 'Unknown sorting class {v}',

    'op.FilterPrefabHashEquals': 'Prefab equals',
    'op.FilterPrefabHashNotEquals': 'Prefab not equals',
    'op.FilterSortingClassCompare': 'Compare sorting class',
    'op.FilterSlotTypeCompare': 'Compare slot type',
    'op.FilterQuantityCompare': 'Compare quantity',
    'op.LimitNextExecutionByCount': 'Limit next instruction',

    'row.prefabPlaceholder': 'Prefab name or hash',
    'row.slotPlaceholder': 'e.g. SlotClass.Ore or number',
    'row.resolvedInGame': 'Value is resolved in game',
    'row.up': 'Move up',
    'row.down': 'Move down',
    'row.duplicate': 'Duplicate',
    'row.remove': 'Remove',

    'val.prefabMissing': 'Prefab name missing',
    'val.prefabChars': 'Prefab name must not contain spaces/quotes',
    'val.slotMissing': 'Slot type missing',
    'val.slotSpaces': 'Slot type must not contain spaces',
    'val.range': 'Value must be between {min} and {max}',
  },
}

export const LOCALES = ['de', 'en']

function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.includes(saved)) return saved
  } catch { /* ignore */ }
  return navigator.language?.startsWith('de') ? 'de' : 'en'
}

export const locale = ref(initialLocale())

watch(locale, (l) => {
  if (typeof document !== 'undefined') document.documentElement.lang = l
  try { localStorage.setItem(STORAGE_KEY, l) } catch { /* ignore */ }
}, { immediate: true })

export function t(key, params = {}) {
  const msg = messages[locale.value][key] ?? messages.en[key] ?? key
  return msg.replace(/\{(\w+)\}/g, (_, p) => params[p] ?? `{${p}}`)
}
