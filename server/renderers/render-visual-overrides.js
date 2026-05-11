const path = require('path');

const VISUAL_OVERRIDES_HREF = '/css/admin-visual-overrides.css?v=20260511-visual-editor1';
const VISUAL_OVERRIDES_RELATIVE_PATH = path.join('css', 'admin-visual-overrides.css');

const FONT_STACKS = new Set([
    "'Manrope', system-ui, sans-serif",
    "'Inter', system-ui, sans-serif",
    "'Montserrat', system-ui, sans-serif",
    "'El Messiri', 'Cormorant Garamond', serif",
    "'Cormorant Garamond', Georgia, serif",
    "Georgia, 'Times New Roman', serif"
]);

const PROPERTY_DEFINITIONS = Object.freeze({
    display: { css: 'display', type: 'enum', values: ['block', 'inline-block', 'flex', 'inline-flex', 'grid', 'none'] },
    flexDirection: { css: 'flex-direction', type: 'enum', values: ['row', 'row-reverse', 'column', 'column-reverse'] },
    justifyContent: { css: 'justify-content', type: 'enum', values: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] },
    alignItems: { css: 'align-items', type: 'enum', values: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'] },
    textAlign: { css: 'text-align', type: 'enum', values: ['left', 'center', 'right', 'start', 'end'] },
    fontFamily: { css: 'font-family', type: 'font' },
    fontSize: { css: 'font-size', type: 'length', min: 8, max: 120 },
    fontWeight: { css: 'font-weight', type: 'fontWeight' },
    lineHeight: { css: 'line-height', type: 'numberOrLength', min: 0.7, max: 3.2 },
    letterSpacing: { css: 'letter-spacing', type: 'length', min: -10, max: 30 },
    color: { css: 'color', type: 'color' },
    backgroundColor: { css: 'background-color', type: 'color' },
    width: { css: 'width', type: 'length', min: 0, max: 1600 },
    minWidth: { css: 'min-width', type: 'length', min: 0, max: 1600 },
    maxWidth: { css: 'max-width', type: 'length', min: 0, max: 1600 },
    height: { css: 'height', type: 'length', min: 0, max: 1600 },
    minHeight: { css: 'min-height', type: 'length', min: 0, max: 1600 },
    maxHeight: { css: 'max-height', type: 'length', min: 0, max: 1600 },
    paddingTop: { css: 'padding-top', type: 'length', min: 0, max: 260 },
    paddingRight: { css: 'padding-right', type: 'length', min: 0, max: 260 },
    paddingBottom: { css: 'padding-bottom', type: 'length', min: 0, max: 260 },
    paddingLeft: { css: 'padding-left', type: 'length', min: 0, max: 260 },
    marginTop: { css: 'margin-top', type: 'length', min: -260, max: 260 },
    marginRight: { css: 'margin-right', type: 'length', min: -260, max: 260 },
    marginBottom: { css: 'margin-bottom', type: 'length', min: -260, max: 260 },
    marginLeft: { css: 'margin-left', type: 'length', min: -260, max: 260 },
    gap: { css: 'gap', type: 'length', min: 0, max: 260 },
    rowGap: { css: 'row-gap', type: 'length', min: 0, max: 260 },
    columnGap: { css: 'column-gap', type: 'length', min: 0, max: 260 },
    borderRadius: { css: 'border-radius', type: 'length', min: 0, max: 260 },
    opacity: { css: 'opacity', type: 'number', min: 0, max: 1 },
    order: { css: 'order', type: 'integer', min: -50, max: 50 },
    translateX: { css: null, type: 'translate', min: -900, max: 900 },
    translateY: { css: null, type: 'translate', min: -900, max: 900 }
});

function clampNumber(value, fallback, min, max) {
    const parsed = Number.parseFloat(String(value ?? '').replace(/px$/i, ''));

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(Math.max(parsed, min), max);
}

function trimString(value) {
    return String(value ?? '').trim();
}

function normalizePublicPath(value) {
    const normalized = trimString(value) || '/';
    return normalized === '/index.html' ? '/' : normalized;
}

function normalizeSelector(value) {
    const selector = trimString(value);

    if (
        !selector ||
        selector.length > 360 ||
        /[{};@]/.test(selector) ||
        /\/\*/.test(selector) ||
        /[\r\n]/.test(selector)
    ) {
        return '';
    }

    return selector;
}

function normalizeLabel(value) {
    const label = trimString(value).replace(/\s+/g, ' ');
    return label.slice(0, 90);
}

function normalizeColor(value) {
    const normalized = trimString(value).toLowerCase();

    if (!normalized) {
        return '';
    }

    if (normalized === 'transparent' || normalized === 'currentcolor') {
        return normalized === 'currentcolor' ? 'currentColor' : normalized;
    }

    if (/^#[0-9a-f]{3}$/i.test(normalized)) {
        return `#${normalized.slice(1).split('').map((digit) => `${digit}${digit}`).join('')}`.toLowerCase();
    }

    if (/^#[0-9a-f]{6}$/i.test(normalized) || /^#[0-9a-f]{8}$/i.test(normalized)) {
        return normalized;
    }

    return '';
}

function formatPx(value) {
    return `${Number(value).toFixed(2).replace(/\.?0+$/, '')}px`;
}

function normalizeLength(value, definition) {
    const raw = trimString(value);

    if (!raw) {
        return '';
    }

    if (/^-?\d+(\.\d+)?px$/i.test(raw)) {
        return formatPx(clampNumber(raw, 0, definition.min, definition.max));
    }

    if (/^-?\d+(\.\d+)?(rem|em|%)$/i.test(raw)) {
        const parsed = Number.parseFloat(raw);

        if (!Number.isFinite(parsed) || parsed < definition.min || parsed > definition.max) {
            return '';
        }

        return raw.toLowerCase();
    }

    if (/^-?\d+(\.\d+)?$/.test(raw)) {
        return formatPx(clampNumber(raw, 0, definition.min, definition.max));
    }

    return '';
}

function normalizeNumber(value, definition) {
    const raw = trimString(value);
    const parsed = Number.parseFloat(raw);

    if (!raw || !Number.isFinite(parsed) || parsed < definition.min || parsed > definition.max) {
        return '';
    }

    return Number(parsed.toFixed(3)).toString();
}

function normalizeNumberOrLength(value, definition) {
    const raw = trimString(value);

    if (!raw) {
        return '';
    }

    if (/^\d+(\.\d+)?$/.test(raw)) {
        return normalizeNumber(raw, definition);
    }

    return normalizeLength(value, {
        ...definition,
        min: 0,
        max: 260
    });
}

function normalizeFontWeight(value) {
    const normalized = trimString(value).toLowerCase();

    if (/^(normal|bold|lighter|bolder)$/.test(normalized)) {
        return normalized;
    }

    if (/^[1-9]00$/.test(normalized)) {
        return normalized;
    }

    return '';
}

function normalizePropertyValue(name, value) {
    const definition = PROPERTY_DEFINITIONS[name];

    if (!definition) {
        return '';
    }

    if (definition.type === 'enum') {
        const normalized = trimString(value).toLowerCase();
        return definition.values.includes(normalized) ? normalized : '';
    }

    if (definition.type === 'font') {
        const normalized = trimString(value);
        return FONT_STACKS.has(normalized) ? normalized : '';
    }

    if (definition.type === 'color') {
        return normalizeColor(value);
    }

    if (definition.type === 'fontWeight') {
        return normalizeFontWeight(value);
    }

    if (definition.type === 'length') {
        return normalizeLength(value, definition);
    }

    if (definition.type === 'number') {
        return normalizeNumber(value, definition);
    }

    if (definition.type === 'numberOrLength') {
        return normalizeNumberOrLength(value, definition);
    }

    if (definition.type === 'integer') {
        const parsed = Number.parseInt(String(value ?? ''), 10);

        if (!Number.isFinite(parsed)) {
            return '';
        }

        return String(Math.min(Math.max(parsed, definition.min), definition.max));
    }

    if (definition.type === 'translate') {
        const raw = trimString(value);

        if (!raw) {
            return '';
        }

        return formatPx(clampNumber(raw, 0, definition.min, definition.max));
    }

    return '';
}

function normalizeProperties(properties = {}) {
    return Object.entries(PROPERTY_DEFINITIONS).reduce((result, [name]) => {
        const value = normalizePropertyValue(name, properties[name]);

        if (value) {
            result[name] = value;
        }

        return result;
    }, {});
}

function normalizeRule(rule = {}) {
    const selector = normalizeSelector(rule.selector);

    if (!selector) {
        return null;
    }

    const properties = normalizeProperties(rule.properties || {});

    if (Object.keys(properties).length === 0) {
        return null;
    }

    return {
        id: trimString(rule.id).slice(0, 80),
        publicPath: normalizePublicPath(rule.publicPath),
        selector,
        scopeSelector: normalizeSelector(rule.scopeSelector) || '',
        label: normalizeLabel(rule.label) || selector,
        properties,
        updatedAt: trimString(rule.updatedAt)
    };
}

function normalizeVisualEditorState(payload = {}) {
    const seenIds = new Set();
    const rules = Array.isArray(payload.rules)
        ? payload.rules
            .map(normalizeRule)
            .filter(Boolean)
            .map((rule, index) => {
                const fallbackId = `visual-rule-${index + 1}`;
                let id = rule.id || fallbackId;

                while (seenIds.has(id)) {
                    id = `${fallbackId}-${seenIds.size + 1}`;
                }

                seenIds.add(id);
                return { ...rule, id };
            })
        : [];

    return { rules };
}

function buildRuleSelector(rule) {
    const selector = normalizeSelector(rule.selector);
    const scopeSelector = normalizeSelector(rule.scopeSelector);

    if (!selector) {
        return '';
    }

    if (!scopeSelector || /^body\b/i.test(selector)) {
        return selector;
    }

    return `${scopeSelector} ${selector}`;
}

function renderDeclarationLines(properties = {}) {
    const lines = [];
    const translateX = properties.translateX || '';
    const translateY = properties.translateY || '';

    Object.entries(PROPERTY_DEFINITIONS).forEach(([name, definition]) => {
        if (definition.type === 'translate') {
            return;
        }

        const value = normalizePropertyValue(name, properties[name]);

        if (value && definition.css) {
            lines.push(`    ${definition.css}: ${value} !important;`);
        }
    });

    if (translateX || translateY) {
        lines.push(`    transform: translate(${translateX || '0px'}, ${translateY || '0px'}) !important;`);
    }

    return lines;
}

function renderVisualOverridesCss(payload = {}) {
    const state = normalizeVisualEditorState(payload);
    const blocks = state.rules
        .map((rule) => {
            const selector = buildRuleSelector(rule);
            const declarations = renderDeclarationLines(rule.properties);

            if (!selector || declarations.length === 0) {
                return '';
            }

            return `${selector} {\n${declarations.join('\n')}\n}`;
        })
        .filter(Boolean);

    return `/* Generated by the PGM admin Visual editor. Do not edit manually. */\n${blocks.join('\n\n')}\n`;
}

function removeVisualOverridesLink(html) {
    const newline = html.includes('\r\n') ? '\r\n' : '\n';

    return html
        .split(/\r\n|\r|\n/)
        .filter((line) => !/admin-visual-overrides\.css/i.test(line))
        .join(newline);
}

function applyVisualOverridesLink(html) {
    const cleanedHtml = removeVisualOverridesLink(html);
    const newline = cleanedHtml.includes('\r\n') ? '\r\n' : '\n';
    const link = `    <link rel="stylesheet" href="${VISUAL_OVERRIDES_HREF}">`;
    const lines = cleanedHtml.split(/\r\n|\r|\n/);
    const lastStylesheetIndex = lines.reduce((lastIndex, line, index) => {
        const isStylesheet = /<link\b/i.test(line) &&
            /rel=["']stylesheet["']/i.test(line) &&
            /href=["'][^"']+["']/i.test(line);

        return isStylesheet ? index : lastIndex;
    }, -1);

    if (lastStylesheetIndex >= 0) {
        lines.splice(lastStylesheetIndex + 1, 0, link);
        return lines.join(newline);
    }

    if (/<\/head>/i.test(cleanedHtml)) {
        return cleanedHtml.replace(/<\/head>/i, `${link}${newline}</head>`);
    }

    return `${cleanedHtml}${newline}${link}`;
}

module.exports = {
    PROPERTY_DEFINITIONS,
    VISUAL_OVERRIDES_HREF,
    VISUAL_OVERRIDES_RELATIVE_PATH,
    applyVisualOverridesLink,
    normalizeVisualEditorState,
    renderVisualOverridesCss
};
