const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('./html-utils');
const { syncFleetHtmlFromData } = require('./render-fleet-cards');
const { normalizeServicesContent, syncServicesHtmlFromData } = require('./render-services-page');
const { normalizeLocationsContent, syncLocationsHtmlFromData } = require('./render-locations-page');
const { PUBLIC_PAGE_FILE_MAP, siteFileForPublicPath } = require('./public-page-map');

const projectRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(projectRoot, 'site');
const homeHtmlPath = path.join(projectRoot, 'site', 'index.html');
const fleetCardsPath = path.join(__dirname, 'data', 'fleet-cards.json');
const servicesContentPath = path.join(__dirname, 'data', 'services-editor.json');
const locationsContentPath = path.join(__dirname, 'data', 'locations-editor.json');

function readUtf8(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeUtf8(filePath, value) {
    fs.writeFileSync(filePath, value, 'utf8');
}

function decodeHtml(value) {
    return String(value ?? '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function requireMatch(source, pattern, label) {
    const match = source.match(pattern);

    if (!match) {
        throw new Error(`Could not locate ${label} in homepage source.`);
    }

    return match;
}

function replaceOnce(source, pattern, replacer, label) {
    if (!pattern.test(source)) {
        throw new Error(`Could not update ${label} in homepage source.`);
    }

    const nextSource = source.replace(pattern, replacer);
    return nextSource;
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function normalizeHref(value) {
    return String(value ?? '').trim() || './fleet.html';
}

function formatPageLabel(publicPath) {
    if (publicPath === '/') {
        return 'Home';
    }

    const normalized = String(publicPath || '')
        .replace(/^\/+/, '')
        .replace(/\.html$/i, '')
        .replace(/^app\/reserve\/page$/i, 'reserve')
        .replace(/-/g, ' ')
        .replace(/\//g, ' ');

    return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function listEditablePages() {
    return Object.entries(PUBLIC_PAGE_FILE_MAP).map(([publicPath, filePath]) => ({
        publicPath,
        filePath,
        label: formatPageLabel(publicPath)
    }));
}

function assertEditablePublicPath(publicPath) {
    const normalizedPath = String(publicPath || '').trim() || '/';

    if (!Object.prototype.hasOwnProperty.call(PUBLIC_PAGE_FILE_MAP, normalizedPath)) {
        throw new Error('This page is not allowed in the editor.');
    }

    const filePath = path.normalize(siteFileForPublicPath(siteRoot, normalizedPath));

    if (!filePath.startsWith(siteRoot)) {
        throw new Error('Resolved page path is outside the public site root.');
    }

    return {
        publicPath: normalizedPath,
        filePath,
        relativePath: PUBLIC_PAGE_FILE_MAP[normalizedPath]
    };
}

function readEditablePage(publicPath) {
    const page = assertEditablePublicPath(publicPath);
    const source = readUtf8(page.filePath);

    return {
        publicPath: page.publicPath,
        filePath: page.relativePath,
        label: formatPageLabel(page.publicPath),
        source
    };
}

function saveEditablePage(publicPath, source) {
    const page = assertEditablePublicPath(publicPath);
    const normalizedSource = String(source ?? '');

    if (!normalizedSource.trim()) {
        throw new Error('The page source cannot be empty.');
    }

    if (!/<html[\s>]/i.test(normalizedSource) || !/<body[\s>]/i.test(normalizedSource)) {
        throw new Error('The page source must contain a full HTML document.');
    }

    writeUtf8(page.filePath, normalizedSource);
    return readEditablePage(page.publicPath);
}

function readHomeEditorState() {
    const html = readUtf8(homeHtmlPath);

    return {
        eyebrow: decodeHtml(requireMatch(html, /<span class="hero-lab__eyebrow">([\s\S]*?)<\/span>/, 'hero eyebrow')[1]),
        headline: decodeHtml(requireMatch(html, /<h1>([\s\S]*?)<\/h1>/, 'hero headline')[1]),
        lead: decodeHtml(requireMatch(html, /<p class="hero-lab__lead">([\s\S]*?)<\/p>/, 'hero lead')[1]),
        launcherHeading: decodeHtml(requireMatch(html, /<div class="hero-lab__launcher">\s*<h2>([\s\S]*?)<\/h2>/, 'hero launcher heading')[1]),
        launcherText: decodeHtml(requireMatch(html, /<div class="hero-lab__launcher">[\s\S]*?<h2>[\s\S]*?<\/h2>\s*<p>([\s\S]*?)<\/p>/, 'hero launcher text')[1]),
        primaryCtaHref: decodeHtml(requireMatch(html, /<a href="([^"]*)" class="hero-lab__cta hero-lab__cta--primary">[\s\S]*?<\/a>/, 'primary CTA href')[1]),
        primaryCtaLabel: decodeHtml(requireMatch(html, /<a href="[^"]*" class="hero-lab__cta hero-lab__cta--primary">([\s\S]*?)<\/a>/, 'primary CTA label')[1]),
        secondaryCtaHref: decodeHtml(requireMatch(html, /<a href="([^"]*)" class="hero-lab__cta hero-lab__cta--secondary">[\s\S]*?<\/a>/, 'secondary CTA href')[1]),
        secondaryCtaLabel: decodeHtml(requireMatch(html, /<a href="[^"]*" class="hero-lab__cta hero-lab__cta--secondary">([\s\S]*?)<\/a>/, 'secondary CTA label')[1])
    };
}

function saveHomeEditorState(payload = {}) {
    let html = readUtf8(homeHtmlPath);
    const nextState = {
        eyebrow: escapeHtml(normalizeText(payload.eyebrow)),
        headline: escapeHtml(normalizeText(payload.headline)),
        lead: escapeHtml(normalizeText(payload.lead)),
        launcherHeading: escapeHtml(normalizeText(payload.launcherHeading)),
        launcherText: escapeHtml(normalizeText(payload.launcherText)),
        primaryCtaHref: escapeHtml(normalizeHref(payload.primaryCtaHref)),
        primaryCtaLabel: escapeHtml(normalizeText(payload.primaryCtaLabel)),
        secondaryCtaHref: escapeHtml(normalizeHref(payload.secondaryCtaHref)),
        secondaryCtaLabel: escapeHtml(normalizeText(payload.secondaryCtaLabel))
    };

    html = replaceOnce(html, /(<span class="hero-lab__eyebrow">)([\s\S]*?)(<\/span>)/, `$1${nextState.eyebrow}$3`, 'hero eyebrow');
    html = replaceOnce(html, /(<h1>)([\s\S]*?)(<\/h1>)/, `$1${nextState.headline}$3`, 'hero headline');
    html = replaceOnce(html, /(<p class="hero-lab__lead">)([\s\S]*?)(<\/p>)/, `$1${nextState.lead}$3`, 'hero lead');
    html = replaceOnce(html, /(<div class="hero-lab__launcher">\s*<h2>)([\s\S]*?)(<\/h2>)/, `$1${nextState.launcherHeading}$3`, 'hero launcher heading');
    html = replaceOnce(
        html,
        /(<div class="hero-lab__launcher">[\s\S]*?<h2>[\s\S]*?<\/h2>\s*<p>)([\s\S]*?)(<\/p>)/,
        `$1${nextState.launcherText}$3`,
        'hero launcher text'
    );
    html = replaceOnce(
        html,
        /(<a href=")([^"]*)(" class="hero-lab__cta hero-lab__cta--primary">)([\s\S]*?)(<\/a>)/,
        `$1${nextState.primaryCtaHref}$3${nextState.primaryCtaLabel}$5`,
        'primary CTA'
    );
    html = replaceOnce(
        html,
        /(<a href=")([^"]*)(" class="hero-lab__cta hero-lab__cta--secondary">)([\s\S]*?)(<\/a>)/,
        `$1${nextState.secondaryCtaHref}$3${nextState.secondaryCtaLabel}$5`,
        'secondary CTA'
    );

    writeUtf8(homeHtmlPath, html);
    return readHomeEditorState();
}

function readFleetCards() {
    return JSON.parse(readUtf8(fleetCardsPath));
}

function normalizeFleetCardPatch(card = {}) {
    const pricePerDay = Number.parseFloat(String(card.pricePerDay ?? ''));

    if (!card.id) {
        throw new Error('Each fleet card update requires an id.');
    }

    if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
        throw new Error(`Fleet card "${card.id}" needs a valid daily price.`);
    }

    return {
        id: String(card.id),
        pricePerDay,
        utility: {
            badge: normalizeText(card.utility?.badge),
            trust: normalizeText(card.utility?.trust)
        },
        copy: {
            title: normalizeText(card.copy?.title),
            description: normalizeText(card.copy?.description),
            salesLine: normalizeText(card.copy?.salesLine)
        },
        booking: {
            priceNote: normalizeText(card.booking?.priceNote)
        },
        contact: {
            whatsappText: normalizeText(card.contact?.whatsappText)
        }
    };
}

function saveFleetCards(cardPatches = []) {
    if (!Array.isArray(cardPatches) || !cardPatches.length) {
        throw new Error('Fleet updates must include at least one card.');
    }

    const patchMap = new Map(cardPatches.map((card) => {
        const normalized = normalizeFleetCardPatch(card);
        return [normalized.id, normalized];
    }));

    const currentCards = readFleetCards();
    const nextCards = currentCards.map((card) => {
        const patch = patchMap.get(card.id);

        if (!patch) {
            return card;
        }

        return {
            ...card,
            pricePerDay: patch.pricePerDay,
            utility: {
                ...card.utility,
                badge: patch.utility.badge,
                trust: patch.utility.trust
            },
            copy: {
                ...card.copy,
                title: patch.copy.title,
                description: patch.copy.description,
                salesLine: patch.copy.salesLine
            },
            booking: {
                ...card.booking,
                priceNote: patch.booking.priceNote
            },
            contact: {
                ...card.contact,
                whatsappText: patch.contact.whatsappText
            }
        };
    });

    writeUtf8(fleetCardsPath, `${JSON.stringify(nextCards, null, 2)}\n`);
    syncFleetHtmlFromData();
    return readFleetCards();
}

function readServicesContent() {
    return JSON.parse(readUtf8(servicesContentPath));
}

function saveServicesContent(payload = {}) {
    const nextContent = normalizeServicesContent(payload);
    writeUtf8(servicesContentPath, `${JSON.stringify(nextContent, null, 2)}\n`);
    syncServicesHtmlFromData();
    return readServicesContent();
}

function readLocationsContent() {
    return JSON.parse(readUtf8(locationsContentPath));
}

function saveLocationsContent(payload = {}) {
    const nextContent = normalizeLocationsContent(payload);
    writeUtf8(locationsContentPath, `${JSON.stringify(nextContent, null, 2)}\n`);
    syncLocationsHtmlFromData();
    return readLocationsContent();
}

function readEditorState() {
    return {
        home: readHomeEditorState(),
        fleet: readFleetCards(),
        services: readServicesContent(),
        locations: readLocationsContent(),
        pages: listEditablePages()
    };
}

module.exports = {
    readEditorState,
    readHomeEditorState,
    saveHomeEditorState,
    readFleetCards,
    saveFleetCards,
    readServicesContent,
    saveServicesContent,
    readLocationsContent,
    saveLocationsContent,
    listEditablePages,
    readEditablePage,
    saveEditablePage
};
