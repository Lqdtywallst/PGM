const fs = require('fs');
const path = require('path');
const { PUBLIC_PAGE_FILE_MAP, siteFileForPublicPath } = require('../shared/public-page-map');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');

function readUtf8(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function decodeHtml(value) {
    return String(value ?? '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function stripTags(value) {
    return decodeHtml(String(value ?? '').replace(/<[^>]*>/g, ''))
        .replace(/\s+/g, ' ')
        .trim();
}

function extractFirst(source, pattern) {
    const match = String(source || '').match(pattern);
    return match ? decodeHtml(match[1] || '').trim() : '';
}

function extractAll(source, pattern, mapper = (match) => match[1]) {
    return Array.from(String(source || '').matchAll(pattern))
        .map((match) => mapper(match))
        .filter(Boolean);
}

function parseAttributes(tag = '') {
    const attrs = {};
    const attrPattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

    for (const match of String(tag || '').matchAll(attrPattern)) {
        attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? '').trim();
    }

    return attrs;
}

function extractMetaContent(html, key, value) {
    const normalizedKey = String(key || '').toLowerCase();
    const normalizedValue = String(value || '').toLowerCase();

    for (const match of String(html || '').matchAll(/<meta\b[^>]*>/gi)) {
        const attrs = parseAttributes(match[0]);
        if (String(attrs[normalizedKey] || '').toLowerCase() === normalizedValue) {
            return attrs.content || '';
        }
    }

    return '';
}

function normalizeSignature(values = []) {
    return values
        .map((value) => stripTags(value).toLowerCase())
        .filter(Boolean)
        .join('|');
}

function extractHeader(html) {
    return extractFirst(html, /(<header\b[\s\S]*?<\/header>)/i);
}

function extractMainNavLabels(headerHtml) {
    const navBlock = extractFirst(headerHtml, /(<nav class="lab-nav"[\s\S]*?<\/nav>)/i);
    const directLinks = String(navBlock || '')
        .split(/\r\n|\r|\n/)
        .map((line) => {
            const match = line.match(/^\s{20}<a\b[^>]*>([\s\S]*?)<\/a>\s*$/);
            return match ? stripTags(match[1]) : '';
        })
        .filter(Boolean);
    const dropdowns = extractAll(navBlock, /class="lab-nav__trigger"[\s\S]*?<span>([\s\S]*?)<\/span>/gi, (match) => stripTags(match[1]));

    return [...directLinks, ...dropdowns].filter(Boolean);
}

function extractUtilityLabels(headerHtml) {
    return extractAll(headerHtml, /class="lab-header__utility-link"[\s\S]*?<span>([\s\S]*?)<\/span>/gi, (match) => stripTags(match[1]));
}

function extractFaviconHref(html) {
    return extractFirst(html, /<link\b(?=[^>]*rel=["'](?:shortcut icon|icon|apple-touch-icon)["'])[^>]*href=["']([^"']+)["'][^>]*>/i);
}

function extractFontHrefs(html) {
    return extractAll(html, /<link\b(?=[^>]*href=["']([^"']*fonts\.googleapis\.com[^"']*)["'])[^>]*>/gi, (match) => decodeHtml(match[1]).trim());
}

function extractStylesheetHrefs(html) {
    return extractAll(html, /<link\b(?=[^>]*rel=["']stylesheet["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/gi, (match) => decodeHtml(match[1]).trim());
}

function buildPageProfile(publicPath, relativePath, filePath) {
    const html = readUtf8(filePath);
    const header = extractHeader(html);
    const navLabels = extractMainNavLabels(header);
    const utilityLabels = extractUtilityLabels(header);
    const h1s = extractAll(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (match) => stripTags(match[1]));
    const title = extractFirst(html, /<title>([\s\S]*?)<\/title>/i);
    const description = extractMetaContent(html, 'name', 'description');
    const bodyClass = extractFirst(html, /<body\b[^>]*class=["']([^"']*)["'][^>]*>/i);
    const faviconHref = extractFaviconHref(html);
    const fontHrefs = extractFontHrefs(html);
    const stylesheetHrefs = extractStylesheetHrefs(html);

    return {
        publicPath,
        relativePath,
        bodyClass,
        title,
        titleLength: title.length,
        description,
        descriptionLength: description.length,
        faviconHref,
        fontSignature: normalizeSignature(fontHrefs),
        fonts: fontHrefs,
        stylesheetSignature: normalizeSignature(stylesheetHrefs),
        stylesheets: stylesheetHrefs,
        hasSharedHeader: /class=["'][^"']*\blab-header\b/i.test(header),
        navLabels,
        navSignature: normalizeSignature(navLabels),
        utilityLabels,
        utilitySignature: normalizeSignature(utilityLabels),
        h1s,
        h1Count: h1s.length
    };
}

function severityRank(severity) {
    return { high: 3, medium: 2, low: 1 }[severity] || 0;
}

function addFinding(findings, finding) {
    findings.push(finding);
}

function summarizeFindings(findings = []) {
    return findings.reduce((summary, finding) => {
        summary.total += 1;
        summary.bySeverity[finding.severity] = (summary.bySeverity[finding.severity] || 0) + 1;
        summary.byCategory[finding.category] = (summary.byCategory[finding.category] || 0) + 1;
        return summary;
    }, {
        total: 0,
        bySeverity: {},
        byCategory: {}
    });
}

function compareAgainstBaseline(pages, baseline) {
    const findings = [];

    pages.forEach((page) => {
        if (!page.title) {
            addFinding(findings, {
                severity: 'high',
                category: 'missing_title',
                route: page.publicPath,
                message: 'This page has no browser tab title.'
            });
        } else if (page.titleLength > 90) {
            addFinding(findings, {
                severity: 'low',
                category: 'long_title',
                route: page.publicPath,
                message: `The tab title is long (${page.titleLength} characters).`
            });
        }

        if (!page.description) {
            addFinding(findings, {
                severity: 'high',
                category: 'missing_description',
                route: page.publicPath,
                message: 'This page has no SEO description.'
            });
        } else if (page.descriptionLength < 70 || page.descriptionLength > 180) {
            addFinding(findings, {
                severity: 'low',
                category: 'description_length',
                route: page.publicPath,
                message: `The SEO description is ${page.descriptionLength} characters.`
            });
        }

        if (!page.hasSharedHeader) {
            addFinding(findings, {
                severity: 'high',
                category: 'header_missing_or_custom',
                route: page.publicPath,
                message: 'This page does not expose the shared lab header.'
            });
        } else if (baseline?.navSignature && page.navSignature !== baseline.navSignature) {
            addFinding(findings, {
                severity: 'high',
                category: 'header_navigation_drift',
                route: page.publicPath,
                message: `Header tabs differ from home. Found: ${page.navLabels.join(' | ')}`
            });
        }

        if (baseline?.utilitySignature && page.utilitySignature !== baseline.utilitySignature) {
            addFinding(findings, {
                severity: 'medium',
                category: 'header_utility_drift',
                route: page.publicPath,
                message: `Quick contact buttons differ from home. Found: ${page.utilityLabels.join(' | ')}`
            });
        }

        if (baseline?.faviconHref && page.faviconHref !== baseline.faviconHref) {
            addFinding(findings, {
                severity: 'medium',
                category: 'favicon_drift',
                route: page.publicPath,
                message: `Favicon differs from home. Found: ${page.faviconHref || 'none'}`
            });
        }

        if (baseline?.fontSignature && page.fontSignature && page.fontSignature !== baseline.fontSignature) {
            addFinding(findings, {
                severity: 'medium',
                category: 'font_import_drift',
                route: page.publicPath,
                message: 'Google font imports differ from the home page.'
            });
        }

        if (page.h1Count !== 1) {
            addFinding(findings, {
                severity: page.h1Count === 0 ? 'high' : 'medium',
                category: 'h1_count',
                route: page.publicPath,
                message: `Expected one H1, found ${page.h1Count}.`
            });
        }
    });

    return findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function runContentConsistencyAudit() {
    const pages = Object.entries(PUBLIC_PAGE_FILE_MAP)
        .map(([publicPath, relativePath]) => {
            const filePath = siteFileForPublicPath(siteRoot, publicPath);
            return {
                publicPath,
                relativePath,
                filePath
            };
        })
        .filter((page) => fs.existsSync(page.filePath))
        .map((page) => buildPageProfile(page.publicPath, page.relativePath, page.filePath));
    const baseline = pages.find((page) => page.publicPath === '/') || pages[0] || null;
    const findings = compareAgainstBaseline(pages, baseline);

    return {
        generatedAt: new Date().toISOString(),
        baselineRoute: baseline?.publicPath || null,
        pageCount: pages.length,
        summary: summarizeFindings(findings),
        findings,
        pages
    };
}

module.exports = {
    runContentConsistencyAudit
};
