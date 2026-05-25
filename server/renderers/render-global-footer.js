const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../shared/html-utils');
const { publicPathForSiteFile } = require('../shared/public-page-map');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');
const dataPath = path.join(__dirname, '..', 'data', 'global-footer.json');

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

function normalizeLink(item = {}, label) {
    requireText(item.label, `${label} needs a label.`);
    requireText(item.href, `${label} needs a link.`);

    return {
        label: String(item.label).trim(),
        href: String(item.href).trim(),
        ariaLabel: String(item.ariaLabel || '').trim(),
        visible: item.visible !== false
    };
}

function normalizeColumn(column = {}, index = 0) {
    requireText(column.title, `Footer column ${index + 1} needs a title.`);

    const links = Array.isArray(column.links)
        ? column.links.map((item, linkIndex) => normalizeLink(item, `Footer column ${index + 1}, link ${linkIndex + 1}`))
        : [];

    if (!links.length) {
        throw new Error(`Footer column ${index + 1} needs at least one link.`);
    }

    return {
        title: String(column.title).trim(),
        variant: String(column.variant || 'links').trim().toLowerCase(),
        links,
        body: String(column.body || '').trim(),
        visible: column.visible !== false
    };
}

function normalizeFooterConfig(config = {}) {
    requireText(config.brand?.crestSrc, 'Footer brand needs a crest image.');
    requireText(config.brand?.text, 'Footer brand needs text.');

    const columns = Array.isArray(config.columns)
        ? config.columns.map(normalizeColumn)
        : [];

    if (!columns.length) {
        throw new Error('Footer needs at least one column.');
    }

    const legal = Array.isArray(config.legal)
        ? config.legal.map((item, index) => normalizeLink(item, `Footer legal link ${index + 1}`))
        : [];

    const socials = Array.isArray(config.socials)
        ? config.socials.map((item, index) => normalizeLink(item, `Footer social link ${index + 1}`))
        : [];

    requireText(config.service?.label, 'Footer service needs a label.');
    requireText(config.service?.text, 'Footer service needs text.');
    requireText(config.copyright, 'Footer needs copyright text.');

    return {
        brand: {
            crestSrc: String(config.brand.crestSrc).trim(),
            text: String(config.brand.text).trim()
        },
        columns,
        service: {
            label: String(config.service.label).trim(),
            text: String(config.service.text).trim()
        },
        legal,
        socials,
        copyright: String(config.copyright).trim()
    };
}

function linkAttributes(link, currentPublicPath) {
    const attrs = [
        `href="${escapeHtml(link.href)}"`
    ];

    const normalizedHref = link.href === '/index.html' ? '/' : link.href;
    const normalizedCurrent = currentPublicPath === '/index.html' ? '/' : currentPublicPath;

    if (normalizedHref === normalizedCurrent) {
        attrs.push('aria-current="page"');
    }

    if (link.ariaLabel) {
        attrs.push(`aria-label="${escapeHtml(link.ariaLabel)}"`);
    }

    if (/^https?:/i.test(link.href)) {
        attrs.push('target="_blank"', 'rel="noopener"');
    }

    return attrs.join(' ');
}

function renderColumn(column, currentPublicPath) {
    const variantClass = column.variant ? ` site-v2-footer__column--${escapeHtml(column.variant)}` : '';
    const bodyMarkup = column.body
        ? `                        <p>${escapeHtml(column.body)}</p>`
        : '';

    return [
        `                    <div class="site-v2-footer__column${variantClass}">`,
        `                        <h3>${escapeHtml(column.title)}</h3>`,
        column.links
            .filter((link) => link.visible)
            .map((link) => `                        <a ${linkAttributes(link, currentPublicPath)}>${escapeHtml(link.label)}</a>`)
            .join('\n'),
        bodyMarkup,
        '                    </div>'
    ].filter(Boolean).join('\n');
}

function buildFooterMarkup(config, currentPublicPath = '/', options = {}) {
    const className = String(options.className || 'site-v2-footer').trim();
    const id = String(options.id || 'contact').trim();
    const idAttr = id ? ` id="${escapeHtml(id)}"` : '';

    return [
        `            <footer class="${escapeHtml(className)}"${idAttr}>`,
        '                <div class="lab-shell site-v2-footer__shell">',
        '                    <div class="site-v2-footer__top">',
        '                        <div class="site-v2-footer__brand">',
        '                            <span class="site-v2-footer__crest" aria-hidden="true">',
        `                                <img src="${escapeHtml(config.brand.crestSrc)}" alt="">`,
        '                            </span>',
        `                            <p>${escapeHtml(config.brand.text)}</p>`,
        '                        </div>',
        '',
        config.columns
            .filter((column) => column.visible)
            .map((column) => renderColumn(column, currentPublicPath))
            .join('\n\n'),
        '                    </div>',
        '',
        '                    <div class="site-v2-footer__middle">',
        '                        <div class="site-v2-footer__service">',
        `                            <strong>${escapeHtml(config.service.label)}</strong>`,
        `                            <span>${escapeHtml(config.service.text)}</span>`,
        '                        </div>',
        '                    </div>',
        '',
        '                    <div class="site-v2-footer__bottom">',
        '                        <div class="site-v2-footer__legal">',
        config.legal
            .filter((link) => link.visible)
            .map((link) => `                            <a ${linkAttributes(link, currentPublicPath)}>${escapeHtml(link.label)}</a>`)
            .join('\n'),
        '                        </div>',
        `                        <p>${escapeHtml(config.copyright)}</p>`,
        '                        <div class="site-v2-footer__socials">',
        config.socials
            .filter((link) => link.visible)
            .map((link) => `                            <a ${linkAttributes(link, currentPublicPath)}>${escapeHtml(link.label)}</a>`)
            .join('\n'),
        '                        </div>',
        '                    </div>',
        '                </div>',
        '            </footer>'
    ].join('\n');
}

function replaceFirstFooter(html, footerMarkupFactory) {
    const pattern = /[ \t]*<footer class="([^"]*(?:\bsite-v2-footer\b|\bpage-foot\b)[^"]*)"(?: id="([^"]+)")?>[\s\S]*?<\/footer>/;
    const match = html.match(pattern);

    if (!match) {
        return { found: false, html };
    }

    const className = /\bsite-v2-footer\b/.test(match[1])
        ? match[1]
        : 'site-v2-footer';

    return {
        found: true,
        html: html.replace(pattern, footerMarkupFactory({
            className,
            id: match[2] || 'contact'
        }))
    };
}

function syncGlobalFooterHtml() {
    const config = normalizeFooterConfig(JSON.parse(readUtf8(dataPath)));
    const htmlFiles = listHtmlFiles(siteRoot);
    const touchedFiles = [];

    htmlFiles.forEach((filePath) => {
        const html = readUtf8(filePath);
        const publicPath = publicPathForSiteFile(siteRoot, filePath);
        const replacement = replaceFirstFooter(html, (options) => buildFooterMarkup(config, publicPath, options));

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
    const result = syncGlobalFooterHtml();
    console.log(JSON.stringify({
        syncedFooterFiles: result.touchedFiles.length,
        htmlFileCount: result.htmlFileCount,
        dataPath: result.dataPath
    }, null, 2));
}

module.exports = {
    buildFooterMarkup,
    normalizeFooterConfig,
    replaceFirstFooter,
    syncGlobalFooterHtml
};
