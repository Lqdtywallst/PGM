const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../shared/html-utils');
const { renderImageDimensionAttributes } = require('../shared/image-dimensions');
const { publicPathForSiteFile } = require('../shared/public-page-map');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');
const dataPath = path.join(__dirname, '..', 'data', 'global-header.json');

function readUtf8(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeUtf8(filePath, value) {
    fs.writeFileSync(filePath, value, 'utf8');
}

function requireText(value, label) {
    if (!String(value ?? '').trim()) {
        throw new Error(label);
    }
}

const DEFAULT_CONTACT = Object.freeze({
    phoneDigits: '971586122568',
    email: 'prestigegoalmotion@gmail.com'
});

const KNOWN_UTILITY_LABELS = new Set(['call', 'email', 'whatsapp']);
const KNOWN_UTILITY_ARIA_LABELS = new Set([
    'call dynasty prestige',
    'email dynasty prestige',
    'open whatsapp',
    'whatsapp dynasty prestige'
]);
const PANEL_VARIANTS = new Set(['brands', 'types']);
const CARD_VARIANTS = new Set(['brand', 'type']);

function extractPhoneDigits(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits || DEFAULT_CONTACT.phoneDigits;
}

function extractEmailAddress(value) {
    const input = String(value || '').trim();
    const match = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0] : DEFAULT_CONTACT.email;
}

function getUtilityPreset(kind, href) {
    const normalizedKind = String(kind || 'custom').trim().toLowerCase();

    if (normalizedKind === 'call') {
        return {
            label: 'Call',
            href: `tel:+${extractPhoneDigits(href)}`,
            ariaLabel: 'Call Dynasty Prestige'
        };
    }

    if (normalizedKind === 'email') {
        return {
            label: 'Email',
            href: `mailto:${extractEmailAddress(href)}`,
            ariaLabel: 'Email Dynasty Prestige'
        };
    }

    if (normalizedKind === 'whatsapp') {
        return {
            label: 'WhatsApp',
            href: `https://wa.me/${extractPhoneDigits(href)}`,
            ariaLabel: 'Open WhatsApp'
        };
    }

    return {
        label: '',
        href: String(href || '').trim(),
        ariaLabel: ''
    };
}

function shouldUseUtilityPreset(value, knownValues) {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || knownValues.has(normalized);
}

function normalizeChoice(value, allowedValues, fallback) {
    const normalized = String(value || '').trim().toLowerCase();
    return allowedValues.has(normalized) ? normalized : fallback;
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

function normalizeUtilityLink(item = {}, index = 0) {
    const kind = String(item.kind || 'custom').trim().toLowerCase();
    const preset = getUtilityPreset(kind, item.href);
    const label = kind === 'custom' || !shouldUseUtilityPreset(item.label, KNOWN_UTILITY_LABELS)
        ? String(item.label || '').trim()
        : preset.label;
    const href = kind === 'custom'
        ? String(item.href || '').trim()
        : preset.href;
    const ariaLabel = kind === 'custom' || !shouldUseUtilityPreset(item.ariaLabel, KNOWN_UTILITY_ARIA_LABELS)
        ? String(item.ariaLabel || '').trim()
        : preset.ariaLabel;

    requireText(label, `Utility link ${index + 1} needs a label.`);
    requireText(href, `Utility link ${index + 1} needs a link.`);
    requireText(ariaLabel, `Utility link ${index + 1} needs an aria label.`);

    return {
        kind,
        label,
        href,
        ariaLabel,
        visible: item.visible !== false
    };
}

function normalizeMegaCard(card = {}, itemIndex = 0, cardIndex = 0) {
    requireText(card.title, `Header menu ${itemIndex + 1}, card ${cardIndex + 1} needs a title.`);
    requireText(card.description, `Header menu ${itemIndex + 1}, card ${cardIndex + 1} needs a description.`);
    requireText(card.href, `Header menu ${itemIndex + 1}, card ${cardIndex + 1} needs a link.`);
    requireText(card.imageSrc, `Header menu ${itemIndex + 1}, card ${cardIndex + 1} needs an image path.`);

    return {
        title: String(card.title).trim(),
        description: String(card.description).trim(),
        href: String(card.href).trim(),
        imageSrc: String(card.imageSrc).trim(),
        imageAlt: String(card.imageAlt || '').trim(),
        visible: card.visible !== false
    };
}

function normalizeNavItem(item = {}, index = 0) {
    const itemType = String(item.itemType || 'link').trim().toLowerCase();
    requireText(item.label, `Navigation item ${index + 1} needs a label.`);

    const normalized = {
        itemType,
        label: String(item.label).trim(),
        href: String(item.href || '').trim(),
        visible: item.visible !== false,
        panelVariant: normalizeChoice(item.panelVariant, PANEL_VARIANTS, 'brands'),
        cardVariant: normalizeChoice(item.cardVariant, CARD_VARIANTS, 'brand'),
        cards: []
    };

    if (itemType === 'link') {
        requireText(item.href, `Navigation item ${index + 1} needs a link.`);
        return normalized;
    }

    if (itemType !== 'mega') {
        throw new Error(`Navigation item ${index + 1} has an unsupported type.`);
    }

    normalized.cards = Array.isArray(item.cards)
        ? item.cards.map((card, cardIndex) => normalizeMegaCard(card, index, cardIndex))
        : [];

    if (!normalized.cards.length) {
        throw new Error(`Navigation mega menu ${index + 1} needs at least one card.`);
    }

    return normalized;
}

function normalizePrimaryButton(button = {}) {
    requireText(button.label, 'Header primary button needs a label.');
    requireText(button.href, 'Header primary button needs a link.');

    return {
        label: String(button.label).trim(),
        href: String(button.href).trim(),
        visible: button.visible !== false
    };
}

function normalizeHeaderConfig(config = {}) {
    const utilityLinks = Array.isArray(config.utilityLinks)
        ? config.utilityLinks.map(normalizeUtilityLink)
        : [];
    const navItems = Array.isArray(config.navItems)
        ? config.navItems.map(normalizeNavItem)
        : [];

    if (!navItems.length) {
        throw new Error('Header navigation needs at least one item.');
    }

    return {
        utilityLinks,
        navItems,
        primaryButton: normalizePrimaryButton(config.primaryButton || {})
    };
}

function utilityIconMarkup(kind) {
    if (kind === 'call') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.62 10.79a15.47 15.47 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.07 21 3 13.93 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"/></svg>';
    }

    if (kind === 'email') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-.4 2-6.54 5.23a1.7 1.7 0 0 1-2.12 0L4.4 7h15.2ZM4 17V9.05l5.69 4.56a3.7 3.7 0 0 0 4.62 0L20 9.05V17H4Z"/></svg>';
    }

    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12 2a9.94 9.94 0 0 0-8.54 15.02L2 22l5.13-1.35A9.94 9.94 0 1 0 19.05 4.91Zm-7.05 14.1c-1.53 0-3.04-.41-4.36-1.19l-.31-.18-3.04.8.81-2.96-.2-.31a8 8 0 1 1 7.1 3.84Zm4.39-5.91c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.2-1.41-1.34-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41l-.46-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.09 3.61.57.25 1.01.39 1.36.49.57.18 1.09.15 1.5.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/></svg>';
}

function renderUtilityLinks(links) {
    return links
        .filter((item) => item.visible)
        .map((item) => [
            `                <a class="lab-header__utility-link" href="${escapeHtml(item.href)}" aria-label="${escapeHtml(item.ariaLabel)}"${/^https?:/i.test(item.href) ? ' target="_blank" rel="noopener"' : ''}>`,
            `                    ${utilityIconMarkup(item.kind)}`,
            `                    <span>${escapeHtml(item.label)}</span>`,
            '                </a>'
        ].join('\n'))
        .join('\n');
}

function renderMegaCard(card, cardVariant) {
    const imageAlt = card.imageAlt ? escapeHtml(card.imageAlt) : '';
    const dimensions = renderImageDimensionAttributes(siteRoot, card.imageSrc);

    return [
        `                                <a class="lab-nav__card lab-nav__card--${escapeHtml(cardVariant)}" href="${escapeHtml(card.href)}">`,
        `                                    <span class="lab-nav__card-media lab-nav__card-media--${escapeHtml(cardVariant)}">`,
        `                                        <img src="${escapeHtml(card.imageSrc)}" alt="${imageAlt}"${dimensions} loading="lazy" decoding="async">`,
        '                                    </span>',
        '                                    <span class="lab-nav__card-copy">',
        `                                        <strong>${escapeHtml(card.title)}</strong>`,
        `                                        <span>${escapeHtml(card.description)}</span>`,
        '                                    </span>',
        '                                </a>'
    ].join('\n');
}

function renderNavItem(item, currentPublicPath, index) {
    if (item.itemType === 'link') {
        const isCurrent = item.href === currentPublicPath ||
            (item.href === '/index.html' && currentPublicPath === '/') ||
            (item.href === '/' && currentPublicPath === '/index.html');
        const currentAttr = isCurrent ? ' aria-current="page"' : '';
        return `                    <a href="${escapeHtml(item.href)}"${currentAttr}>${escapeHtml(item.label)}</a>`;
    }

    const panelId = `lab-nav-dynamic-panel-${index + 1}`;
    const visibleCards = item.cards.filter((card) => card.visible);

    return [
        '                    <div class="lab-nav__item lab-nav__item--has-panel js-nav-mega">',
        '                        <button',
        '                            type="button"',
        '                            class="lab-nav__trigger"',
        '                            aria-expanded="false"',
        `                            aria-controls="${escapeHtml(panelId)}"`,
        '                        >',
        `                            <span>${escapeHtml(item.label)}</span>`,
        '                            <span class="lab-nav__chevron" aria-hidden="true"></span>',
        '                        </button>',
        '',
        `                        <div class="lab-nav__panel lab-nav__panel--${escapeHtml(item.panelVariant)}" id="${escapeHtml(panelId)}">`,
        `                            <div class="lab-nav__panel-grid lab-nav__panel-grid--${escapeHtml(item.panelVariant)}">`,
        visibleCards.map((card) => renderMegaCard(card, item.cardVariant)).join('\n\n'),
        '                            </div>',
        '                        </div>',
        '                    </div>'
    ].join('\n');
}

function renderMainNav(navItems, currentPublicPath) {
    return navItems
        .filter((item) => item.visible)
        .map((item, index) => renderNavItem(item, currentPublicPath, index))
        .join('\n\n');
}

function buildHeaderMarkup(config, currentPublicPath) {
    const utilityMarkup = renderUtilityLinks(config.utilityLinks);
    const navMarkup = renderMainNav(config.navItems, currentPublicPath);
    const crestDimensions = renderImageDimensionAttributes(siteRoot, '/images/dp-crest-optimized.png');
    const reserveMarkup = config.primaryButton.visible
        ? `            <a href="${escapeHtml(config.primaryButton.href)}" class="lab-reserve">${escapeHtml(config.primaryButton.label)}</a>`
        : '';

    return [
        '    <header class="lab-header">',
        '        <div class="lab-shell lab-header__inner">',
        '            <a href="/index.html" class="lab-brand" aria-label="Dynasty Prestige home">',
        '                <span class="lab-brand__crest" aria-hidden="true">',
        `                    <img src="/images/dp-crest-optimized.png" alt=""${crestDimensions}>`,
        '                </span>',
        '                <span class="lab-brand__copy">',
        '                    <strong>Dynasty Prestige</strong>',
        '                    <span>Dubai luxury car rental</span>',
        '                </span>',
        '            </a>',
        '',
        '            <nav class="lab-header__utility" aria-label="Quick contact">',
        utilityMarkup,
        '            </nav>',
        '',
        '            <div class="lab-header__nav">',
        '                <nav class="lab-nav" aria-label="Main navigation">',
        navMarkup,
        '                </nav>',
        reserveMarkup,
        '            </div>',
        '        </div>',
        '    </header>'
    ].join('\n');
}

function replaceFirstHeader(html, headerMarkup) {
    const pattern = /[ \t]*<header class="lab-header">[\s\S]*?<\/header>/;

    if (!pattern.test(html)) {
        return { found: false, html };
    }

    return {
        found: true,
        html: html.replace(pattern, headerMarkup)
    };
}

function syncGlobalHeaderHtml() {
    const config = normalizeHeaderConfig(JSON.parse(readUtf8(dataPath)));
    const htmlFiles = listHtmlFiles(siteRoot);
    const touchedFiles = [];

    htmlFiles.forEach((filePath) => {
        const html = readUtf8(filePath);
        const publicPath = publicPathForSiteFile(siteRoot, filePath);
        const headerMarkup = buildHeaderMarkup(config, publicPath);
        const replacement = replaceFirstHeader(html, headerMarkup);

        if (!replacement.found) {
            return;
        }

        if (replacement.html !== html) {
            writeUtf8(filePath, replacement.html);
            touchedFiles.push(filePath);
        }
    });

    return {
        touchedFiles,
        htmlFileCount: htmlFiles.length,
        dataPath
    };
}

if (require.main === module) {
    const result = syncGlobalHeaderHtml();
    console.log(JSON.stringify({
        syncedHeaderFiles: result.touchedFiles.length,
        htmlFileCount: result.htmlFileCount,
        dataPath: result.dataPath
    }, null, 2));
}

module.exports = {
    normalizeHeaderConfig,
    syncGlobalHeaderHtml
};
