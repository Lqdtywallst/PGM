const path = require('path');

const BUTTON_CLASS_FAMILIES = Object.freeze({
    global: Object.freeze(['btn', 'btn-primary', 'btn-secondary', 'btn-outline', 'btn-ghost', 'btn-home']),
    header: Object.freeze(['lab-reserve', 'lab-header__utility-link', 'lab-mobile-drawer__action']),
    fleet: Object.freeze(['fleet-card__primary', 'fleet-card__secondary', 'fleet-card__secondary--wa']),
    guide: Object.freeze(['local-guide-button', 'local-guide-button--primary', 'local-guide-button--secondary', 'local-guide-related-card__link']),
    service: Object.freeze(['service-detail-actions__primary', 'service-detail-actions__secondary', 'service-card__link']),
    vehicle: Object.freeze(['vehicle-hero__action', 'model-actions', 'confirm-pay-btn']),
    contact: Object.freeze(['contact-hero__action', 'contact-submit', 'reserve-clear-button'])
});

const CARD_CLASS_FAMILIES = Object.freeze({
    header: Object.freeze(['lab-nav__card', 'lab-nav__card--brand', 'lab-nav__card--type']),
    fleet: Object.freeze(['fleet-card', 'js-fleet-card', 'fleet-preview-card']),
    guide: Object.freeze(['guide-card', 'local-guide-note-card', 'local-guide-process-card', 'local-guide-related-card', 'local-guide-faq-item']),
    service: Object.freeze(['service-card', 'service-lane-card', 'service-detail-card']),
    vehicle: Object.freeze(['model-card', 'vehicle-story-card', 'vehicle-pdp-gallery-card', 'vehicle-pdp-use__card']),
    location: Object.freeze(['location-card', 'locations-guide-card', 'locations-zone-card']),
    reserve: Object.freeze(['primer-card', 'schedule-card', 'delivery-card', 'route-guide-card', 'info-card', 'selected-plan-card', 'assurance-card', 'payment-side-card'])
});

const PAGE_PATTERN_MARKER_ATTRIBUTES = Object.freeze([
    'data-page-pattern',
    'data-page-cohort',
    'data-layout-pattern',
    'data-template-family',
    'data-component-contract'
]);

function normalizePath(filePath = '') {
    return String(filePath || '').replace(/\\/g, '/');
}

function isBrandTokensPath(filePath = '') {
    return path.basename(normalizePath(filePath)).toLowerCase() === 'brand-tokens.css';
}

function lineColumnFromIndex(source = '', index = 0) {
    const prefix = String(source || '').slice(0, index);
    const lines = prefix.split(/\n/);

    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
    };
}

function findCommentRanges(source = '') {
    const ranges = [];
    const regex = /\/\*[\s\S]*?\*\//g;
    let match = regex.exec(source);

    while (match) {
        ranges.push({
            start: match.index,
            end: match.index + match[0].length
        });
        match = regex.exec(source);
    }

    return ranges;
}

function isInRange(index, ranges = []) {
    return ranges.some((range) => index >= range.start && index < range.end);
}

function uniqueSorted(values = []) {
    return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function createClassLookup(families = {}) {
    const lookup = new Map();

    for (const [family, classes] of Object.entries(families)) {
        for (const className of classes) {
            lookup.set(className, family);
        }
    }

    return lookup;
}

function extractClassTokens(source = '', type = 'html') {
    const tokens = [];

    if (type === 'css') {
        const regex = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
        let match = regex.exec(source);

        while (match) {
            tokens.push({
                className: match[1],
                ...lineColumnFromIndex(source, match.index)
            });
            match = regex.exec(source);
        }

        return tokens;
    }

    const regex = /\bclass\s*=\s*(["'])(.*?)\1/gis;
    let match = regex.exec(source);

    while (match) {
        const value = match[2] || '';
        const valueOffset = match.index + match[0].indexOf(value);

        for (const token of value.split(/\s+/).filter(Boolean)) {
            const tokenOffset = source.indexOf(token, valueOffset);
            tokens.push({
                className: token,
                ...lineColumnFromIndex(source, tokenOffset >= 0 ? tokenOffset : valueOffset)
            });
        }

        match = regex.exec(source);
    }

    return tokens;
}

function collectKnownClassFamilies(sources = [], classFamilies = {}) {
    const lookup = createClassLookup(classFamilies);
    const byFamily = {};
    const occurrences = [];

    for (const [family, classes] of Object.entries(classFamilies)) {
        byFamily[family] = {
            knownClasses: [...classes],
            classes: [],
            count: 0,
            files: []
        };
    }

    for (const source of sources) {
        const tokens = extractClassTokens(source.content || '', source.type || 'html');

        for (const token of tokens) {
            const family = lookup.get(token.className);

            if (!family) {
                continue;
            }

            const occurrence = {
                filePath: normalizePath(source.filePath),
                type: source.type || 'html',
                family,
                className: token.className,
                line: token.line,
                column: token.column
            };

            occurrences.push(occurrence);
            byFamily[family].classes.push(token.className);
            byFamily[family].files.push(normalizePath(source.filePath));
            byFamily[family].count += 1;
        }
    }

    for (const family of Object.keys(byFamily)) {
        byFamily[family].classes = uniqueSorted(byFamily[family].classes);
        byFamily[family].files = uniqueSorted(byFamily[family].files);
    }

    return {
        byFamily,
        occurrences
    };
}

function findRawHexColorsInCss({ filePath = '', css = '' } = {}) {
    if (isBrandTokensPath(filePath)) {
        return [];
    }

    const commentRanges = findCommentRanges(css);
    const findings = [];
    const regex = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
    let match = regex.exec(css);

    while (match) {
        if (!isInRange(match.index, commentRanges)) {
            findings.push({
                filePath: normalizePath(filePath),
                type: 'raw_hex_color',
                severity: 'low',
                value: match[0],
                ...lineColumnFromIndex(css, match.index),
                message: 'Raw hex color found outside brand-tokens.css.',
                recommendation: 'Prefer an existing brand token or add a token before reusing this value.'
            });
        }

        match = regex.exec(css);
    }

    return findings;
}

function findPagePatternMarkers({ filePath = '', html = '' } = {}) {
    const markers = [];

    for (const attribute of PAGE_PATTERN_MARKER_ATTRIBUTES) {
        const regex = new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'gi');
        let match = regex.exec(html);

        while (match) {
            markers.push({
                filePath: normalizePath(filePath),
                attribute,
                value: match[2] || '',
                ...lineColumnFromIndex(html, match.index)
            });
            match = regex.exec(html);
        }
    }

    const bodyMatch = html.match(/<body\b[^>]*class\s*=\s*(["'])(.*?)\1/i);
    if (bodyMatch) {
        const classValue = bodyMatch[2] || '';
        const bodyOffset = bodyMatch.index || 0;
        const pageClasses = classValue
            .split(/\s+/)
            .filter((token) => /(?:^|-)page(?:-|$)|(?:^|-)landing(?:-|$)|(?:^|-)pdp(?:-|$)/i.test(token));

        for (const className of pageClasses) {
            markers.push({
                filePath: normalizePath(filePath),
                attribute: 'body.class',
                value: className,
                ...lineColumnFromIndex(html, bodyOffset)
            });
        }
    }

    return {
        filePath: normalizePath(filePath),
        present: markers.length > 0,
        markers
    };
}

function summarizeFindings(findings = []) {
    return {
        total: findings.length,
        high: findings.filter((finding) => finding.severity === 'high').length,
        medium: findings.filter((finding) => finding.severity === 'medium').length,
        low: findings.filter((finding) => finding.severity === 'low').length,
        byType: findings.reduce((counts, finding) => ({
            ...counts,
            [finding.type]: (counts[finding.type] || 0) + 1
        }), {})
    };
}

function buildComponentContractAudit(sources = [], options = {}) {
    const normalizedSources = sources.map((source) => ({
        filePath: normalizePath(source.filePath),
        type: source.type || (String(source.filePath || '').toLowerCase().endsWith('.css') ? 'css' : 'html'),
        content: String(source.content || '')
    }));
    const cssSources = normalizedSources.filter((source) => source.type === 'css');
    const htmlSources = normalizedSources.filter((source) => source.type === 'html');
    const findings = cssSources.flatMap((source) => findRawHexColorsInCss({
        filePath: source.filePath,
        css: source.content
    }));
    const buttonClasses = collectKnownClassFamilies(normalizedSources, options.buttonClassFamilies || BUTTON_CLASS_FAMILIES);
    const cardClasses = collectKnownClassFamilies(normalizedSources, options.cardClassFamilies || CARD_CLASS_FAMILIES);
    const pagePatternMarkers = htmlSources.map((source) => findPagePatternMarkers({
        filePath: source.filePath,
        html: source.content
    }));

    return {
        generatedAt: new Date().toISOString(),
        mode: 'advisory',
        summary: {
            ...summarizeFindings(findings),
            files: normalizedSources.length,
            cssFiles: cssSources.length,
            htmlFiles: htmlSources.length,
            buttonFamilies: Object.values(buttonClasses.byFamily).filter((entry) => entry.count > 0).length,
            cardFamilies: Object.values(cardClasses.byFamily).filter((entry) => entry.count > 0).length,
            pagesWithPatternMarkers: pagePatternMarkers.filter((entry) => entry.present).length
        },
        findings,
        inventory: {
            buttons: buttonClasses,
            cards: cardClasses,
            pagePatternMarkers
        }
    };
}

module.exports = {
    BUTTON_CLASS_FAMILIES,
    CARD_CLASS_FAMILIES,
    PAGE_PATTERN_MARKER_ATTRIBUTES,
    buildComponentContractAudit,
    collectKnownClassFamilies,
    extractClassTokens,
    findPagePatternMarkers,
    findRawHexColorsInCss,
    isBrandTokensPath,
    summarizeFindings
};
