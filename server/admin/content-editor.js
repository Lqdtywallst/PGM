const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../shared/html-utils');
const { syncFleetHtmlFromData } = require('../renderers/render-fleet-cards');
const { normalizeHeaderConfig, syncGlobalHeaderHtml } = require('../renderers/render-global-header');
const { normalizeServicesContent, syncServicesHtmlFromData } = require('../renderers/render-services-page');
const { normalizeLocationsContent, syncLocationsHtmlFromData } = require('../renderers/render-locations-page');
const {
    STYLE_OVERRIDES_RELATIVE_PATH,
    applyStyleOverridesLink,
    normalizeStyleEditorState,
    renderStyleOverridesCss
} = require('../renderers/render-style-overrides');
const { PUBLIC_PAGE_FILE_MAP, siteFileForPublicPath } = require('../shared/public-page-map');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');
const homeHtmlPath = path.join(projectRoot, 'site', 'index.html');
const fleetCardsPath = path.join(__dirname, '..', 'data', 'fleet-cards.json');
const globalHeaderPath = path.join(__dirname, '..', 'data', 'global-header.json');
const siteAppearancePath = path.join(__dirname, '..', 'data', 'site-appearance.json');
const styleEditorPath = path.join(__dirname, '..', 'data', 'style-editor.json');
const styleOverridesPath = path.join(siteRoot, STYLE_OVERRIDES_RELATIVE_PATH);
const servicesContentPath = path.join(__dirname, '..', 'data', 'services-editor.json');
const locationsContentPath = path.join(__dirname, '..', 'data', 'locations-editor.json');

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

function normalizeSiteHref(value, fallback = '/favicon.ico') {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listHtmlFiles(rootDir) {
    return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            return listHtmlFiles(entryPath);
        }

        return entry.isFile() && entry.name.toLowerCase().endsWith('.html')
            ? [entryPath]
            : [];
    });
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

function readSiteAppearanceSettings() {
    return JSON.parse(readUtf8(siteAppearancePath));
}

function listFaviconOptions() {
    const candidates = [
        'favicon.ico',
        'icons/icon-16.png',
        'icons/icon-32.png',
        'icons/icon-48.png',
        'icons/icon-96.png',
        'icons/icon-180.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'logo-dp-transparent.png',
        'images/dp-crest-cropped.png',
        'images/dynasty-prestige-logo.png'
    ];

    return candidates
        .filter((relativePath) => fs.existsSync(path.join(siteRoot, relativePath)))
        .map((relativePath) => ({
            href: `/${relativePath.replace(/\\/g, '/')}`,
            label: relativePath.replace(/\\/g, '/')
        }));
}

function extractPageTitle(html) {
    const match = html.match(/<title>([\s\S]*?)<\/title>/i);
    return match ? decodeHtml(match[1].trim()) : '';
}

function extractMetaContent(html, attrName, attrValue) {
    const pattern = new RegExp(`<meta\\s+${attrName}="${escapeRegExp(attrValue)}"\\s+content="([^"]*)"\\s*>`, 'i');
    const match = html.match(pattern);
    return match ? decodeHtml(match[1]) : '';
}

function readPageAppearance(publicPath) {
    const page = assertEditablePublicPath(publicPath);
    const html = readUtf8(page.filePath);

    return {
        publicPath: page.publicPath,
        filePath: page.relativePath,
        label: formatPageLabel(page.publicPath),
        title: extractPageTitle(html),
        description: extractMetaContent(html, 'name', 'description')
    };
}

function replaceOrInsertTitle(html, title) {
    const escapedTitle = escapeHtml(title);

    if (/<title>[\s\S]*?<\/title>/i.test(html)) {
        return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`);
    }

    return html.replace(/(<head[^>]*>)/i, `$1\n    <title>${escapedTitle}</title>`);
}

function replaceOrInsertMetaContent(html, attrName, attrValue, content) {
    const escapedContent = escapeHtml(content);
    const pattern = new RegExp(`(<meta\\s+${attrName}="${escapeRegExp(attrValue)}"\\s+content=")([^"]*)("\\s*>)`, 'i');

    if (pattern.test(html)) {
        return html.replace(pattern, `$1${escapedContent}$3`);
    }

    if (attrName === 'name' && attrValue === 'description') {
        return html.replace(/(<title>[\s\S]*?<\/title>)/i, `$1\n    <meta name="description" content="${escapedContent}">`);
    }

    return html;
}

function removeFaviconLinks(html) {
    const newline = html.includes('\r\n') ? '\r\n' : '\n';

    return html
        .split(/\r\n|\r|\n/)
        .filter((line) => {
            const isFaviconComment = /<!--\s*Favicon\b/i.test(line);
            const isFaviconLink = /<link\b/i.test(line) &&
                /rel=["'](?:shortcut icon|icon|apple-touch-icon)["']/i.test(line);

            return !isFaviconComment && !isFaviconLink;
        })
        .join(newline);
}

function applyFaviconToHtml(html, faviconHref) {
    const cleanedHtml = removeFaviconLinks(html);
    const faviconLink = `    <link rel="icon" href="${escapeHtml(faviconHref)}">`;

    if (/<meta\s+name="description"\s+content="[^"]*"\s*>/i.test(cleanedHtml)) {
        return cleanedHtml.replace(
            /(<meta\s+name="description"\s+content="[^"]*"\s*>)/i,
            `$1\n${faviconLink}`
        );
    }

    if (/<title>[\s\S]*?<\/title>/i.test(cleanedHtml)) {
        return cleanedHtml.replace(/(<title>[\s\S]*?<\/title>)/i, `$1\n${faviconLink}`);
    }

    return cleanedHtml.replace(/(<head[^>]*>)/i, `$1\n${faviconLink}`);
}

function syncFaviconAcrossSite(faviconHref) {
    const htmlFiles = listHtmlFiles(siteRoot);
    const touchedFiles = [];

    htmlFiles.forEach((filePath) => {
        const html = readUtf8(filePath);
        const nextHtml = applyFaviconToHtml(html, faviconHref);

        if (nextHtml !== html) {
            writeUtf8(filePath, nextHtml);
            touchedFiles.push(filePath);
        }
    });

    return touchedFiles;
}

function syncStyleOverridesAcrossSite() {
    const htmlFiles = listHtmlFiles(siteRoot);
    const touchedFiles = [];

    htmlFiles.forEach((filePath) => {
        const html = readUtf8(filePath);
        const nextHtml = applyStyleOverridesLink(html);

        if (nextHtml !== html) {
            writeUtf8(filePath, nextHtml);
            touchedFiles.push(filePath);
        }
    });

    return touchedFiles;
}

function readStyleEditorState() {
    return normalizeStyleEditorState(JSON.parse(readUtf8(styleEditorPath)));
}

function saveStyleEditorState(payload = {}) {
    const nextState = normalizeStyleEditorState(payload);
    writeUtf8(styleEditorPath, `${JSON.stringify(nextState, null, 2)}\n`);
    writeUtf8(styleOverridesPath, renderStyleOverridesCss(nextState));
    syncStyleOverridesAcrossSite();
    return readStyleEditorState();
}

function saveSiteAppearanceSettings(payload = {}) {
    const settings = {
        faviconHref: normalizeSiteHref(payload.faviconHref, '/favicon.ico')
    };

    writeUtf8(siteAppearancePath, `${JSON.stringify(settings, null, 2)}\n`);
    syncFaviconAcrossSite(settings.faviconHref);
    return readSiteAppearanceSettings();
}

function readAppearanceEditorState(publicPath = '/') {
    return {
        settings: readSiteAppearanceSettings(),
        faviconOptions: listFaviconOptions(),
        page: readPageAppearance(publicPath)
    };
}

function savePageAppearance(publicPath, payload = {}) {
    const page = assertEditablePublicPath(publicPath);
    const title = normalizeText(payload.title);
    const description = normalizeText(payload.description);

    if (!title) {
        throw new Error('The browser tab title cannot be empty.');
    }

    if (!description) {
        throw new Error('The SEO description cannot be empty.');
    }

    let html = readUtf8(page.filePath);
    html = replaceOrInsertTitle(html, title);
    html = replaceOrInsertMetaContent(html, 'name', 'description', description);
    html = replaceOrInsertMetaContent(html, 'property', 'og:title', title);
    html = replaceOrInsertMetaContent(html, 'property', 'og:description', description);
    html = replaceOrInsertMetaContent(html, 'name', 'twitter:title', title);
    html = replaceOrInsertMetaContent(html, 'name', 'twitter:description', description);
    writeUtf8(page.filePath, html);

    return readPageAppearance(page.publicPath);
}

function saveAppearanceEditorState(payload = {}) {
    const settings = saveSiteAppearanceSettings(payload.settings || {});
    const page = savePageAppearance(payload.publicPath || '/', payload.page || {});

    return {
        settings,
        faviconOptions: listFaviconOptions(),
        page
    };
}

function extractHtmlAttribute(attrs, name) {
    const pattern = new RegExp(`${name}="([^"]*)"`, 'i');
    const match = String(attrs || '').match(pattern);
    return match ? decodeHtml(match[1]) : '';
}

function normalizeElementText(value) {
    return decodeHtml(String(value ?? '').replace(/\s+/g, ' ').trim());
}

function heroCtaPattern(modifier) {
    return new RegExp(`<([a-z0-9-]+)\\b([^>]*class="[^"]*\\bhero-lab__cta--${escapeRegExp(modifier)}\\b[^"]*"[^>]*)>([\\s\\S]*?)<\\/\\1>`, 'i');
}

function readHeroCta(html, modifier, fallbackHref = './fleet.html') {
    const match = requireMatch(html, heroCtaPattern(modifier), `${modifier} CTA`);
    const tagName = match[1].toLowerCase();
    const attrs = match[2];

    return {
        href: tagName === 'a' ? extractHtmlAttribute(attrs, 'href') : fallbackHref,
        label: normalizeElementText(match[3])
    };
}

function replaceHtmlAttribute(attrs, name, value) {
    const escapedValue = escapeHtml(value);
    const pattern = new RegExp(`(${name}=")([^"]*)(")`, 'i');

    if (pattern.test(attrs)) {
        return attrs.replace(pattern, `$1${escapedValue}$3`);
    }

    return ` ${name}="${escapedValue}"${attrs}`;
}

function replaceHeroCta(html, modifier, href, label) {
    return replaceOnce(
        html,
        heroCtaPattern(modifier),
        (fullMatch, tagName, attrs) => {
            const normalizedTag = tagName.toLowerCase();
            const nextAttrs = normalizedTag === 'a'
                ? replaceHtmlAttribute(attrs, 'href', href)
                : attrs;

            return `<${tagName}${nextAttrs}>${label}</${tagName}>`;
        },
        `${modifier} CTA`
    );
}

function readHomeEditorState() {
    const html = readUtf8(homeHtmlPath);
    const primaryCta = readHeroCta(html, 'primary', '#home-booking');
    const secondaryCta = readHeroCta(html, 'secondary', './fleet.html');

    return {
        eyebrow: decodeHtml(requireMatch(html, /<span class="hero-lab__eyebrow">([\s\S]*?)<\/span>/, 'hero eyebrow')[1]),
        headline: decodeHtml(requireMatch(html, /<h1>([\s\S]*?)<\/h1>/, 'hero headline')[1]),
        lead: decodeHtml(requireMatch(html, /<p class="hero-lab__lead">([\s\S]*?)<\/p>/, 'hero lead')[1]),
        launcherHeading: decodeHtml(requireMatch(html, /<div class="hero-lab__launcher">\s*<h2>([\s\S]*?)<\/h2>/, 'hero launcher heading')[1]),
        launcherText: decodeHtml(requireMatch(html, /<div class="hero-lab__launcher">[\s\S]*?<h2>[\s\S]*?<\/h2>\s*<p>([\s\S]*?)<\/p>/, 'hero launcher text')[1]),
        primaryCtaHref: primaryCta.href,
        primaryCtaLabel: primaryCta.label,
        secondaryCtaHref: secondaryCta.href,
        secondaryCtaLabel: secondaryCta.label
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
    html = replaceHeroCta(html, 'primary', nextState.primaryCtaHref, nextState.primaryCtaLabel);
    html = replaceHeroCta(html, 'secondary', nextState.secondaryCtaHref, nextState.secondaryCtaLabel);

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

function readGlobalHeaderContent() {
    return JSON.parse(readUtf8(globalHeaderPath));
}

function saveGlobalHeaderContent(payload = {}) {
    const nextContent = normalizeHeaderConfig(payload);
    writeUtf8(globalHeaderPath, `${JSON.stringify(nextContent, null, 2)}\n`);
    syncGlobalHeaderHtml();
    return readGlobalHeaderContent();
}

function readEditorState() {
    return {
        home: readHomeEditorState(),
        fleet: readFleetCards(),
        header: readGlobalHeaderContent(),
        appearance: readAppearanceEditorState('/'),
        style: readStyleEditorState(),
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
    readGlobalHeaderContent,
    saveGlobalHeaderContent,
    readAppearanceEditorState,
    saveAppearanceEditorState,
    readPageAppearance,
    savePageAppearance,
    readStyleEditorState,
    saveStyleEditorState,
    readServicesContent,
    saveServicesContent,
    readLocationsContent,
    saveLocationsContent,
    listEditablePages,
    readEditablePage,
    saveEditablePage
};
