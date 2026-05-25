const fs = require('fs');
const path = require('path');

const {
    countMatches,
    extractTagValue,
    parseSitemapPaths,
    publicPathForFile,
    siteFileForPath
} = require('../shared/site-audit-utils');

const DEFAULT_PUBLIC_ORIGIN = 'https://www.dynastyprestigecarrental.com';
const BROKEN_ENCODING_PATTERN = /(?:Ã‚|Ãƒ.|Ã¢â‚¬â€|Ã¢â‚¬â€œ|Ã¢â‚¬|ï¿½)/;
const PLACEHOLDER_PATTERN = /\b(?:TODO|Lorem ipsum|coming soon|placeholder|N\/A)\b/i;
const GENERIC_CTA_PATTERN = /^(?:click here|learn more|read more|more|details|submit|view|open)$/i;
const HTML_MARKUP_PATTERN = /<[^>]+>/;

const ROUTE_FAMILIES = Object.freeze({
    locationGuide: new Set([
        '/luxury-car-rental-dubai.html',
        '/abu-dhabi-luxury-car-rental.html',
        '/dubai-airport-luxury-car-rental.html',
        '/palm-jumeirah-luxury-car-rental.html',
        '/dubai-marina-luxury-car-rental.html'
    ]),
    serviceDetail: new Set([
        '/chauffeur-service-dubai.html',
        '/airport-concierge-dubai.html',
        '/hotel-villa-airport-delivery-dubai.html',
        '/wedding-event-car-rental-dubai.html',
        '/business-car-rental-dubai.html',
        '/monthly-luxury-car-rental-dubai.html'
    ]),
    productCommercial: new Set([
        '/lamborghini-rental-dubai.html',
        '/lamborghini-huracan-evo-spyder-rental-dubai.html',
        '/lamborghini-urus-rental-dubai.html',
        '/ferrari-rental-dubai.html',
        '/ferrari-296-gts-rental-dubai.html',
        '/mercedes-rental-dubai.html',
        '/mercedes-g63-amg-rental-dubai.html',
        '/porsche-rental-dubai.html',
        '/porsche-992-gt3-rental-dubai.html',
        '/rolls-royce-rental-dubai.html',
        '/rolls-royce-cullinan-black-badge-rental-dubai.html'
    ]),
    seoLanding: new Set([
        '/supercar-rental-dubai.html'
    ])
});

const STOP_INTENT_TOKENS = new Set([
    'and',
    'app',
    'black',
    'car',
    'conditions',
    'dubai',
    'html',
    'luxury',
    'lookup',
    'page',
    'prestige',
    'rental',
    'rent',
    'reserve',
    'service',
    'the',
    'uae'
]);

const FAMILY_MIN_WORDS = Object.freeze({
    home: 120,
    fleet: 120,
    'locations-hub': 150,
    'services-hub': 150,
    contact: 80,
    about: 120,
    reserve: 60,
    'location-guide': 230,
    'service-detail': 230,
    'product-commercial': 260,
    'seo-landing': 230,
    legal: 180,
    'public-page': 100
});

function normalizeRoute(route = '/') {
    let pathname = String(route || '/').trim();

    try {
        pathname = new URL(pathname, DEFAULT_PUBLIC_ORIGIN).pathname;
    } catch (error) {
        pathname = pathname.split(/[?#]/)[0] || '/';
    }

    if (pathname === '/index.html') {
        return '/';
    }

    return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname || '/';
}

function normalizeText(value = '') {
    return decodeHtmlEntities(value)
        .replace(/\s+/g, ' ')
        .trim();
}

function decodeHtmlEntities(value = '') {
    return String(value || '')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function stripHtmlForText(html = '') {
    return normalizeText(
        String(html || '')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<[^>]+>/g, ' ')
    );
}

function getAttribute(tag = '', attributeName = '') {
    const escapedName = String(attributeName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedName}\\s*=\\s*(['"])(.*?)\\1`, 'i');
    const match = String(tag || '').match(pattern);
    return match ? normalizeText(match[2]) : '';
}

function extractTags(html = '', tagName = '') {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
    return String(html || '').match(pattern) || [];
}

function extractMetaContent(html = '', attributeName = '', attributeValue = '') {
    const metas = extractTags(html, 'meta');

    for (const tag of metas) {
        if (getAttribute(tag, attributeName).toLowerCase() === String(attributeValue).toLowerCase()) {
            return getAttribute(tag, 'content');
        }
    }

    return '';
}

function extractLinkHref(html = '', rel = '') {
    const links = extractTags(html, 'link');

    for (const tag of links) {
        const relTokens = getAttribute(tag, 'rel').toLowerCase().split(/\s+/);
        if (relTokens.includes(String(rel).toLowerCase())) {
            return getAttribute(tag, 'href');
        }
    }

    return '';
}

function extractAnchorRecords(html = '') {
    return [...String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => {
        const attrs = match[1] || '';
        const body = match[2] || '';
        const imageAlt = [...body.matchAll(/<img\b[^>]*\balt\s*=\s*(['"])(.*?)\1/gi)]
            .map((altMatch) => altMatch[2])
            .join(' ');

        return {
            href: getAttribute(attrs, 'href'),
            target: getAttribute(attrs, 'target'),
            rel: getAttribute(attrs, 'rel'),
            text: normalizeText(`${stripHtmlForText(body)} ${imageAlt}`)
        };
    });
}

function extractImageRecords(html = '') {
    return extractTags(html, 'img').map((tag) => ({
        src: getAttribute(tag, 'src'),
        srcset: getAttribute(tag, 'srcset'),
        alt: getAttribute(tag, 'alt'),
        width: getAttribute(tag, 'width'),
        height: getAttribute(tag, 'height'),
        loading: getAttribute(tag, 'loading'),
        tag
    }));
}

function extractReferenceRecords(html = '') {
    const records = [];
    const attributePattern = /\b(href|src|action|poster)=\s*(['"])(.*?)\2/gi;
    let match;

    while ((match = attributePattern.exec(html)) !== null) {
        records.push({
            attribute: match[1].toLowerCase(),
            value: normalizeText(match[3])
        });
    }

    for (const image of extractImageRecords(html)) {
        if (!image.srcset) {
            continue;
        }

        image.srcset.split(',').forEach((candidate) => {
            const src = candidate.trim().split(/\s+/)[0];
            if (src) {
                records.push({ attribute: 'srcset', value: src });
            }
        });
    }

    return records;
}

function isSkippableReference(reference = '') {
    const value = String(reference || '').trim();
    return (
        !value ||
        value === '#' ||
        value.startsWith('#') ||
        /^(?:https?:|mailto:|tel:|sms:|javascript:|data:|blob:|whatsapp:)/i.test(value)
    );
}

function normalizeReference(reference = '') {
    return String(reference || '').trim().split('#')[0].split('?')[0];
}

function resolveLocalReference({ siteRoot, fromFile, reference, publicOrigin = DEFAULT_PUBLIC_ORIGIN }) {
    const cleanReference = normalizeReference(reference);

    if (isSkippableReference(cleanReference)) {
        return null;
    }

    if (cleanReference === '/') {
        return siteFileForPath(siteRoot, '/');
    }

    if (cleanReference.startsWith('/')) {
        return siteFileForPath(siteRoot, cleanReference);
    }

    const html = fs.readFileSync(fromFile, 'utf8');
    const baseHref = extractTagValue(html, /<base[^>]+href=["']([^"']+)["'][^>]*>/i);
    const basePath = baseHref.startsWith('/') ? baseHref : publicPathForFile(siteRoot, fromFile);
    const resolvedPath = new URL(cleanReference, `${publicOrigin}${basePath}`).pathname;
    return siteFileForPath(siteRoot, resolvedPath);
}

function isSelfHostedPublicUrl(value = '', publicOrigin = DEFAULT_PUBLIC_ORIGIN) {
    return String(value || '').startsWith(`${publicOrigin}/`);
}

function publicUrlToSiteFile(siteRoot, value = '', publicOrigin = DEFAULT_PUBLIC_ORIGIN) {
    if (!isSelfHostedPublicUrl(value, publicOrigin)) {
        return null;
    }

    try {
        return siteFileForPath(siteRoot, new URL(value).pathname);
    } catch (error) {
        return null;
    }
}

function listHtmlFiles(rootPath) {
    const results = [];

    function walk(currentPath) {
        if (!fs.existsSync(currentPath)) {
            return;
        }

        for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
            const nextPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                walk(nextPath);
                continue;
            }

            if (entry.name.endsWith('.html')) {
                results.push(nextPath);
            }
        }
    }

    walk(rootPath);
    return results;
}

function collectIncomingLinks({ siteRoot, sitemapPaths, publicOrigin = DEFAULT_PUBLIC_ORIGIN }) {
    const incoming = new Map(sitemapPaths.map((pathname) => [pathname, new Set()]));

    listHtmlFiles(siteRoot).forEach((filePath) => {
        const html = fs.readFileSync(filePath, 'utf8');
        const sourcePath = publicPathForFile(siteRoot, filePath);

        extractReferenceRecords(html).forEach((reference) => {
            const resolved = resolveLocalReference({
                siteRoot,
                fromFile: filePath,
                reference: reference.value,
                publicOrigin
            });

            if (!resolved || !fs.existsSync(resolved)) {
                return;
            }

            const targetPath = publicPathForFile(siteRoot, resolved);
            if (incoming.has(targetPath) && targetPath !== sourcePath) {
                incoming.get(targetPath).add(sourcePath);
            }
        });
    });

    return incoming;
}

function extractJsonLdBlocks(html = '') {
    return [...String(html || '').matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
        .map((match) => match[1].trim())
        .filter(Boolean);
}

function flattenSchemaNodes(value, nodes = []) {
    if (!value || typeof value !== 'object') {
        return nodes;
    }

    if (Array.isArray(value)) {
        value.forEach((entry) => flattenSchemaNodes(entry, nodes));
        return nodes;
    }

    nodes.push(value);

    if (Array.isArray(value['@graph'])) {
        value['@graph'].forEach((entry) => flattenSchemaNodes(entry, nodes));
    }

    Object.values(value).forEach((entry) => {
        if (entry && typeof entry === 'object') {
            flattenSchemaNodes(entry, nodes);
        }
    });

    return nodes;
}

function parseJsonLdBlocks(blocks = []) {
    const parsed = [];
    const errors = [];

    blocks.forEach((block, index) => {
        try {
            parsed.push(JSON.parse(block));
        } catch (error) {
            errors.push({
                index,
                message: error.message
            });
        }
    });

    const nodes = parsed.flatMap((entry) => flattenSchemaNodes(entry, []));
    const schemaTypes = [...new Set(nodes.flatMap((node) => {
        const type = node['@type'];
        if (Array.isArray(type)) {
            return type;
        }
        return type ? [type] : [];
    }))];

    return {
        errors,
        parsed,
        nodes,
        schemaTypes
    };
}

function detectFamily(pathname = '/') {
    const route = normalizeRoute(pathname);

    if (route === '/') return 'home';
    if (route === '/fleet.html') return 'fleet';
    if (route === '/locations.html') return 'locations-hub';
    if (route === '/services.html') return 'services-hub';
    if (route === '/contact.html') return 'contact';
    if (route === '/about.html') return 'about';
    if (route === '/app/reserve/page.html') return 'reserve';
    if (ROUTE_FAMILIES.locationGuide.has(route)) return 'location-guide';
    if (ROUTE_FAMILIES.serviceDetail.has(route)) return 'service-detail';
    if (ROUTE_FAMILIES.productCommercial.has(route)) return 'product-commercial';
    if (ROUTE_FAMILIES.seoLanding.has(route)) return 'seo-landing';
    if (/terms-and-conditions/i.test(route)) return 'legal';
    return 'public-page';
}

function expectedSchemaTypes(pathname = '/') {
    const route = normalizeRoute(pathname);

    if (route === '/contact.html') {
        return ['ContactPage'];
    }

    if (route === '/locations.html') {
        return ['BreadcrumbList', 'FAQPage'];
    }

    if (ROUTE_FAMILIES.locationGuide.has(route)) {
        return ['BreadcrumbList', 'FAQPage', 'Service'];
    }

    if (route === '/services.html') {
        return ['BreadcrumbList'];
    }

    if (ROUTE_FAMILIES.serviceDetail.has(route)) {
        return ['BreadcrumbList', 'Service'];
    }

    if (ROUTE_FAMILIES.productCommercial.has(route)) {
        return ['Product', 'Service'];
    }

    if (ROUTE_FAMILIES.seoLanding.has(route)) {
        return ['Service'];
    }

    return [];
}

function routeIntentTokens(pathname = '') {
    return normalizeRoute(pathname)
        .replace(/\.html$/i, '')
        .replace(/[^a-z0-9]+/gi, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !STOP_INTENT_TOKENS.has(token));
}

function createSeoFinding({
    route = '',
    severity = 'low',
    category = 'technical',
    message = '',
    evidence = '',
    recommendation = '',
    hardFail = false
}) {
    return {
        route: normalizeRoute(route),
        severity,
        category,
        message,
        evidence,
        recommendation,
        hardFail: Boolean(hardFail)
    };
}

function severityPenalty(severity = 'low') {
    if (severity === 'critical') return 24;
    if (severity === 'high') return 14;
    if (severity === 'medium') return 5;
    return 2;
}

function categoryScore(findings = [], category = '') {
    const penalty = findings
        .filter((finding) => finding.category === category)
        .reduce((sum, finding) => sum + severityPenalty(finding.severity), 0);
    return Math.max(0, 100 - penalty);
}

function addFinding(findings, finding) {
    findings.push(createSeoFinding(finding));
}

function evaluateMetadata({ route, html, title, description, canonical, expectedCanonical, titleCounts, descriptionCounts, findings }) {
    const robots = extractMetaContent(html, 'name', 'robots');
    const htmlLang = extractTagValue(html, /<html[^>]+lang=["']([^"']+)["']/i);
    const viewport = extractMetaContent(html, 'name', 'viewport');
    const charset = extractTags(html, 'meta').some((tag) => getAttribute(tag, 'charset') || /charset\s*=/i.test(tag));

    if (canonical !== expectedCanonical) {
        addFinding(findings, {
            route,
            severity: 'critical',
            category: 'indexability',
            message: 'Canonical URL does not match the expected public URL.',
            evidence: canonical || '[missing]',
            recommendation: `Use ${expectedCanonical}.`,
            hardFail: true
        });
    }

    if (/noindex/i.test(robots)) {
        addFinding(findings, {
            route,
            severity: 'critical',
            category: 'indexability',
            message: 'Page is marked noindex but is present in the public sitemap.',
            evidence: robots,
            recommendation: 'Remove noindex or remove the URL from the sitemap.',
            hardFail: true
        });
    }

    if (!title || title.length <= 10) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'metadata',
            message: 'Missing or too-short title tag.',
            evidence: title || '[missing]',
            recommendation: 'Write a unique descriptive title for the search result.',
            hardFail: true
        });
    } else if (title.length < 30 || title.length > 68) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'metadata',
            message: 'Title length is outside the preferred search snippet range.',
            evidence: `${title.length} chars: ${title}`,
            recommendation: 'Aim for roughly 30-68 characters without stuffing keywords.'
        });
    }

    if (!description || description.length <= 20) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'metadata',
            message: 'Missing or too-short meta description.',
            evidence: description || '[missing]',
            recommendation: 'Write a clear conversion-focused description.',
            hardFail: true
        });
    } else if (description.length < 70 || description.length > 170) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'metadata',
            message: 'Meta description length is outside the preferred snippet range.',
            evidence: `${description.length} chars: ${description}`,
            recommendation: 'Aim for roughly 70-170 characters and make the booking value clear.'
        });
    }

    if (titleCounts.get(title) > 1) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'metadata',
            message: 'Duplicate title across public sitemap URLs.',
            evidence: title,
            recommendation: 'Make the title unique for this intent.',
            hardFail: true
        });
    }

    if (descriptionCounts.get(description) > 1) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'metadata',
            message: 'Duplicate meta description across public sitemap URLs.',
            evidence: description,
            recommendation: 'Make the description unique for this page intent.',
            hardFail: true
        });
    }

    if (!htmlLang) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'technical',
            message: 'Missing html lang attribute.',
            recommendation: 'Set lang="en" or a more specific English locale.',
            hardFail: true
        });
    } else if (!/^en(?:-|$)/i.test(htmlLang)) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'technical',
            message: 'HTML language is not English-coded for an English premium site.',
            evidence: htmlLang,
            recommendation: 'Use an English lang value unless this page is localized.'
        });
    }

    if (!viewport) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'technical',
            message: 'Missing viewport meta tag.',
            recommendation: 'Add a responsive viewport meta tag.',
            hardFail: true
        });
    }

    if (!charset) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'technical',
            message: 'Missing explicit charset declaration.',
            recommendation: 'Add <meta charset="UTF-8"> near the top of <head>.'
        });
    }
}

function evaluateSocial({ route, html, expectedCanonical, siteRoot, publicOrigin, findings }) {
    const ogUrl = extractMetaContent(html, 'property', 'og:url');
    const ogTitle = extractMetaContent(html, 'property', 'og:title');
    const ogDescription = extractMetaContent(html, 'property', 'og:description');
    const ogImage = extractMetaContent(html, 'property', 'og:image');
    const ogType = extractMetaContent(html, 'property', 'og:type');
    const twitterCard = extractMetaContent(html, 'name', 'twitter:card');
    const twitterTitle = extractMetaContent(html, 'name', 'twitter:title');
    const twitterDescription = extractMetaContent(html, 'name', 'twitter:description');
    const twitterImage = extractMetaContent(html, 'name', 'twitter:image');

    if (!ogTitle || !ogDescription || !ogImage || !ogUrl || !ogType) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'social',
            message: 'Open Graph metadata is incomplete.',
            evidence: `title=${Boolean(ogTitle)} description=${Boolean(ogDescription)} image=${Boolean(ogImage)} url=${Boolean(ogUrl)} type=${Boolean(ogType)}`,
            recommendation: 'Expose og:type, og:url, og:title, og:description and og:image.',
            hardFail: true
        });
    }

    if (!twitterCard || !twitterTitle || !twitterDescription || !twitterImage) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'social',
            message: 'Twitter/X card metadata is incomplete.',
            evidence: `card=${Boolean(twitterCard)} title=${Boolean(twitterTitle)} description=${Boolean(twitterDescription)} image=${Boolean(twitterImage)}`,
            recommendation: 'Expose twitter:card, twitter:title, twitter:description and twitter:image.',
            hardFail: true
        });
    }

    if (ogUrl && ogUrl !== expectedCanonical) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'social',
            message: 'og:url does not match canonical.',
            evidence: ogUrl,
            recommendation: `Use ${expectedCanonical}.`,
            hardFail: true
        });
    }

    if (twitterCard && twitterCard !== 'summary_large_image') {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'social',
            message: 'Twitter card is not summary_large_image.',
            evidence: twitterCard,
            recommendation: 'Use summary_large_image for premium vehicle/social previews.'
        });
    }

    [ogImage, twitterImage].filter(Boolean).forEach((imageUrl) => {
        if (!isSelfHostedPublicUrl(imageUrl, publicOrigin)) {
            addFinding(findings, {
                route,
                severity: 'high',
                category: 'social',
                message: 'Social preview image is not self-hosted on the public origin.',
                evidence: imageUrl,
                recommendation: `Use an absolute ${publicOrigin}/... image URL.`,
                hardFail: true
            });
            return;
        }

        const imageFile = publicUrlToSiteFile(siteRoot, imageUrl, publicOrigin);
        if (!imageFile || !fs.existsSync(imageFile)) {
            addFinding(findings, {
                route,
                severity: 'high',
                category: 'social',
                message: 'Social preview image points to a missing local asset.',
                evidence: imageUrl,
                recommendation: 'Point OG/Twitter image to an existing image asset.',
                hardFail: true
            });
        }
    });
}

function evaluateSchema({ route, html, expectedCanonical, findings }) {
    const jsonLdBlocks = extractJsonLdBlocks(html);
    const jsonLdText = jsonLdBlocks.join('\n');
    const parsedJsonLd = parseJsonLdBlocks(jsonLdBlocks);
    const expectedSchemas = expectedSchemaTypes(route);

    parsedJsonLd.errors.forEach((error) => {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'schema',
            message: 'Invalid JSON-LD block.',
            evidence: `block ${error.index}: ${error.message}`,
            recommendation: 'Validate the JSON-LD syntax before publishing.',
            hardFail: true
        });
    });

    expectedSchemas.forEach((schemaType) => {
        if (!parsedJsonLd.schemaTypes.includes(schemaType)) {
            addFinding(findings, {
                route,
                severity: 'high',
                category: 'schema',
                message: `Missing expected schema type: ${schemaType}.`,
                evidence: parsedJsonLd.schemaTypes.join(', ') || '[none]',
                recommendation: `Add valid ${schemaType} JSON-LD for this page family.`,
                hardFail: true
            });
        }
    });

    if (expectedSchemas.length > 0 && jsonLdBlocks.length > 0 && !jsonLdText.includes(expectedCanonical)) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'schema',
            message: 'JSON-LD does not reference the canonical URL.',
            evidence: expectedCanonical,
            recommendation: 'Keep schema url/mainEntityOfPage aligned with the canonical.',
            hardFail: true
        });
    }

    if (jsonLdText && HTML_MARKUP_PATTERN.test(jsonLdText)) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'schema',
            message: 'JSON-LD contains HTML markup.',
            recommendation: 'Schema values should be plain text, not HTML.',
            hardFail: true
        });
    }

    return parsedJsonLd;
}

function evaluateContent({ route, family, html, title, description, findings }) {
    const bodyHtml = extractTagValue(html, /<body[^>]*>([\s\S]*?)<\/body>/i) || html;
    const visibleText = stripHtmlForText(bodyHtml);
    const wordCount = visibleText.split(/\s+/).filter(Boolean).length;
    const h1Count = countMatches(html, /<h1\b/gi);
    const h1Text = normalizeText((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
    const expectedMinWords = FAMILY_MIN_WORDS[family] || FAMILY_MIN_WORDS['public-page'];
    const intentTokens = routeIntentTokens(route);
    const titleH1Text = `${title} ${h1Text}`.toLowerCase();
    const bodyText = visibleText.toLowerCase();
    const missingIntentTokens = intentTokens.filter((token) => !titleH1Text.includes(token));
    const bodyMissingIntentTokens = intentTokens.filter((token) => !bodyText.includes(token));

    if (route === '/app/reserve/page.html') {
        if (h1Count > 1) {
            addFinding(findings, {
                route,
                severity: 'high',
                category: 'content',
                message: 'Reserve page has more than one H1.',
                evidence: String(h1Count),
                recommendation: 'Keep a single primary heading hierarchy.',
                hardFail: true
            });
        }
    } else if (h1Count !== 1) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'content',
            message: 'Page should expose exactly one H1.',
            evidence: String(h1Count),
            recommendation: 'Use one clear H1 that matches the page intent.',
            hardFail: true
        });
    }

    if (h1Count > 0 && !h1Text) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'content',
            message: 'H1 is empty after text normalization.',
            recommendation: 'Make the H1 visible and descriptive.',
            hardFail: true
        });
    }

    if (wordCount < expectedMinWords) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'content',
            message: 'Visible content may be thin for this page family.',
            evidence: `${wordCount} words, expected about ${expectedMinWords}+`,
            recommendation: 'Add useful trust, delivery, booking and location context without filler.'
        });
    }

    if (missingIntentTokens.length > 0) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'content',
            message: 'Primary route intent is weak in title/H1.',
            evidence: missingIntentTokens.join(', '),
            recommendation: 'Make the title or H1 clearly match the route intent.'
        });
    }

    if (bodyMissingIntentTokens.length > 0) {
        addFinding(findings, {
            route,
            severity: 'low',
            category: 'content',
            message: 'Some route intent terms are missing from visible body copy.',
            evidence: bodyMissingIntentTokens.join(', '),
            recommendation: 'Mention the exact service, vehicle or location naturally in the page copy.'
        });
    }

    if (!/dubai/i.test(`${title} ${description} ${visibleText}`) && !['legal', 'reserve'].includes(family)) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'local',
            message: 'Dubai/local intent is not visible enough on a commercial public page.',
            recommendation: 'Keep Dubai or UAE context clear in metadata and visible copy.'
        });
    }

    if (BROKEN_ENCODING_PATTERN.test(html)) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'content',
            message: 'Broken encoding markers detected.',
            recommendation: 'Replace mojibake with clean UTF-8 copy.',
            hardFail: true
        });
    }

    if (PLACEHOLDER_PATTERN.test(visibleText)) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'content',
            message: 'Placeholder copy detected in visible content.',
            recommendation: 'Replace placeholders with premium, specific copy.'
        });
    }

    return {
        h1Count,
        h1Text,
        wordCount,
        visibleText
    };
}

function evaluateLinks({ route, family, html, filePath, siteRoot, sitemapPaths, incomingLinks, publicOrigin, findings }) {
    const anchors = extractAnchorRecords(html);
    const incomingCount = incomingLinks.get(route)?.size || 0;
    const outgoingInternalRoutes = new Set();
    const brokenReferences = [];
    const sitemapSet = new Set(sitemapPaths);

    extractReferenceRecords(html).forEach((reference) => {
        const resolved = resolveLocalReference({
            siteRoot,
            fromFile: filePath,
            reference: reference.value,
            publicOrigin
        });

        if (!resolved) {
            return;
        }

        if (!fs.existsSync(resolved)) {
            brokenReferences.push(`${reference.attribute}=${reference.value}`);
            return;
        }

        if (reference.attribute === 'href') {
            const targetRoute = publicPathForFile(siteRoot, resolved);
            if (sitemapSet.has(targetRoute) && targetRoute !== route) {
                outgoingInternalRoutes.add(targetRoute);
            }
        }
    });

    if (!incomingCount && route !== '/') {
        const isCriticalOrphan = ['fleet', 'locations-hub', 'services-hub', 'location-guide', 'service-detail', 'product-commercial', 'seo-landing'].includes(family);
        addFinding(findings, {
            route,
            severity: isCriticalOrphan ? 'high' : 'medium',
            category: 'links',
            message: isCriticalOrphan
                ? 'Commercial/indexable page has no incoming internal links from the public HTML surface.'
                : 'Indexable support page has no incoming internal links from the public HTML surface.',
            recommendation: isCriticalOrphan
                ? 'Link to this page from a relevant hub, fleet card, service page or footer.'
                : 'If this page should rank, link to it from support/navigation; if it should stay quiet, consider noindex.',
            hardFail: isCriticalOrphan
        });
    }

    if (outgoingInternalRoutes.size < 2 && !['/app/reserve/page.html'].includes(route)) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'links',
            message: 'Page has a weak outgoing internal-link graph.',
            evidence: `${outgoingInternalRoutes.size} unique sitemap destinations`,
            recommendation: 'Add contextual links to fleet, reserve, relevant services and location guides.'
        });
    }

    if (brokenReferences.length > 0) {
        addFinding(findings, {
            route,
            severity: 'high',
            category: 'links',
            message: 'Broken local href/src/action/poster references detected.',
            evidence: brokenReferences.slice(0, 6).join('; '),
            recommendation: 'Fix or remove missing local references.',
            hardFail: true
        });
    }

    const genericLabels = anchors.filter((anchor) => (
        anchor.href &&
        !isSkippableReference(anchor.href) &&
        GENERIC_CTA_PATTERN.test(anchor.text)
    ));
    if (genericLabels.length > 0) {
        addFinding(findings, {
            route,
            severity: 'low',
            category: 'links',
            message: 'Generic internal link labels reduce contextual SEO and usability.',
            evidence: genericLabels.slice(0, 5).map((anchor) => `${anchor.text} -> ${anchor.href}`).join('; '),
            recommendation: 'Use labels that describe the destination, vehicle, location or action.'
        });
    }

    const unsafeBlankTargets = anchors.filter((anchor) => (
        anchor.target === '_blank' &&
        !/\bnoopener\b/i.test(anchor.rel)
    ));
    if (unsafeBlankTargets.length > 0) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'technical',
            message: 'target="_blank" links should use rel="noopener".',
            evidence: unsafeBlankTargets.slice(0, 5).map((anchor) => anchor.href).join('; '),
            recommendation: 'Add rel="noopener" to external new-tab links.'
        });
    }

    return {
        incomingCount,
        outgoingInternalCount: outgoingInternalRoutes.size,
        brokenReferenceCount: brokenReferences.length
    };
}

function evaluateMedia({ route, html, findings }) {
    const images = extractImageRecords(html);
    const contentImages = images.filter((image) => {
        const src = image.src || image.srcset;
        return src && !/^data:/i.test(src) && !/logo|icon|crest|brand/i.test(src);
    });
    const missingAlt = contentImages.filter((image) => !image.alt);
    const missingDimensions = contentImages.filter((image) => !image.width || !image.height);
    const eagerImageCount = contentImages.filter((image) => !/^lazy$/i.test(image.loading)).length;

    if (missingAlt.length > 0) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'media',
            message: 'Content images are missing alt text.',
            evidence: missingAlt.slice(0, 5).map((image) => image.src || image.srcset).join('; '),
            recommendation: 'Add concise descriptive alt text for vehicle, service and location imagery.'
        });
    }

    if (missingDimensions.length > 0) {
        addFinding(findings, {
            route,
            severity: 'low',
            category: 'media',
            message: 'Content images are missing explicit width/height attributes.',
            evidence: `${missingDimensions.length} image(s)`,
            recommendation: 'Add dimensions or CSS aspect-ratio to reduce layout shift risk.'
        });
    }

    if (eagerImageCount > 4) {
        addFinding(findings, {
            route,
            severity: 'low',
            category: 'media',
            message: 'Many content images may load eagerly.',
            evidence: `${eagerImageCount} non-lazy content image(s)`,
            recommendation: 'Keep above-the-fold imagery eager, lazy-load secondary galleries.'
        });
    }

    return {
        imageCount: images.length,
        contentImageCount: contentImages.length,
        missingAltCount: missingAlt.length
    };
}

function evaluateConversionSeo({ route, family, html, findings }) {
    if (['legal', 'reserve'].includes(family)) {
        return;
    }

    const hasReserveLink = /href=["'][^"']*\/app\/reserve\/page\.html/i.test(html);
    const hasWhatsapp = /(?:wa\.me|api\.whatsapp\.com|WhatsApp)/i.test(html);
    const hasPhone = /href=["']tel:/i.test(html);

    if (!hasReserveLink && ['product-commercial', 'service-detail', 'location-guide', 'seo-landing', 'fleet'].includes(family)) {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'local',
            message: 'Commercial page does not expose a reservation path.',
            recommendation: 'Include a clear Reserve CTA to convert organic traffic.'
        });
    }

    if (!hasWhatsapp && ['product-commercial', 'service-detail', 'location-guide', 'contact'].includes(family)) {
        addFinding(findings, {
            route,
            severity: 'low',
            category: 'local',
            message: 'Commercial page does not expose WhatsApp contact language/link.',
            recommendation: 'Keep WhatsApp as a visible trust/contact option for Dubai rental intent.'
        });
    }

    if (!hasPhone && family === 'contact') {
        addFinding(findings, {
            route,
            severity: 'medium',
            category: 'local',
            message: 'Contact page does not expose a tel: link.',
            recommendation: 'Expose a callable phone link for local trust and mobile conversion.'
        });
    }
}

function assessPage({
    route,
    filePath,
    html,
    sitemapPaths,
    titleCounts,
    descriptionCounts,
    incomingLinks,
    publicOrigin = DEFAULT_PUBLIC_ORIGIN,
    siteRoot,
    httpResult
}) {
    const pathname = normalizeRoute(route);
    const family = detectFamily(pathname);
    const expectedCanonical = pathname === '/' ? `${publicOrigin}/` : `${publicOrigin}${pathname}`;
    const title = normalizeText(extractTagValue(html, /<title>([^<]+)<\/title>/i));
    const description = extractMetaContent(html, 'name', 'description');
    const canonical = extractLinkHref(html, 'canonical');
    const findings = [];

    if (httpResult && httpResult.statusCode !== 200) {
        addFinding(findings, {
            route: pathname,
            severity: 'critical',
            category: 'indexability',
            message: 'Public route does not return HTTP 200.',
            evidence: String(httpResult.statusCode),
            recommendation: 'Fix routing/static serving before publishing.',
            hardFail: true
        });
    }

    evaluateMetadata({
        route: pathname,
        html,
        title,
        description,
        canonical,
        expectedCanonical,
        titleCounts,
        descriptionCounts,
        findings
    });
    evaluateSocial({
        route: pathname,
        html,
        expectedCanonical,
        siteRoot,
        publicOrigin,
        findings
    });
    const parsedJsonLd = evaluateSchema({
        route: pathname,
        html,
        expectedCanonical,
        findings
    });
    const content = evaluateContent({
        route: pathname,
        family,
        html,
        title,
        description,
        findings
    });
    const links = evaluateLinks({
        route: pathname,
        family,
        html,
        filePath,
        siteRoot,
        sitemapPaths,
        incomingLinks,
        publicOrigin,
        findings
    });
    const media = evaluateMedia({
        route: pathname,
        html,
        findings
    });
    evaluateConversionSeo({
        route: pathname,
        family,
        html,
        findings
    });

    if (/localhost|127\.0\.0\.1|vercel\.app|railway\.app|staging/i.test(`${canonical}\n${extractMetaContent(html, 'property', 'og:url')}\n${JSON.stringify(parsedJsonLd.parsed)}`)) {
        addFinding(findings, {
            route: pathname,
            severity: 'high',
            category: 'indexability',
            message: 'Production SEO surfaces leak a non-production environment.',
            recommendation: 'Keep canonical, social and schema URLs on the public production domain.',
            hardFail: true
        });
    }

    const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + severityPenalty(finding.severity), 0));
    const categories = ['indexability', 'metadata', 'social', 'schema', 'content', 'links', 'media', 'local', 'technical'];

    return {
        route: pathname,
        family,
        file: path.relative(siteRoot, filePath).replace(/\\/g, '/'),
        score,
        passedGate: !findings.some((finding) => finding.hardFail),
        title,
        description,
        canonical,
        expectedCanonical,
        httpStatus: httpResult?.statusCode || null,
        metrics: {
            wordCount: content.wordCount,
            h1Count: content.h1Count,
            incomingLinks: links.incomingCount,
            outgoingInternalLinks: links.outgoingInternalCount,
            images: media.imageCount,
            missingAltImages: media.missingAltCount,
            schemaTypes: parsedJsonLd.schemaTypes
        },
        categoryScores: Object.fromEntries(categories.map((category) => [category, categoryScore(findings, category)])),
        findings
    };
}

function countBy(values = [], keyFn) {
    return values.reduce((counts, value) => {
        const key = keyFn(value);
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
    }, new Map());
}

function summarizeFindings(findings = []) {
    const bySeverity = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    };
    const byCategory = {};

    findings.forEach((finding) => {
        bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
        byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
    });

    return {
        bySeverity,
        byCategory,
        hardFails: findings.filter((finding) => finding.hardFail).length
    };
}

function buildDiscoveryFindings({ siteRoot, publicOrigin = DEFAULT_PUBLIC_ORIGIN }) {
    const findings = [];
    const robotsPath = path.join(siteRoot, 'robots.txt');
    const sitemapPath = path.join(siteRoot, 'sitemap.xml');

    if (!fs.existsSync(robotsPath)) {
        addFinding(findings, {
            route: '/',
            severity: 'critical',
            category: 'discovery',
            message: 'robots.txt is missing.',
            recommendation: 'Publish robots.txt with the canonical sitemap.',
            hardFail: true
        });
    }

    if (!fs.existsSync(sitemapPath)) {
        addFinding(findings, {
            route: '/',
            severity: 'critical',
            category: 'discovery',
            message: 'sitemap.xml is missing.',
            recommendation: 'Publish sitemap.xml with all indexable public URLs.',
            hardFail: true
        });
    }

    if (fs.existsSync(robotsPath)) {
        const robotsText = fs.readFileSync(robotsPath, 'utf8');
        if (!robotsText.includes(`Sitemap: ${publicOrigin}/sitemap.xml`)) {
            addFinding(findings, {
                route: '/',
                severity: 'critical',
                category: 'discovery',
                message: 'robots.txt does not point to the canonical public sitemap.',
                evidence: `Expected Sitemap: ${publicOrigin}/sitemap.xml`,
                recommendation: 'Keep robots.txt aligned with the public domain.',
                hardFail: true
            });
        }

        if (/Disallow:\s*\/\s*$/im.test(robotsText)) {
            addFinding(findings, {
                route: '/',
                severity: 'critical',
                category: 'discovery',
                message: 'robots.txt appears to disallow the whole site.',
                recommendation: 'Remove broad Disallow rules for production.',
                hardFail: true
            });
        }
    }

    return findings;
}

async function buildSeoAuditReport({
    projectRoot,
    siteRoot,
    publicOrigin = DEFAULT_PUBLIC_ORIGIN,
    routes = [],
    fetchRoute
}) {
    const sitemapPath = path.join(siteRoot, 'sitemap.xml');
    const discoveryFindings = buildDiscoveryFindings({ siteRoot, publicOrigin });
    const sitemapXml = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
    const rawSitemapPaths = sitemapXml ? parseSitemapPaths(sitemapXml).map(normalizeRoute) : [];
    const uniqueSitemapPaths = [...new Set(rawSitemapPaths)];
    const selectedRoutes = routes.length > 0 ? [...new Set(routes.map(normalizeRoute))] : uniqueSitemapPaths;
    const allPublicHtmlPaths = listHtmlFiles(siteRoot).map((filePath) => publicPathForFile(siteRoot, filePath));
    const publicHtmlOutsideSitemap = allPublicHtmlPaths.filter((pathname) => !uniqueSitemapPaths.includes(pathname));

    if (rawSitemapPaths.length !== uniqueSitemapPaths.length) {
        addFinding(discoveryFindings, {
            route: '/',
            severity: 'critical',
            category: 'discovery',
            message: 'sitemap.xml repeats one or more URLs.',
            recommendation: 'Remove duplicate sitemap loc entries.',
            hardFail: true
        });
    }

    if (uniqueSitemapPaths.length < 30) {
        addFinding(discoveryFindings, {
            route: '/',
            severity: 'high',
            category: 'discovery',
            message: 'sitemap.xml looks smaller than the expected public production surface.',
            evidence: `${uniqueSitemapPaths.length} URL(s)`,
            recommendation: 'Confirm all public fleet, service, location and legal URLs are listed.',
            hardFail: true
        });
    }

    uniqueSitemapPaths.forEach((pathname) => {
        if (/preview|hero-lab|font-preview|template-base|template-premium/i.test(pathname)) {
            addFinding(discoveryFindings, {
                route: pathname,
                severity: 'critical',
                category: 'discovery',
                message: 'Preview/lab URL appears in the public sitemap.',
                recommendation: 'Remove non-production experiments from sitemap.xml.',
                hardFail: true
            });
        }

        const expectedPrefix = `${publicOrigin}/`;
        const matchingLoc = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
            .find((match) => normalizeRoute(match[1]) === pathname)?.[1] || '';
        if (matchingLoc && !matchingLoc.startsWith(expectedPrefix)) {
            addFinding(discoveryFindings, {
                route: pathname,
                severity: 'critical',
                category: 'discovery',
                message: 'Sitemap loc is not on the canonical public origin.',
                evidence: matchingLoc,
                recommendation: `Use ${publicOrigin}.`,
                hardFail: true
            });
        }
    });

    publicHtmlOutsideSitemap.forEach((pathname) => {
        addFinding(discoveryFindings, {
            route: pathname,
            severity: 'high',
            category: 'discovery',
            message: 'Public HTML file is outside sitemap.xml.',
            recommendation: 'Add it to sitemap.xml or move it out of the public surface.',
            hardFail: true
        });
    });

    const pageInputs = selectedRoutes.map((pathname) => {
        const filePath = siteFileForPath(siteRoot, pathname);
        return {
            route: pathname,
            filePath,
            exists: fs.existsSync(filePath),
            html: fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
        };
    });

    pageInputs
        .filter((page) => !page.exists)
        .forEach((page) => {
            addFinding(discoveryFindings, {
                route: page.route,
                severity: 'critical',
                category: 'discovery',
                message: 'Sitemap URL does not resolve to a local public HTML file.',
                evidence: path.relative(projectRoot, page.filePath).replace(/\\/g, '/'),
                recommendation: 'Create the page file or remove the URL from sitemap.xml.',
                hardFail: true
            });
        });

    const availablePages = pageInputs.filter((page) => page.exists);
    const titleCounts = countBy(availablePages, (page) => normalizeText(extractTagValue(page.html, /<title>([^<]+)<\/title>/i)));
    const descriptionCounts = countBy(availablePages, (page) => extractMetaContent(page.html, 'name', 'description'));
    const incomingLinks = collectIncomingLinks({
        siteRoot,
        sitemapPaths: uniqueSitemapPaths,
        publicOrigin
    });
    const httpResults = new Map();

    if (fetchRoute) {
        for (const page of availablePages) {
            httpResults.set(page.route, await fetchRoute(page.route));
        }
    }

    const pages = availablePages.map((page) => assessPage({
        route: page.route,
        filePath: page.filePath,
        html: page.html,
        sitemapPaths: uniqueSitemapPaths,
        titleCounts,
        descriptionCounts,
        incomingLinks,
        publicOrigin,
        siteRoot,
        httpResult: httpResults.get(page.route)
    }));
    const allFindings = [
        ...discoveryFindings,
        ...pages.flatMap((page) => page.findings)
    ];
    const averageScore = pages.length
        ? Math.round(pages.reduce((sum, page) => sum + page.score, 0) / pages.length)
        : 0;
    const summaryFindings = summarizeFindings(allFindings);

    return {
        generatedAt: new Date().toISOString(),
        publicOrigin,
        totals: {
            sitemapUrls: uniqueSitemapPaths.length,
            auditedPages: pages.length,
            publicHtmlOutsideSitemap: publicHtmlOutsideSitemap.length,
            averageScore,
            passedGate: summaryFindings.hardFails === 0
        },
        findings: summaryFindings,
        discoveryFindings,
        pages,
        allFindings
    };
}

module.exports = {
    DEFAULT_PUBLIC_ORIGIN,
    assessPage,
    buildSeoAuditReport,
    createSeoFinding,
    detectFamily,
    expectedSchemaTypes,
    extractAnchorRecords,
    extractImageRecords,
    extractJsonLdBlocks,
    extractMetaContent,
    extractReferenceRecords,
    normalizeRoute,
    normalizeText,
    parseJsonLdBlocks,
    routeIntentTokens,
    summarizeFindings
};
