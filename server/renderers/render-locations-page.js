const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../shared/html-utils');

const dataPath = path.join(__dirname, '..', 'data', 'locations-editor.json');
const pagePath = path.join(__dirname, '..', '..', 'site', 'pages', 'core', 'locations.html');

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

function normalizeLinkItem(item = {}, label) {
    requireText(item.label, `${label} needs a label.`);
    requireText(item.title, `${label} needs a title.`);
    requireText(item.copy, `${label} needs a description.`);
    requireText(item.href, `${label} needs a page link.`);

    return {
        label: String(item.label).trim(),
        title: String(item.title).trim(),
        copy: String(item.copy).trim(),
        href: String(item.href).trim()
    };
}

function normalizeAction(action = {}, label) {
    const actionLabel = String(action.label ?? '').trim();
    const actionHref = String(action.href ?? '').trim();

    if (!actionLabel && !actionHref) {
        return null;
    }

    requireText(actionLabel, `${label} needs an action label.`);
    requireText(actionHref, `${label} needs an action link.`);

    return {
        label: actionLabel,
        href: actionHref
    };
}

function normalizeZoneCard(card = {}, index = 0) {
    requireText(card.label, `Location route card ${index + 1} needs a label.`);
    requireText(card.title, `Location route card ${index + 1} needs a title.`);
    requireText(card.copy, `Location route card ${index + 1} needs a description.`);

    const actions = Array.isArray(card.actions)
        ? card.actions.map((action, actionIndex) => normalizeAction(action, `Location route card ${index + 1}, action ${actionIndex + 1}`)).filter(Boolean)
        : [];

    if (!actions.length) {
        throw new Error(`Location route card ${index + 1} needs at least one action.`);
    }

    return {
        label: String(card.label).trim(),
        title: String(card.title).trim(),
        copy: String(card.copy).trim(),
        actions
    };
}

function normalizeProcessStep(step = {}, index = 0) {
    requireText(step.title, `Process step ${index + 1} needs a title.`);
    requireText(step.copy, `Process step ${index + 1} needs a description.`);

    return {
        title: String(step.title).trim(),
        copy: String(step.copy).trim()
    };
}

function normalizeLocationsContent(content = {}) {
    const heroZones = Array.isArray(content.heroZones)
        ? content.heroZones.map((item, index) => normalizeLinkItem(item, `Hero zone ${index + 1}`))
        : [];
    const guideCards = Array.isArray(content.guideCards)
        ? content.guideCards.map((item, index) => normalizeLinkItem(item, `Guide card ${index + 1}`))
        : [];
    const zoneCards = Array.isArray(content.zoneCards)
        ? content.zoneCards.map(normalizeZoneCard)
        : [];
    const processSteps = Array.isArray(content.processSteps)
        ? content.processSteps.map(normalizeProcessStep)
        : [];

    if (!heroZones.length) {
        throw new Error('Locations needs at least one hero zone.');
    }

    return {
        heroZones,
        guideCards,
        zoneCards,
        processSteps
    };
}

function renderHeroZone(item) {
    return [
        `                        <a class="locations-hero__zone" href="${escapeHtml(item.href)}">`,
        `                            <span>${escapeHtml(item.label)}</span>`,
        `                            <strong>${escapeHtml(item.title)}</strong>`,
        `                            <p>${escapeHtml(item.copy)}</p>`,
        '                        </a>'
    ].join('\n');
}

function renderGuideCard(item) {
    return [
        '                    <article class="locations-guide-card">',
        `                        <span>${escapeHtml(item.label)}</span>`,
        `                        <h3>${escapeHtml(item.title)}</h3>`,
        `                        <p>${escapeHtml(item.copy)}</p>`,
        `                        <a href="${escapeHtml(item.href)}">Open ${escapeHtml(item.title)} guide</a>`,
        '                    </article>'
    ].join('\n');
}

function renderZoneCard(card) {
    const actionsMarkup = card.actions.map((action) => {
        const isWhatsApp = /^https:\/\/wa\.me\//i.test(action.href);
        const attributes = isWhatsApp
            ? ' target="_blank" rel="noopener noreferrer" data-analytics-event="location_whatsapp_click" data-analytics-cluster="locations" data-analytics-location="locations_hub" data-analytics-placement="zone_card" data-analytics-channel="whatsapp"'
            : '';

        return `                            <a href="${escapeHtml(action.href)}"${attributes}>${escapeHtml(action.label)}</a>`;
    }).join('\n');

    return [
        '                    <article class="locations-zone-card">',
        `                        <span>${escapeHtml(card.label)}</span>`,
        `                        <h3>${escapeHtml(card.title)}</h3>`,
        `                        <p>${escapeHtml(card.copy)}</p>`,
        '                        <div class="locations-zone-card__actions">',
        actionsMarkup,
        '                        </div>',
        '                    </article>'
    ].join('\n');
}

function renderProcessStep(step, index) {
    const stepNumber = String(index + 1).padStart(2, '0');

    return [
        '                    <li class="locations-process__item">',
        `                        <strong>${escapeHtml(stepNumber)}</strong>`,
        `                        <h3>${escapeHtml(step.title)}</h3>`,
        `                        <p>${escapeHtml(step.copy)}</p>`,
        '                    </li>'
    ].join('\n');
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMarkerBlock(html, config, markup, newline) {
    const block = [config.indent + config.start, markup, config.indent + config.end].join(newline);

    if (html.includes(config.start) && html.includes(config.end)) {
        return html.replace(
            new RegExp(`${escapeRegExp(config.start)}[\\s\\S]*?${escapeRegExp(config.end)}`, 'm'),
            block
        );
    }

    if (!config.pattern.test(html)) {
        throw new Error(`Could not locate the ${config.label} block in locations.html.`);
    }

    return html.replace(config.pattern, `$1${newline}${block}${newline}$3`);
}

function syncLocationsHtmlFromData() {
    const data = normalizeLocationsContent(JSON.parse(readUtf8(dataPath)));
    const html = readUtf8(pagePath);
    const newline = html.includes('\r\n') ? '\r\n' : '\n';

    let nextHtml = html;

    nextHtml = replaceMarkerBlock(nextHtml, {
        start: '<!-- LOCATIONS_HERO_ZONES_START -->',
        end: '<!-- LOCATIONS_HERO_ZONES_END -->',
        indent: '                        ',
        label: 'hero zones',
        pattern: /(<nav class="locations-hero__zone-list" aria-label="Priority location guides">)([\s\S]*?)(\s*<\/nav>)/
    }, data.heroZones.map(renderHeroZone).join(`${newline}${newline}`).replace(/\n/g, newline), newline);

    nextHtml = replaceMarkerBlock(nextHtml, {
        start: '<!-- LOCATIONS_GUIDE_CARDS_START -->',
        end: '<!-- LOCATIONS_GUIDE_CARDS_END -->',
        indent: '                    ',
        label: 'guide cards',
        pattern: /(<article class="locations-guide-feature">[\s\S]*?<\/article>)([\s\S]*?)(\s*<\/div>\s*<\/div>\s*<\/section>)/
    }, data.guideCards.map(renderGuideCard).join(`${newline}${newline}`).replace(/\n/g, newline), newline);

    nextHtml = replaceMarkerBlock(nextHtml, {
        start: '<!-- LOCATIONS_ZONE_CARDS_START -->',
        end: '<!-- LOCATIONS_ZONE_CARDS_END -->',
        indent: '                    ',
        label: 'zone cards',
        pattern: /(<div class="locations-zone-grid">)([\s\S]*?)(\s*<\/div>\s*<\/div>\s*<\/section>)/
    }, data.zoneCards.map(renderZoneCard).join(`${newline}${newline}`).replace(/\n/g, newline), newline);

    nextHtml = replaceMarkerBlock(nextHtml, {
        start: '<!-- LOCATIONS_PROCESS_STEPS_START -->',
        end: '<!-- LOCATIONS_PROCESS_STEPS_END -->',
        indent: '                    ',
        label: 'process steps',
        pattern: /(<ol class="locations-process__list">)([\s\S]*?)(\s*<\/ol>\s*<\/div>\s*<\/section>)/
    }, data.processSteps.map(renderProcessStep).join(`${newline}${newline}`).replace(/\n/g, newline), newline);

    if (nextHtml !== html) {
        writeUtf8(pagePath, nextHtml);
    }

    return {
        pagePath,
        dataPath,
        changed: nextHtml !== html
    };
}

module.exports = {
    normalizeLocationsContent,
    syncLocationsHtmlFromData
};
