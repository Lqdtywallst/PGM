const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../shared/html-utils');

const dataPath = path.join(__dirname, '..', 'data', 'services-editor.json');
const pagePath = path.join(__dirname, '..', '..', 'site', 'pages', 'core', 'services.html');

function readUtf8(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeUtf8(filePath, value) {
    fs.writeFileSync(filePath, value, 'utf8');
}

function slugify(value) {
    return String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item';
}

function requireText(value, label) {
    if (!String(value ?? '').trim()) {
        throw new Error(label);
    }
}

function normalizeLane(lane = {}, index = 0) {
    requireText(lane.navLabel, `Service lane ${index + 1} needs a nav label.`);
    requireText(lane.navMeta, `Service lane ${index + 1} needs a nav meta line.`);
    requireText(lane.href, `Service lane ${index + 1} needs a page link.`);
    requireText(lane.imageSrc, `Service lane ${index + 1} needs an image path.`);
    requireText(lane.cardKicker, `Service lane ${index + 1} needs a panel kicker.`);
    requireText(lane.cardTitle, `Service lane ${index + 1} needs a panel title.`);
    requireText(lane.cardCopy, `Service lane ${index + 1} needs a panel description.`);
    requireText(lane.pointOne, `Service lane ${index + 1} needs point one.`);
    requireText(lane.pointTwo, `Service lane ${index + 1} needs point two.`);
    requireText(lane.pointThree, `Service lane ${index + 1} needs point three.`);
    requireText(lane.buttonLabel, `Service lane ${index + 1} needs a button label.`);

    const slug = slugify(lane.navLabel || lane.cardTitle || `lane-${index + 1}`);

    return {
        navLabel: String(lane.navLabel).trim(),
        navMeta: String(lane.navMeta).trim(),
        href: String(lane.href).trim(),
        imageSrc: String(lane.imageSrc).trim(),
        imageAlt: String(lane.imageAlt || `${String(lane.cardTitle).trim()} service`).trim(),
        cardKicker: String(lane.cardKicker).trim(),
        cardTitle: String(lane.cardTitle).trim(),
        cardCopy: String(lane.cardCopy).trim(),
        pointOne: String(lane.pointOne).trim(),
        pointTwo: String(lane.pointTwo).trim(),
        pointThree: String(lane.pointThree).trim(),
        buttonLabel: String(lane.buttonLabel).trim(),
        analyticsService: String(lane.analyticsService || slug.replace(/-/g, '_')).trim(),
        isActive: Boolean(lane.isActive),
        id: `services-lane-tab-${slug}`,
        ariaLabel: `Open ${String(lane.cardTitle).trim().toLowerCase()} service`
    };
}

function normalizeDirectoryItem(item = {}, label) {
    requireText(item.eyebrow, `${label} needs an eyebrow.`);
    requireText(item.title, `${label} needs a title.`);
    requireText(item.copy, `${label} needs a description.`);
    requireText(item.href, `${label} needs a page link.`);

    return {
        eyebrow: String(item.eyebrow).trim(),
        title: String(item.title).trim(),
        copy: String(item.copy).trim(),
        href: String(item.href).trim()
    };
}

function normalizeServicesContent(content = {}) {
    const lanes = Array.isArray(content.lanes) ? content.lanes.map(normalizeLane) : [];
    const additionalRoutes = Array.isArray(content.additionalRoutes)
        ? content.additionalRoutes.map((item, index) => normalizeDirectoryItem(item, `Additional route ${index + 1}`))
        : [];
    const guideRoutes = Array.isArray(content.guideRoutes)
        ? content.guideRoutes.map((item, index) => normalizeDirectoryItem(item, `Guide route ${index + 1}`))
        : [];

    if (!lanes.length) {
        throw new Error('Services needs at least one main service lane.');
    }

    if (!lanes.some((lane) => lane.isActive)) {
        lanes[0].isActive = true;
    } else {
        let activeFound = false;
        lanes.forEach((lane) => {
            if (lane.isActive && !activeFound) {
                activeFound = true;
                return;
            }

            lane.isActive = false;
        });
    }

    return {
        lanes,
        additionalRoutes,
        guideRoutes
    };
}

function renderLane(lane) {
    const activeClass = lane.isActive ? ' is-active' : '';

    return [
        '                        <a',
        `                            id="${escapeHtml(lane.id)}"`,
        `                            class="services-lane-orb${activeClass}"`,
        `                            href="${escapeHtml(lane.href)}"`,
        `                            aria-label="${escapeHtml(lane.ariaLabel)}"`,
        '                            data-service-selector',
        `                            data-service-kicker="${escapeHtml(lane.cardKicker)}"`,
        `                            data-service-title="${escapeHtml(lane.cardTitle)}"`,
        `                            data-service-copy="${escapeHtml(lane.cardCopy)}"`,
        `                            data-service-point-one="${escapeHtml(lane.pointOne)}"`,
        `                            data-service-point-two="${escapeHtml(lane.pointTwo)}"`,
        `                            data-service-point-three="${escapeHtml(lane.pointThree)}"`,
        `                            data-service-primary-label="${escapeHtml(lane.buttonLabel)}"`,
        `                            data-service-primary-href="${escapeHtml(lane.href)}"`,
        `                            data-service-analytics-service="${escapeHtml(lane.analyticsService)}">`,
        '                            <span class="services-lane-orb__media" aria-hidden="true">',
        `                                <img src="${escapeHtml(lane.imageSrc)}" alt="${escapeHtml(lane.imageAlt)}">`,
        '                            </span>',
        `                            <span class="services-lane-orb__label">${escapeHtml(lane.navLabel)}</span>`,
        `                            <span class="services-lane-orb__meta">${escapeHtml(lane.navMeta)}</span>`,
        '                        </a>'
    ].join('\n');
}

function renderDirectoryItem(item) {
    return [
        `                            <a class="services-directory__item" href="${escapeHtml(item.href)}">`,
        `                                <span class="services-directory__eyebrow">${escapeHtml(item.eyebrow)}</span>`,
        `                                <strong class="services-directory__title">${escapeHtml(item.title)}</strong>`,
        `                                <p class="services-directory__copy">${escapeHtml(item.copy)}</p>`,
        '                            </a>'
    ].join('\n');
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
        throw new Error(`Could not locate the ${config.label} block in services.html.`);
    }

    return html.replace(config.pattern, `$1${newline}${block}${newline}$3`);
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function syncServicesHtmlFromData() {
    const data = normalizeServicesContent(JSON.parse(readUtf8(dataPath)));
    const html = readUtf8(pagePath);
    const newline = html.includes('\r\n') ? '\r\n' : '\n';
    const laneMarkup = data.lanes.map(renderLane).join(`${newline}${newline}`);
    const additionalMarkup = data.additionalRoutes.map(renderDirectoryItem).join(`${newline}${newline}`);
    const guideMarkup = data.guideRoutes.map(renderDirectoryItem).join(`${newline}${newline}`);

    let nextHtml = html;

    nextHtml = replaceMarkerBlock(nextHtml, {
        start: '<!-- SERVICES_LANES_START -->',
        end: '<!-- SERVICES_LANES_END -->',
        indent: '                        ',
        label: 'service lanes',
        pattern: /(<nav class="services-hero__selector" aria-label="Primary service lanes">)([\s\S]*?)(\s*<\/nav>)/
    }, laneMarkup.replace(/\n/g, newline), newline);

    nextHtml = replaceMarkerBlock(nextHtml, {
        start: '<!-- SERVICES_ADDITIONAL_ROUTES_START -->',
        end: '<!-- SERVICES_ADDITIONAL_ROUTES_END -->',
        indent: '                            ',
        label: 'additional service routes',
        pattern: /(id="services-directory-services">Additional service routes<\/h3>\s*<div class="services-directory__list">)([\s\S]*?)(\s*<\/div>\s*<\/section>)/
    }, additionalMarkup.replace(/\n/g, newline), newline);

    nextHtml = replaceMarkerBlock(nextHtml, {
        start: '<!-- SERVICES_GUIDE_ROUTES_START -->',
        end: '<!-- SERVICES_GUIDE_ROUTES_END -->',
        indent: '                            ',
        label: 'location-led guide routes',
        pattern: /(id="services-directory-guides">Location-led guides<\/h3>\s*<div class="services-directory__list">)([\s\S]*?)(\s*<\/div>\s*<\/section>)/
    }, guideMarkup.replace(/\n/g, newline), newline);

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
    normalizeServicesContent,
    syncServicesHtmlFromData
};
