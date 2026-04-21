const fs = require('fs');
const path = require('path');
const {
    countMatches,
    extractTagValue,
    fetchUrl,
    parseSitemapPaths,
    publicPathForFile,
    siteFileForPath,
    startStaticServer: launchStaticServer,
    stopProcess
} = require('./site-audit-utils');

const projectRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(projectRoot, 'site');
const reportPath = path.join(projectRoot, 'docs/audit/MATRIZ-SEO-FINAL-2026-04-18.md');
const seoPort = Number(process.env.SEO_STATIC_PORT || (8600 + Math.floor(Math.random() * 200)));
const seoBaseUrl = `http://127.0.0.1:${seoPort}`;
const publicOrigin = 'https://prestigegoalmotion.com';

const locationGuidePaths = new Set([
    '/luxury-car-rental-dubai.html',
    '/abu-dhabi-luxury-car-rental.html',
    '/dubai-airport-luxury-car-rental.html',
    '/palm-jumeirah-luxury-car-rental.html',
    '/dubai-marina-luxury-car-rental.html'
]);

const serviceDetailPaths = new Set([
    '/chauffeur-service-dubai.html',
    '/airport-concierge-dubai.html',
    '/hotel-villa-airport-delivery-dubai.html',
    '/wedding-event-car-rental-dubai.html',
    '/business-car-rental-dubai.html',
    '/monthly-luxury-car-rental-dubai.html'
]);

const productCommercialPaths = new Set([
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
]);

const seoLandingPaths = new Set([
    '/supercar-rental-dubai.html'
]);

const brokenEncodingPattern = /(?:Â|Ã.|â€”|â€“|â€|�)/;
const htmlMarkupPattern = /<[^>]+>/;

function report(ok, message) {
    const prefix = ok ? '[PASS]' : '[FAIL]';
    console.log(`${prefix} ${message}`);
}

function assert(condition, message) {
    report(Boolean(condition), message);
    if (!condition) {
        throw new Error(message);
    }
}

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMetaContent(html, attributeName, attributeValue) {
    const escapedValue = escapeRegExp(attributeValue);
    const patterns = [
        new RegExp(`<meta[^>]+${attributeName}=["']${escapedValue}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attributeName}=["']${escapedValue}["'][^>]*>`, 'i')
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    return '';
}

function listHtmlFiles(rootPath) {
    const results = [];

    function walk(currentPath) {
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

function normalizeReference(reference) {
    return String(reference || '').trim().split('#')[0].split('?')[0];
}

function isSkippableReference(reference) {
    return (
        !reference ||
        reference === '#' ||
        reference.startsWith('http://') ||
        reference.startsWith('https://') ||
        reference.startsWith('mailto:') ||
        reference.startsWith('tel:') ||
        reference.startsWith('sms:') ||
        reference.startsWith('javascript:') ||
        reference.startsWith('data:') ||
        reference.startsWith('blob:')
    );
}

function resolveLocalReference(fromFile, reference) {
    const cleanReference = normalizeReference(reference);
    if (isSkippableReference(cleanReference)) {
        return null;
    }

    if (cleanReference === '/') {
        return path.join(siteRoot, 'index.html');
    }

    if (cleanReference.startsWith('/')) {
        return siteFileForPath(siteRoot, cleanReference);
    }

    const html = readFile(fromFile);
    const baseHref = extractTagValue(html, /<base[^>]+href=["']([^"']+)["'][^>]*>/i);
    const basePath = baseHref.startsWith('/') ? baseHref : publicPathForFile(siteRoot, fromFile);
    const resolvedPath = new URL(cleanReference, `https://prestigegoalmotion.com${basePath}`).pathname;
    return siteFileForPath(siteRoot, resolvedPath);
}

function collectIncomingLinks(sitemapPaths) {
    const incoming = new Map(sitemapPaths.map((pathname) => [pathname, new Set()]));
    const htmlFiles = listHtmlFiles(siteRoot);

    htmlFiles.forEach((filePath) => {
        const html = readFile(filePath);
        const sourceLabel = path.relative(siteRoot, filePath).replace(/\\/g, '/');

        for (const match of html.matchAll(/\b(?:href|src|action)=["']([^"']+)["']/gi)) {
            const resolved = resolveLocalReference(filePath, match[1]);
            if (!resolved || !fs.existsSync(resolved)) {
                continue;
            }

            const pathname = publicPathForFile(siteRoot, resolved);

            if (incoming.has(pathname)) {
                incoming.get(pathname).add(sourceLabel);
            }
        }
    });

    return incoming;
}

function extractJsonLdBlocks(html) {
    return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
        .map((match) => match[1].trim())
        .filter(Boolean);
}

function extractSchemaTypes(jsonLdBlocks) {
    return [...new Set(
        jsonLdBlocks
            .flatMap((block) => [...block.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((match) => match[1]))
    )];
}

function detectFamily(pathname) {
    if (pathname === '/') return 'home';
    if (pathname === '/fleet.html') return 'fleet';
    if (pathname === '/locations.html') return 'locations-hub';
    if (pathname === '/services.html') return 'services-hub';
    if (pathname === '/contact.html') return 'contact';
    if (pathname === '/about.html') return 'about';
    if (pathname === '/app/reserve/page.html') return 'reserve';
    if (locationGuidePaths.has(pathname)) return 'location-guide';
    if (serviceDetailPaths.has(pathname)) return 'service-detail';
    if (productCommercialPaths.has(pathname)) return 'product-commercial';
    if (seoLandingPaths.has(pathname)) return 'seo-landing';
    if (/terms-and-conditions/i.test(pathname)) return 'legal';
    return 'public-page';
}

function expectedSchemaTypes(pathname) {
    if (pathname === '/contact.html') {
        return ['ContactPage'];
    }

    if (pathname === '/locations.html') {
        return ['BreadcrumbList', 'FAQPage'];
    }

    if (locationGuidePaths.has(pathname)) {
        return ['BreadcrumbList', 'FAQPage', 'Service'];
    }

    if (pathname === '/services.html') {
        return ['BreadcrumbList'];
    }

    if (serviceDetailPaths.has(pathname)) {
        return ['BreadcrumbList', 'Service'];
    }

    if (productCommercialPaths.has(pathname)) {
        return ['Product', 'Service'];
    }

    if (seoLandingPaths.has(pathname)) {
        return ['Service'];
    }

    return [];
}

function yesNo(value) {
    return value ? 'OK' : 'FAIL';
}

function markdownEscape(value) {
    return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function isSelfHostedPublicUrl(value) {
    return String(value || '').startsWith(`${publicOrigin}/`);
}

function buildMatrixMarkdown(summary, rows) {
    const lines = [
        '# Matriz SEO Final 2026-04-18',
        '',
        '## Resumen',
        '',
        `- URLs auditadas: ${summary.totalUrls}`,
        `- URLs publicas fuera del sitemap: ${summary.publicHtmlOutsideSitemap}`,
        `- titulos duplicados: ${summary.duplicateTitles}`,
        `- meta descriptions duplicadas: ${summary.duplicateDescriptions}`,
        `- filas con incidencias: ${summary.failedRows}`,
        '',
        '## Matriz',
        '',
        '| URL | Familia | On-page | Social | Schema | Incoming | Resultado |',
        '| --- | --- | --- | --- | --- | --- | --- |'
    ];

    rows.forEach((row) => {
        lines.push(
            `| ${markdownEscape(row.pathname)} | ${row.family} | ${yesNo(row.onPageOk)} | ${yesNo(row.socialOk)} | ${yesNo(row.schemaOk)} | ${yesNo(row.incomingOk)} | ${yesNo(row.ok)} |`
        );
    });

    lines.push('', '## Incidencias');

    const failingRows = rows.filter((row) => !row.ok);
    if (failingRows.length === 0) {
        lines.push('', '- ninguna');
    } else {
        failingRows.forEach((row) => {
            lines.push('', `- ${row.pathname}`);
            row.issues.forEach((issue) => {
                lines.push(`  - ${issue}`);
            });
        });
    }

    return `${lines.join('\n')}\n`;
}

async function startStaticServer() {
    return launchStaticServer({
        projectRoot,
        port: seoPort,
        baseUrl: seoBaseUrl,
        label: 'SEO audit static server'
    });
}

async function run() {
    console.log('\nFinal SEO audit\n');

    const robotsText = readFile(path.join(siteRoot, 'robots.txt'));
    assert(
        robotsText.includes(`Sitemap: ${publicOrigin}/sitemap.xml`),
        'robots.txt points to the canonical public sitemap'
    );

    const sitemapXml = readFile(path.join(siteRoot, 'sitemap.xml'));
    const sitemapPaths = parseSitemapPaths(sitemapXml);
    const uniqueSitemapPaths = [...new Set(sitemapPaths)];
    assert(uniqueSitemapPaths.length === sitemapPaths.length, 'sitemap.xml does not repeat URLs');
    assert(uniqueSitemapPaths.length >= 30, 'sitemap.xml includes the full current public surface');
    uniqueSitemapPaths.forEach((pathname) => {
        assert(
            !/preview|hero-lab|font-preview|template-base|template-premium/i.test(pathname),
            `${pathname} stays out of preview and lab patterns`
        );
    });

    const allPublicHtmlPaths = listHtmlFiles(siteRoot).map((filePath) => publicPathForFile(siteRoot, filePath));

    const publicHtmlOutsideSitemap = allPublicHtmlPaths.filter((pathname) => !uniqueSitemapPaths.includes(pathname));
    assert(publicHtmlOutsideSitemap.length === 0, 'all public HTML files are represented in sitemap.xml');

    const incomingLinks = collectIncomingLinks(uniqueSitemapPaths);

    const rows = uniqueSitemapPaths.map((pathname) => {
        const filePath = siteFileForPath(siteRoot, pathname);
        const html = readFile(filePath);
        const title = extractTagValue(html, /<title>([^<]+)<\/title>/i);
        const description = extractTagValue(
            html,
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
        );

        return {
            pathname,
            filePath,
            family: detectFamily(pathname),
            html,
            title,
            description
        };
    });

    const titleCounts = new Map();
    const descriptionCounts = new Map();
    rows.forEach((row) => {
        titleCounts.set(row.title, (titleCounts.get(row.title) || 0) + 1);
        descriptionCounts.set(row.description, (descriptionCounts.get(row.description) || 0) + 1);
    });

    const { child, logs } = await startStaticServer();

    try {
        for (const row of rows) {
            const issues = [];
            const expectedCanonical =
                row.pathname === '/'
                    ? `${publicOrigin}/`
                    : `${publicOrigin}${row.pathname}`;
            const canonical = extractTagValue(
                row.html,
                /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
            );
            const robots = getMetaContent(row.html, 'name', 'robots');
            const ogUrl = getMetaContent(row.html, 'property', 'og:url');
            const ogTitle = getMetaContent(row.html, 'property', 'og:title');
            const ogDescription = getMetaContent(row.html, 'property', 'og:description');
            const ogImage = getMetaContent(row.html, 'property', 'og:image');
            const twitterCard = getMetaContent(row.html, 'name', 'twitter:card');
            const twitterTitle = getMetaContent(row.html, 'name', 'twitter:title');
            const twitterDescription = getMetaContent(row.html, 'name', 'twitter:description');
            const twitterImage = getMetaContent(row.html, 'name', 'twitter:image');
            const h1Count = countMatches(row.html, /<h1\b/gi);
            const htmlLang = extractTagValue(row.html, /<html[^>]+lang=["']([^"']+)["']/i);
            const jsonLdBlocks = extractJsonLdBlocks(row.html);
            const jsonLdText = jsonLdBlocks.join('\n');
            const schemaTypes = extractSchemaTypes(jsonLdBlocks);
            const expectedSchemas = expectedSchemaTypes(row.pathname);
            const incomingCount = incomingLinks.get(row.pathname)?.size || 0;

            const response = await fetchUrl(`${seoBaseUrl}${row.pathname}`);
            if (response.statusCode !== 200) {
                issues.push(`expected HTTP 200, got ${response.statusCode}`);
            }

            if (canonical !== expectedCanonical) {
                issues.push(`canonical mismatch: ${canonical || '[missing]'}`);
            }

            if (!row.title || row.title.length <= 10) {
                issues.push('missing or too-short <title>');
            }

            if (!row.description || row.description.length <= 20) {
                issues.push('missing or too-short meta description');
            }

            if (titleCounts.get(row.title) > 1) {
                issues.push('duplicate <title> across sitemap');
            }

            if (descriptionCounts.get(row.description) > 1) {
                issues.push('duplicate meta description across sitemap');
            }

            if (row.pathname === '/app/reserve/page.html') {
                if (h1Count > 1) {
                    issues.push('reserve page has more than one <h1>');
                }
            } else if (h1Count !== 1) {
                issues.push(`expected exactly one <h1>, got ${h1Count}`);
            }

            if (!htmlLang) {
                issues.push('missing html lang attribute');
            }

            if (/noindex/i.test(robots)) {
                issues.push('page is accidentally noindex');
            }

            if (!ogTitle || !ogDescription || !ogImage || !ogUrl) {
                issues.push('missing Open Graph metadata');
            }

            if (!twitterCard || !twitterTitle || !twitterDescription || !twitterImage) {
                issues.push('missing Twitter metadata');
            }

            if (ogUrl !== expectedCanonical) {
                issues.push(`og:url mismatch: ${ogUrl || '[missing]'}`);
            }

            if (!isSelfHostedPublicUrl(ogImage)) {
                issues.push(`og:image is not self-hosted: ${ogImage || '[missing]'}`);
            }

            if (twitterCard !== 'summary_large_image') {
                issues.push(`twitter:card mismatch: ${twitterCard || '[missing]'}`);
            }

            if (!incomingCount) {
                issues.push('no incoming internal links from the public HTML surface');
            }

            if (/localhost|127\.0\.0\.1|vercel\.app|railway\.app|staging/i.test(`${canonical}\n${ogUrl}\n${jsonLdText}`)) {
                issues.push('canonical, OG or JSON-LD leaks a non-production environment');
            }

            if (brokenEncodingPattern.test(row.html)) {
                issues.push('page contains broken encoding markers');
            }

            if (expectedSchemas.length > 0) {
                expectedSchemas.forEach((schemaType) => {
                    if (!schemaTypes.includes(schemaType)) {
                        issues.push(`missing schema type ${schemaType}`);
                    }
                });

                if (jsonLdBlocks.length > 0 && !jsonLdText.includes(expectedCanonical)) {
                    issues.push('JSON-LD does not reference the canonical URL');
                }
            }

            if (jsonLdText && htmlMarkupPattern.test(jsonLdText)) {
                issues.push('JSON-LD contains HTML markup');
            }

            row.issues = issues;
            row.incomingOk = incomingCount > 0;
            row.socialOk =
                !!ogTitle &&
                !!ogDescription &&
                !!ogImage &&
                isSelfHostedPublicUrl(ogImage) &&
                ogUrl === expectedCanonical &&
                twitterCard === 'summary_large_image' &&
                !!twitterTitle &&
                !!twitterDescription &&
                !!twitterImage;
            row.onPageOk =
                response.statusCode === 200 &&
                canonical === expectedCanonical &&
                row.title.length > 10 &&
                row.description.length > 20 &&
                titleCounts.get(row.title) === 1 &&
                descriptionCounts.get(row.description) === 1 &&
                !/noindex/i.test(robots) &&
                !!htmlLang &&
                (row.pathname === '/app/reserve/page.html' ? h1Count <= 1 : h1Count === 1);
            row.schemaOk =
                expectedSchemas.every((schemaType) => schemaTypes.includes(schemaType)) &&
                !htmlMarkupPattern.test(jsonLdText) &&
                (
                    expectedSchemas.length === 0 ||
                    (jsonLdBlocks.length > 0 && jsonLdText.includes(expectedCanonical))
                );
            row.ok = issues.length === 0;

            report(row.ok, `${row.pathname} passes the final SEO gate`);
        }
    } catch (error) {
        throw new Error(`${error.message}\n${logs()}`);
    } finally {
        stopProcess(child);
    }

    const summary = {
        totalUrls: rows.length,
        publicHtmlOutsideSitemap: publicHtmlOutsideSitemap.length,
        duplicateTitles: [...titleCounts.values()].filter((count) => count > 1).length,
        duplicateDescriptions: [...descriptionCounts.values()].filter((count) => count > 1).length,
        failedRows: rows.filter((row) => !row.ok).length
    };

    fs.writeFileSync(reportPath, buildMatrixMarkdown(summary, rows), 'utf8');
    report(true, `final SEO matrix written to ${path.relative(projectRoot, reportPath).replace(/\\/g, '/')}`);

    assert(summary.failedRows === 0, 'all sitemap URLs pass the final SEO gate');

    console.log('\nFinal SEO audit complete: all checks passed.\n');
}

run().catch((error) => {
    console.error('\nFinal SEO audit failed.\n');
    console.error(error.message);
    process.exit(1);
});
