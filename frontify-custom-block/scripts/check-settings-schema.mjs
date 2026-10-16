// check-settings-schema.mjs — settingsSchema validator for Frontify Content Blocks
//
// Invoked by check-settings-schema.sh. Not intended to be run directly.
//
// Tier A validates manifest.json on its own. Tier B additionally cross-checks the schema
// against src/settings.ts by importing it through Node's built-in TypeScript stripping.
// Tier B degrades to a notice when the import fails; it never guesses.
//
// This file reimplements a subset of Frontify's Marketplace review rules, under the same
// check IDs, so that authors can self-check before submitting. It is a stand-in: once the
// official review tooling is published for external use, retire this script in favour of
// it rather than growing the rule set here. See MAINTENANCE in check-settings-schema.sh.

import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

// ─── Setting type table ──────────────────────────────────────────────────────
//
// Derived by reading the BaseBlock<AppBridge, T> value parameter of each *Block type in
// @frontify/sidebar-settings@0.12.0/dist/index.d.ts, as pulled in by
// @frontify/guideline-blocks-settings@2.1.11. T is the value the setting stores; T defaulting
// to undefined means the setting stores nothing. Mirrors references/settings-schema.md § 6 —
// update both together. Re-derive with:
//   grep -n -B2 'BaseBlock<' node_modules/@frontify/sidebar-settings/dist/index.d.ts
//
// Where a mapping is looser than the declared T (extra 'null', or an omitted type), that is
// deliberate: a schema wider than reality never rejects a legitimate save, while one that is
// too narrow breaks the block at runtime.
// jsonTypes: null means the stored shape was not confirmed; type compatibility is then skipped
// rather than guessed.

const TYPES = {
    input: { jsonTypes: ['string'], textBearing: true },
    textarea: { jsonTypes: ['string'], textBearing: true },
    switch: { jsonTypes: ['boolean'] },
    dropdown: { jsonTypes: ['string', 'number', 'null'], hasChoices: true }, // ChoicesType T = string | number
    segmentedControls: { jsonTypes: ['string', 'number'], hasChoices: true },
    checklist: { jsonTypes: ['array', 'null'] },
    // T is undefined — the container stores nothing, but the review tooling still requires a
    // property for its id. jsonTypes null so a property is demanded without asserting a shape.
    multiInput: { jsonTypes: null },
    colorInput: { jsonTypes: ['object', 'null'] },
    fontInput: { jsonTypes: ['string', 'object', 'null'] },
    link: { jsonTypes: ['object', 'null'] },
    assetInput: { jsonTypes: null },
    legacyAssetInput: { jsonTypes: null },
    templateInput: { jsonTypes: ['number'] },
    notification: { jsonTypes: null, storesValue: false },
    // T is boolean, but only meaningful with `hasSwitch: true` — see the advisory below.
    sectionHeading: { jsonTypes: ['boolean'], storesValue: false },
    slider: { jsonTypes: ['string', 'number'], hasChoices: true, deprecated: "use type: 'segmentedControls'" },
    linkChooser: { jsonTypes: ['object', 'null'], deprecated: "use type: 'link'" },
};

const KEYWORDS = {
    'frontify-api-read': 'boolean',
    'frontify-api-write': 'boolean',
    'frontify-type': 'string',
    'frontify-translatable': 'boolean',
    'frontify-machine-translatable': 'boolean',
    'frontify-serializable': 'boolean',
    'frontify-serialization-index': 'integer',
};

const FRONTIFY_TYPE_VALUES = ['fondueRte'];
const JSON_SCHEMA_TYPES = ['null', 'boolean', 'object', 'array', 'number', 'string', 'integer'];
const CONDITIONAL = ['oneOf', 'anyOf', 'allOf', 'if', 'then', 'else', 'not'];

// ─── Findings ────────────────────────────────────────────────────────────────

const findings = [];
const notices = [];
const add = (severity, id, message, line) => findings.push({ severity, id, message, line });
const storesValue = (info) => !info || info.storesValue !== false;

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const settingsFileNote = (f) => `src/settings.ts calls setting factories (${f.join(', ')})`;

// ─── Schema walk ─────────────────────────────────────────────────────────────

function walkSchema(root) {
    const nodes = [];
    const visit = (node, pointer, insideConditional) => {
        if (!isPlainObject(node)) {
            return;
        }
        const declaredTypes = node.type === undefined ? [] : [].concat(node.type);
        const hasChildren = Boolean(node.properties || node.items || node.prefixItems);
        const isContainer = hasChildren || declaredTypes.includes('object') || declaredTypes.includes('array');
        nodes.push({ node, pointer, insideConditional, isContainer });

        for (const key of CONDITIONAL) {
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach((c, i) => visit(c, `${pointer}/${key}/${i}`, true));
            } else if (isPlainObject(child)) {
                visit(child, `${pointer}/${key}`, true);
            }
        }
        for (const key of ['properties', '$defs', 'definitions']) {
            if (isPlainObject(node[key])) {
                for (const [name, child] of Object.entries(node[key])) {
                    visit(child, `${pointer}/${key}/${name}`, insideConditional);
                }
            }
        }
        if (isPlainObject(node.items)) {
            visit(node.items, `${pointer}/items`, insideConditional);
        }
        if (Array.isArray(node.prefixItems)) {
            node.prefixItems.forEach((c, i) => visit(c, `${pointer}/prefixItems/${i}`, insideConditional));
        }
        if (isPlainObject(node.additionalProperties)) {
            visit(node.additionalProperties, `${pointer}/additionalProperties`, insideConditional);
        }
    };
    visit(root, '', false);
    return nodes;
}

// ─── Tier A — manifest only ──────────────────────────────────────────────────

function tierA(manifestPath) {
    let manifest;
    try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
        add('blocker', 'FB-MF-003', `manifest.json does not parse: ${error.message}`);
        return null;
    }

    if (typeof manifest.appId !== 'string' || manifest.appId.trim() === '') {
        add('blocker', 'FB-MF-003', 'manifest.json has no appId, or it is empty');
    } else if (/^<.*>$/.test(manifest.appId.trim())) {
        add('blocker', 'FB-MF-003', `appId is still the placeholder "${manifest.appId}"`);
    }

    for (const legacy of ['i18nFields', 'searchFields']) {
        if (manifest[legacy] !== undefined) {
            const withSchema = manifest.settingsSchema !== undefined;
            add(
                withSchema ? 'blocker' : 'major',
                'FB-MF-004',
                withSchema
                    ? `manifest.json declares both settingsSchema and ${legacy} — they are mutually exclusive and the manifest is rejected`
                    : `${legacy} is removed in favour of settingsSchema`,
            );
        }
    }

    const schema = manifest.settingsSchema;
    if (schema === undefined) {
        return { manifest, schema: null };
    }
    if (!isPlainObject(schema)) {
        add('blocker', 'FB-SCH-010', 'settingsSchema is not an object');
        return { manifest, schema: null };
    }

    const rootTypes = schema.type === undefined ? [] : [].concat(schema.type);
    if (!rootTypes.includes('object')) {
        add(
            'blocker',
            'FB-SCH-010',
            `settingsSchema root type is ${JSON.stringify(schema.type ?? '<unset>')}, expected "object"`,
        );
    }
    if (schema.additionalProperties !== false) {
        add('minor', 'FB-SCH-006', 'settingsSchema root does not set "additionalProperties": false');
    }
    if (schema.$schema !== undefined && !String(schema.$schema).includes('2020-12')) {
        add('minor', 'FB-SCH-011', `$schema is ${JSON.stringify(schema.$schema)}, expected JSON Schema draft 2020-12`);
    }

    const nodes = walkSchema(schema);
    const known = Object.keys(KEYWORDS);

    for (const entry of nodes) {
        const where = entry.pointer || '<root>';
        if (entry.node.type !== undefined) {
            for (const declared of [].concat(entry.node.type)) {
                if (!JSON_SCHEMA_TYPES.includes(declared)) {
                    add(
                        'blocker',
                        'FB-SCH-011',
                        `${JSON.stringify(declared)} at ${where} is not a JSON Schema type (allowed: ${JSON_SCHEMA_TYPES.join(', ')}) — this subschema can never match`,
                    );
                }
            }
        }
        for (const [key, value] of Object.entries(entry.node)) {
            if (!key.startsWith('frontify-')) {
                continue;
            }
            if (!known.includes(key)) {
                add('major', 'FB-SCH-015', `unknown keyword "${key}" at ${where} — check the spelling`);
                continue;
            }
            if (entry.isContainer) {
                add('major', 'FB-SCH-012', `${key} sits on container ${where} — keywords are ignored on object/array nodes`);
            }
            if (entry.insideConditional) {
                add(
                    'major',
                    'FB-SCH-013',
                    `${key} sits inside a conditional branch at ${where} — not statically resolvable, so it is ignored`,
                );
            }
            const expected = KEYWORDS[key];
            const ok =
                expected === 'boolean'
                    ? typeof value === 'boolean'
                    : expected === 'integer'
                      ? Number.isInteger(value)
                      : typeof value === 'string';
            if (!ok) {
                add('major', 'FB-SCH-016', `${key} at ${where} must be ${expected}, got ${JSON.stringify(value)}`);
            }
        }
        const declaredType = entry.node['frontify-type'];
        if (declaredType !== undefined && !FRONTIFY_TYPE_VALUES.includes(declaredType)) {
            add(
                'major',
                'FB-SCH-014',
                `frontify-type ${JSON.stringify(declaredType)} at ${where} is not supported (allowed: ${FRONTIFY_TYPE_VALUES.join(', ')})`,
            );
        }
    }

    const serializable = nodes
        .filter((e) => e.node['frontify-serializable'] === true)
        .map((e) => ({ pointer: e.pointer || '<root>', index: e.node['frontify-serialization-index'] }));

    if (serializable.length > 1) {
        for (const field of serializable.filter((f) => !Number.isInteger(f.index))) {
            add(
                'major',
                'FB-SER-002',
                `serializable field ${field.pointer} has no frontify-serialization-index, so concatenation order is undefined`,
            );
        }
        const byIndex = new Map();
        for (const field of serializable.filter((f) => Number.isInteger(f.index))) {
            byIndex.set(field.index, [...(byIndex.get(field.index) ?? []), field.pointer]);
        }
        for (const [index, pointers] of byIndex) {
            if (pointers.length > 1) {
                add('major', 'FB-SER-003', `frontify-serialization-index ${index} is used by ${pointers.join(' and ')}`);
            }
        }
    }

    return { manifest, schema };
}

// ─── Tier B — cross-check against src/settings.ts ────────────────────────────

function flattenSettings(root) {
    const found = [];
    const seen = new Set();
    const visit = (node) => {
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (!isPlainObject(node) || seen.has(node)) {
            return;
        }
        seen.add(node);
        if (typeof node.id === 'string' && typeof node.type === 'string') {
            found.push(node);
        }
        for (const value of Object.values(node)) {
            if (isPlainObject(value) || Array.isArray(value)) {
                visit(value);
            }
        }
    };
    visit(root);
    return found;
}

const jsTypeOf = (value) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (Number.isInteger(value)) return 'integer';
    return typeof value;
};

// Two ways to read the settings, tried in order.
//
// 1. TypeScript AST. Preferred, and what the Marketplace review tooling uses. Never executes the
//    module, so an exotic transitive import cannot break it, and it yields line numbers.
//    Cannot see through setting factories (getBorderSettings()) or computed values; those are
//    reported as unresolved rather than guessed.
// 2. Importing the module through Node's type stripping. Resolves factories and computed values,
//    but any dependency in the import graph that Node refuses to load takes the whole pass with
//    it — a transitive .json import without an import attribute is enough. Fallback only.

function loadTypeScript(target) {
    for (const from of [path.join(target, 'package.json'), path.join(process.cwd(), 'package.json')]) {
        try {
            return createRequire(from)('typescript');
        } catch {
            /* try the next resolution root */
        }
    }
    return null;
}

function literalOf(ts, node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
        return -Number(node.operand.text);
    }
    if (ts.isArrayLiteralExpression(node)) {
        const out = [];
        for (const el of node.elements) {
            if (ts.isSpreadElement(el)) return UNRESOLVED;
            const v = literalOf(ts, el);
            if (v === UNRESOLVED) return UNRESOLVED;
            out.push(v);
        }
        return out;
    }
    if (ts.isObjectLiteralExpression(node)) {
        const out = {};
        for (const prop of node.properties) {
            if (!ts.isPropertyAssignment(prop) || !prop.name) return UNRESOLVED;
            const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null;
            if (key === null) return UNRESOLVED;
            const v = literalOf(ts, prop.initializer);
            if (v === UNRESOLVED) return UNRESOLVED;
            out[key] = v;
        }
        return out;
    }
    return UNRESOLVED;
}

const UNRESOLVED = Symbol('unresolved');

function extractViaAst(ts, settingsPath) {
    const sf = ts.createSourceFile(
        settingsPath,
        readFileSync(settingsPath, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
    const settings = [];
    const factories = [];
    const visit = (node) => {
        if (ts.isObjectLiteralExpression(node)) {
            const props = new Map();
            for (const prop of node.properties) {
                if (ts.isPropertyAssignment(prop) && prop.name) {
                    const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null;
                    if (key !== null) props.set(key, prop.initializer);
                }
            }
            const id = props.has('id') ? literalOf(ts, props.get('id')) : undefined;
            const type = props.has('type') ? literalOf(ts, props.get('type')) : undefined;
            if (typeof id === 'string' && typeof type === 'string') {
                const read = (k) => (props.has(k) ? literalOf(ts, props.get(k)) : undefined);
                const setting = {
                    id,
                    type,
                    line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
                    hasSwitch: read('hasSwitch'),
                };
                const dv = read('defaultValue');
                if (dv !== undefined && dv !== UNRESOLVED) setting.defaultValue = dv;
                const ch = read('choices');
                if (Array.isArray(ch)) setting.choices = ch;
                settings.push(setting);
            }
        }
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && /^get[A-Z]/.test(node.expression.text)) {
            factories.push(node.expression.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return { settings, factories: [...new Set(factories)] };
}

async function extractViaImport(settingsPath) {
    const module = await import(pathToFileURL(settingsPath).href);
    let resolved = module.settings ?? module.default;
    if (typeof resolved === 'function') resolved = await resolved();
    if (!isPlainObject(resolved)) throw new Error('no `settings` export found');
    return { settings: flattenSettings(resolved), factories: [] };
}

async function tierB(settingsPath, schema, target) {
    let settings = null;
    let factories = [];

    const ts = loadTypeScript(target);
    if (ts) {
        try {
            ({ settings, factories } = extractViaAst(ts, settingsPath));
        } catch (error) {
            notices.push(`AST read of ${path.basename(settingsPath)} failed: ${error.message.split('\n')[0]}`);
        }
    }
    if (settings === null) {
        try {
            ({ settings, factories } = await extractViaImport(settingsPath));
        } catch (error) {
            notices.push(
                `cross-check unavailable — could not read ${path.basename(settingsPath)}: ${error.message.split('\n')[0]}`,
            );
            notices.push(
                ts
                    ? '  walk the checklist in references/settings-schema.md § 10 instead'
                    : '  run `npm install` in this project so typescript resolves, or walk the checklist in references/settings-schema.md § 10',
            );
            return;
        }
    }

    if (settings.length === 0) {
        notices.push('cross-check found no settings to compare');
        return;
    }
    if (factories.length > 0) {
        notices.push(
            `${settingsFileNote(factories)} — their ids are not visible from the source, so unmatched schema properties are not reported`,
        );
    }

    const counts = new Map();
    for (const setting of settings) {
        counts.set(setting.id, (counts.get(setting.id) ?? 0) + 1);
    }
    const lineOf = (id) => settings.find((s) => s.id === id)?.line;
    for (const [id, count] of counts) {
        if (count > 1) {
            add('blocker', 'FB-SET-004', `setting id "${id}" is declared ${count} times — they overwrite each other`, lineOf(id));
        }
    }

    for (const setting of settings) {
        if (!TYPES[setting.type]) {
            add(
                'major',
                'FB-SET-001',
                `setting "${setting.id}" has unknown type "${setting.type}" — a typo, or a newer package than this table was validated against`,
            );
        } else if (TYPES[setting.type].deprecated) {
            add('minor', 'FB-SET-002', `setting "${setting.id}" uses deprecated type "${setting.type}" — ${TYPES[setting.type].deprecated}`);
        }
    }

    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    const valueSettings = settings.filter((s) => storesValue(TYPES[s.type]));
    const strict = schema.additionalProperties === false;

    for (const setting of settings) {
        if (setting.type === 'sectionHeading' && setting.hasSwitch === true && !Object.hasOwn(properties, setting.id)) {
            add(
                'major',
                'FB-SCH-001',
                `sectionHeading "${setting.id}" sets hasSwitch: true, so it stores a boolean, but it has no property in settingsSchema — the toggle state cannot be saved`,
                setting.line,
            );
        }
    }

    for (const setting of valueSettings) {
        if (!Object.hasOwn(properties, setting.id)) {
            add(
                'blocker',
                'FB-SCH-001',
                `setting "${setting.id}" (${setting.type}) has no property in settingsSchema${
                    strict ? ', and additionalProperties is false, so its value can never be saved' : ''
                }`,
                setting.line,
            );
        }
    }

    if (factories.length === 0) {
        const declaredIds = new Set(valueSettings.map((s) => s.id));
        for (const name of Object.keys(properties)) {
            if (!declaredIds.has(name)) {
                add('minor', 'FB-SCH-002', `schema property "${name}" has no matching setting in src/settings.ts`);
            }
        }
    }

    for (const setting of valueSettings) {
        const prop = properties[setting.id];
        const info = TYPES[setting.type];
        if (!isPlainObject(prop) || !info) {
            continue;
        }

        if (info.jsonTypes !== null && prop.type !== undefined) {
            const declared = [].concat(prop.type);
            if (!declared.some((t) => info.jsonTypes.includes(t))) {
                add(
                    'major',
                    'FB-SCH-003',
                    `setting "${setting.id}" is type ${setting.type} (stores ${info.jsonTypes.join('|')}) but its schema declares type ${JSON.stringify(prop.type)}`,
                );
            }
        }

        if (info.hasChoices && Array.isArray(prop.enum) && Array.isArray(setting.choices)) {
            const choiceValues = setting.choices.filter(isPlainObject).map((c) => c.value);
            for (const value of choiceValues.filter((v) => v !== undefined && !prop.enum.includes(v))) {
                add('major', 'FB-SCH-004', `setting "${setting.id}" offers choice ${JSON.stringify(value)} which the schema enum rejects`);
            }
            for (const value of prop.enum.filter((v) => !choiceValues.includes(v))) {
                add('major', 'FB-SCH-004', `schema enum for "${setting.id}" allows ${JSON.stringify(value)} which the setting never offers`);
            }
        }

        // Partial FB-SCH-005: type and enum only. Full JSON Schema validation of defaults
        // (minimum, pattern, required, …) needs a schema engine — verify-manifest is the backstop.
        if (setting.defaultValue !== undefined) {
            const actual = jsTypeOf(setting.defaultValue);
            if (prop.type !== undefined) {
                const declared = [].concat(prop.type);
                const compatible = declared.includes(actual) || (actual === 'integer' && declared.includes('number'));
                if (!compatible) {
                    add(
                        'blocker',
                        'FB-SCH-005',
                        `defaultValue for "${setting.id}" is ${actual} (${JSON.stringify(setting.defaultValue)}) but its schema declares type ${JSON.stringify(prop.type)}`,
                    );
                }
            }
            if (Array.isArray(prop.enum) && !prop.enum.includes(setting.defaultValue)) {
                add('blocker', 'FB-SCH-005', `defaultValue ${JSON.stringify(setting.defaultValue)} for "${setting.id}" is not in the schema enum`);
            }
        }

        if (info.textBearing) {
            if (prop['frontify-translatable'] !== true) {
                add('major', 'FB-I18N-001', `"${setting.id}" (${setting.type}) holds user copy but is not marked frontify-translatable`);
            }
            if (prop['frontify-serializable'] !== true) {
                add('major', 'FB-SER-001', `"${setting.id}" (${setting.type}) holds user copy but is not marked frontify-serializable`);
            }
        }
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

const target = process.argv[2] ?? process.cwd();
const manifestPath = path.join(target, 'manifest.json');

const result = tierA(manifestPath);

if (result === null) {
    // manifest.json did not parse; nothing further is meaningful.
} else if (result.schema === null) {
    const settingsPath = ['src/settings.ts', 'src/settings.tsx']
        .map((p) => path.join(target, p))
        .find((p) => existsSync(p));
    let hint = '';
    if (settingsPath) {
        try {
            const ts = loadTypeScript(target);
            const extracted = ts
                ? extractViaAst(ts, settingsPath)
                : await extractViaImport(settingsPath);
            const ids = extracted.settings.filter((s) => storesValue(TYPES[s.type])).map((s) => s.id);
            if (ids.length > 0) {
                hint = ` — ${ids.length} value setting(s) declared in src/settings.ts (${ids.join(', ')})`;
            }
        } catch {
            /* fall through without the hint */
        }
    }
    add(
        'blocker',
        'FB-MF-002',
        `manifest.json has no settingsSchema${hint}. The block will not be translatable or searchable, and settings/content will be null on the public API`,
    );
} else {
    const settingsPath = ['src/settings.ts', 'src/settings.tsx']
        .map((p) => path.join(target, p))
        .find((p) => existsSync(p));
    if (!settingsPath) {
        notices.push('cross-check unavailable — no src/settings.ts found');
    } else {
        await tierB(settingsPath, result.schema, target);
    }
}

// ─── Report ──────────────────────────────────────────────────────────────────

const ORDER = ['blocker', 'major', 'minor'];
findings.sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity) || a.id.localeCompare(b.id));

for (const notice of notices) {
    process.stdout.write(`  ·  ${notice}\n`);
}
if (notices.length > 0 && findings.length > 0) {
    process.stdout.write('\n');
}
for (const finding of findings) {
    const where = finding.line ? `  (src/settings.ts:${finding.line})` : '';
    process.stdout.write(`  ✖  ${finding.severity.padEnd(7)} ${finding.id}  ${finding.message}${where}\n`);
}

if (findings.length === 0) {
    process.stdout.write(
        notices.length > 0
            ? '  ✔  no problems found in the checks that ran — see the notices above for what was skipped\n'
            : '  ✔  no settingsSchema problems found\n',
    );
    process.exit(0);
}

const counts = ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]).filter(([, n]) => n > 0);
process.stdout.write(`\n  ${findings.length} problem(s): ${counts.map(([s, n]) => `${n} ${s}`).join(', ')}\n`);
process.exit(3);
