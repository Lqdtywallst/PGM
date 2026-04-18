const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const projectRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(projectRoot, 'site');
const publicOrigin = 'https://prestigegoalmotion.com';
const defaultImage = `${publicOrigin}/logo-dp-transparent.png`;

const managedMetaKeys = [
    ['property', 'og:type'],
    ['property', 'og:url'],
    ['property', 'og:title'],
    ['property', 'og:description'],
    ['property', 'og:image'],
    ['name', 'twitter:card'],
    ['name', 'twitter:title'],
    ['name', 'twitter:description'],
    ['name', 'twitter:image']
];

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function decodeHtmlEntities(value) {
    const entities = {
        '&amp;': '&',
        '&quot;': '"',
        '&#39;': '\'',
        '&apos;': '\'',
        '&lt;': '<',
        '&gt;': '>',
        '&nbsp;': ' ',
        '&middot;': '·',
        '&ndash;': '-',
        '&mdash;': '-'
    };

    let next = String(value || '');
    let previous = '';

    while (next !== previous) {
        previous = next;
        next = next.replace(/&(amp|quot|#39|apos|lt|gt|nbsp|middot|ndash|mdash);/gi, (match) => {
            const normalized = match.toLowerCase();
            return Object.prototype.hasOwnProperty.call(entities, normalized) ? entities[normalized] : match;
        });
    }

    return next;
}

function normalizeExtractedValue(value) {
    return decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
}

function readSitemapPaths() {
    const sitemap = fs.readFileSync(path.join(siteRoot, 'sitemap.xml'), 'utf8');
    return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => {
        const parsed = new URL(match[1].trim());
        return parsed.pathname || '/';
    });
}

function siteFileForPath(pathname) {
    if (pathname === '/') {
        return path.join(siteRoot, 'index.html');
    }

    return path.join(siteRoot, pathname.replace(/^\//, ''));
}

function extractTitle(head) {
    return (head.match(/<title>([^<]+)<\/title>/i) || [])[1] || '';
}

function extractDescription(head) {
    return (head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1] || '';
}

function extractCanonical(head) {
    return (head.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || '';
}

function extractMeta(head, attributeName, attributeValue) {
    const pattern = new RegExp(
        `<meta[^>]+${attributeName}=["']${escapeRegExp(attributeValue)}["'][^>]+content=["']([^"']*)["'][^>]*>`,
        'i'
    );
    return (head.match(pattern) || [])[1] || '';
}

function toAbsoluteUrl(value, canonical) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return '';
    }

    try {
        return new URL(normalized, canonical || publicOrigin).href;
    } catch (error) {
        return normalized;
    }
}

function removeManagedMetaTags(head) {
    let nextHead = head;

    managedMetaKeys.forEach(([attributeName, attributeValue]) => {
        const pattern = new RegExp(
            `\\n?\\s*<meta[^>]+${attributeName}=["']${escapeRegExp(attributeValue)}["'][^>]*>\\s*`,
            'gi'
        );
        nextHead = nextHead.replace(pattern, '\n');
    });

    return nextHead.replace(/\n{3,}/g, '\n\n');
}

function buildSocialBlock(values) {
    return [
        '    <meta property="og:type" content="website">',
        `    <meta property="og:url" content="${escapeHtml(values.ogUrl)}">`,
        `    <meta property="og:title" content="${escapeHtml(values.ogTitle)}">`,
        `    <meta property="og:description" content="${escapeHtml(values.ogDescription)}">`,
        `    <meta property="og:image" content="${escapeHtml(values.ogImage)}">`,
        '    <meta name="twitter:card" content="summary_large_image">',
        `    <meta name="twitter:title" content="${escapeHtml(values.twitterTitle)}">`,
        `    <meta name="twitter:description" content="${escapeHtml(values.twitterDescription)}">`,
        `    <meta name="twitter:image" content="${escapeHtml(values.twitterImage)}">`
    ].join('\n');
}

function insertSocialBlock(head, block) {
    if (/<link[^>]+rel=["']canonical["'][^>]*>/i.test(head)) {
        return head.replace(/(<link[^>]+rel=["']canonical["'][^>]*>)/i, `$1\n${block}`);
    }

    if (/<meta[^>]+name=["']description["'][^>]*>/i.test(head)) {
        return head.replace(/(<meta[^>]+name=["']description["'][^>]*>)/i, `$1\n${block}`);
    }

    return head.replace(/<\/head>/i, `${block}\n</head>`);
}

function syncFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    const next = original.replace(/<head>([\s\S]*?)<\/head>/i, (match, headInner) => {
        const title = normalizeExtractedValue(extractTitle(headInner));
        const description = normalizeExtractedValue(extractDescription(headInner));
        const canonical = normalizeExtractedValue(extractCanonical(headInner));
        const ogTitle = normalizeExtractedValue(extractMeta(headInner, 'property', 'og:title')) || title;
        const ogDescription = normalizeExtractedValue(extractMeta(headInner, 'property', 'og:description')) || description;
        const ogImage = toAbsoluteUrl(normalizeExtractedValue(extractMeta(headInner, 'property', 'og:image')) || defaultImage, canonical);

        const socialValues = {
            ogUrl: toAbsoluteUrl(canonical, canonical || publicOrigin),
            ogTitle,
            ogDescription,
            ogImage,
            twitterTitle: ogTitle,
            twitterDescription: ogDescription,
            twitterImage: ogImage
        };

        const cleanedHead = removeManagedMetaTags(headInner);
        const updatedHead = insertSocialBlock(cleanedHead, buildSocialBlock(socialValues));

        return `<head>${updatedHead}</head>`;
    });

    if (next !== original) {
        fs.writeFileSync(filePath, next, 'utf8');
        return true;
    }

    return false;
}

function run() {
    const files = readSitemapPaths().map(siteFileForPath);
    let updated = 0;

    files.forEach((filePath) => {
        if (syncFile(filePath)) {
            updated += 1;
        }
    });

    console.log(`Social meta sync completed. Updated ${updated} files.`);
}

run();
