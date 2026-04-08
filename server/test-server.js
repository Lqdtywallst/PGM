const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { spawn, spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(projectRoot, 'site');
const legacyRoot = path.join(projectRoot, 'site-legacy');
const staticServerPort = Number(process.env.TEST_STATIC_PORT || 8091);
const staticBaseUrl = `http://127.0.0.1:${staticServerPort}`;

const requiredFiles = [
    'server/backend-example.js',
    'server/email-config.js',
    'server/server-http.js',
    'server/verificar-stripe.js',
    'vercel.json',
    'app/api/reserve/route.js',
    'site/config.js',
    'site/robots.txt',
    'site/sitemap.xml',
    'site/manifest.json',
    'site/favicon.ico',
    'site/app/reserve/page.html',
    'site/index.html',
    'site/fleet.html',
    'site/locations.html',
    'site/services.html',
    'site/about.html',
    'site/contact.html',
    'site/luxury-car-rental-dubai.html',
    'site/abu-dhabi-luxury-car-rental.html',
    'site/dubai-airport-luxury-car-rental.html',
    'site/palm-jumeirah-luxury-car-rental.html',
    'site/dubai-marina-luxury-car-rental.html',
    'site/lamborghini-rental-dubai.html',
    'site/ferrari-rental-dubai.html',
    'site/mercedes-rental-dubai.html',
    'site/porsche-rental-dubai.html',
    'site/rolls-royce-rental-dubai.html',
    'site/g63-rental-dubai.html',
    'site/supercar-rental-dubai.html',
    'site/css/site-v2.css',
    'site/css/site-v2-fleet.css',
    'site/css/site-v2-locations.css',
    'site/css/site-v2-services.css',
    'site/css/site-v2-about.css',
    'site/css/site-v2-local-guide.css',
    'site/css/site-v2-service-detail.css',
    'site/css/hub-pages.css',
    'site/js/site-v2.js',
    'site/js/site-v2-fleet.js',
    'site/js/contact-form.js',
    'site-legacy/index.html'
];

const syntaxFiles = [
    'server/backend-example.js',
    'server/email-config.js',
    'server/server-http.js',
    'server/verificar-stripe.js',
    'app/api/reserve/route.js',
    'site/config.js'
];

const keyMarketingPaths = [
    '/',
    '/fleet.html',
    '/locations.html',
    '/services.html',
    '/about.html',
    '/contact.html',
    '/luxury-car-rental-dubai.html',
    '/abu-dhabi-luxury-car-rental.html',
    '/dubai-airport-luxury-car-rental.html',
    '/palm-jumeirah-luxury-car-rental.html',
    '/dubai-marina-luxury-car-rental.html',
    '/lamborghini-rental-dubai.html'
];

function report(ok, message) {
    const prefix = ok ? '[PASS]' : '[FAIL]';
    console.log(`${prefix} ${message}`);
}

function assert(condition, message) {
    report(!!condition, message);
    if (!condition) {
        throw new Error(message);
    }
}

function readFile(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode || 0,
                    headers: res.headers,
                    body
                });
            });
        });

        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy(new Error(`Timeout requesting ${url}`));
        });
    });
}

function parseSitemapPaths(xml) {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => {
        const parsed = new URL(match[1].trim());
        return parsed.pathname || '/';
    });
}

function siteFileForPath(urlPath) {
    const pathname = String(urlPath).split(/[?#]/)[0] || '/';
    if (pathname === '/') {
        return path.join(siteRoot, 'index.html');
    }

    return path.join(siteRoot, pathname.replace(/^\//, ''));
}

function extractTagValue(html, pattern) {
    const match = html.match(pattern);
    return match ? match[1].trim() : '';
}

function countMatches(html, pattern) {
    return (html.match(pattern) || []).length;
}

function createStaticMarkupAssertions(pathname, html) {
    const title = extractTagValue(html, /<title>([^<]+)<\/title>/i);
    const description = extractTagValue(
        html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );
    const canonical = extractTagValue(
        html,
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
    );

    assert(title.length > 10, `${pathname} has a non-empty <title>`);
    assert(description.length > 20, `${pathname} has a non-empty meta description`);
    assert(
        canonical.startsWith('https://prestigegoalmotion.com'),
        `${pathname} has a canonical URL on prestigegoalmotion.com`
    );
}

function isWithinRoot(targetPath, rootPath) {
    const resolvedRoot = path.resolve(rootPath);
    const resolvedTarget = path.resolve(targetPath);
    return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}

function listFilesRecursive(rootPath, extension) {
    const results = [];

    function walk(currentPath) {
        for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
            const nextPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                walk(nextPath);
                continue;
            }

            if (!extension || nextPath.endsWith(extension)) {
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
        return siteFileForPath(cleanReference);
    }

    return path.resolve(path.dirname(fromFile), cleanReference);
}

function collectLocalReferences(html) {
    const references = [];
    const attributePattern = /\b(?:href|src|action)=["']([^"']+)["']/gi;
    let match;

    while ((match = attributePattern.exec(html)) !== null) {
        references.push(match[1]);
    }

    return references;
}

async function startStaticServer() {
    const child = spawn(process.execPath, [path.join(projectRoot, 'server/server-http.js')], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PORT: String(staticServerPort)
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let logs = '';
    child.stdout.on('data', (chunk) => {
        logs += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
        logs += chunk.toString();
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (child.exitCode !== null) {
            throw new Error(`Static server exited early.\n${logs}`);
        }

        try {
            const response = await fetchUrl(`${staticBaseUrl}/`);
            if (response.statusCode === 200) {
                return { child, logs: () => logs };
            }
        } catch (error) {
            await sleep(250);
        }
    }

    stopProcess(child);
    throw new Error(`Static server did not start in time.\n${logs}`);
}

function stopProcess(child) {
    if (!child || child.exitCode !== null) {
        return;
    }

    if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
        child.kill('SIGTERM');
    }
}

async function run() {
    console.log('\nRepo smoke test\n');

    requiredFiles.forEach((relativePath) => {
        const fullPath = path.join(projectRoot, relativePath);
        assert(fs.existsSync(fullPath), `${relativePath} exists`);
    });

    assert(fs.existsSync(legacyRoot), 'site-legacy exists as the archived previous production site');
    assert(!fs.existsSync(path.join(projectRoot, 'site-v2')), 'site-v2 folder has been promoted and no longer exists');

    syntaxFiles.forEach((relativePath) => {
        const fullPath = path.join(projectRoot, relativePath);
        const check = spawnSync(process.execPath, ['--check', fullPath], {
            encoding: 'utf8'
        });
        const ok = check.status === 0;
        report(ok, `${relativePath} passes node --check`);
        if (!ok) {
            throw new Error(check.stderr || check.stdout || `Syntax check failed for ${relativePath}`);
        }
    });

    const vercelConfig = JSON.parse(readFile('vercel.json'));
    report(true, 'vercel.json parses as valid JSON');

    const hasSiteRewrite = Array.isArray(vercelConfig.rewrites) &&
        vercelConfig.rewrites.some((rule) => String(rule.destination || '').startsWith('/site/'));
    assert(hasSiteRewrite, 'vercel.json rewrites public requests into /site');

    const configModule = require(path.join(projectRoot, 'site/config.js'));
    assert(
        configModule.STRIPE_CONFIG && configModule.STRIPE_CONFIG.isDevelopment === true,
        'config.js defaults to development in local Node runtime'
    );
    assert(
        configModule.DEV_CONFIG_DUBAI.backendUrl === 'http://localhost:3000',
        'development backend points to localhost:3000'
    );

    const reserveRoute = readFile('app/api/reserve/route.js');
    assert(
        reserveRoute.includes("payment_method_types: ['card']"),
        'reservation backend creates card-only PaymentIntents'
    );
    assert(
        !reserveRoute.includes('apple_pay') && !reserveRoute.includes('google_pay'),
        'reservation backend no longer references unsupported wallet method types'
    );
    assert(
        reserveRoute.includes("require('../../../server/email-config')"),
        'reservation route reuses the shared email configuration helper'
    );

    const reservePage = readFile('site/app/reserve/page.html');
    assert(
        !reservePage.includes("window.STRIPE_CONFIG?.publishableKey || 'pk_live_"),
        'reserve page no longer hardcodes a live Stripe fallback'
    );
    assert(
        reservePage.includes('id="payButton"'),
        'reserve page includes the payment action button'
    );
    assert(
        reservePage.includes('name="fullName"') && reservePage.includes('name="email"'),
        'reserve page includes the main customer fields'
    );
    assert(
        reservePage.includes('class="booking-primer"') &&
        reservePage.includes('id="selectedCarIntro"') &&
        reservePage.includes('id="selectedCarRate"'),
        'reserve page includes the guided booking primer and selected vehicle summary'
    );
    assert(
        reservePage.includes("const BOOKING_INTENT_KEY = 'dynastyBookingIntent'") &&
        reservePage.includes("urlParams.get('startDate')") &&
        reservePage.includes('applyPrefilledBookingSchedule()'),
        'reserve page can prefill dates and times from the booking intent'
    );
    assert(
        reservePage.includes('https://js.stripe.com/v3/') && reservePage.includes('config.js'),
        'reserve page loads Stripe.js and runtime config'
    );

    const indexPage = readFile('site/index.html');
    assert(
        indexPage.includes('id="hero-lab-overlay"') &&
        indexPage.includes('id="hero-lab-pickup-date"') &&
        indexPage.includes('id="hero-lab-return-date"') &&
        indexPage.includes('js-booking-open'),
        'home page exposes the date-first hero controls'
    );
    assert(
        indexPage.includes('./fleet.html') &&
        indexPage.includes('./locations.html') &&
        indexPage.includes('./services.html') &&
        indexPage.includes('./about.html') &&
        indexPage.includes('./contact.html'),
        'home page links to the core production pages'
    );
    assert(
        indexPage.includes('./luxury-car-rental-dubai.html') &&
        indexPage.includes('./locations.html') &&
        indexPage.includes('./monthly-luxury-car-rental-dubai.html'),
        'home page links into the local SEO and service-guide layer'
    );

    const fleetPage = readFile('site/fleet.html');
    assert(
        fleetPage.includes('./luxury-car-rental-dubai.html') &&
        fleetPage.includes('./dubai-airport-luxury-car-rental.html') &&
        fleetPage.includes('./palm-jumeirah-luxury-car-rental.html') &&
        fleetPage.includes('./dubai-marina-luxury-car-rental.html'),
        'fleet page links into the core local SEO guide pages'
    );

    const locationsPage = readFile('site/locations.html');
    assert(
        locationsPage.includes('./luxury-car-rental-dubai.html') &&
        locationsPage.includes('./abu-dhabi-luxury-car-rental.html') &&
        locationsPage.includes('./dubai-airport-luxury-car-rental.html') &&
        locationsPage.includes('./palm-jumeirah-luxury-car-rental.html') &&
        locationsPage.includes('./dubai-marina-luxury-car-rental.html'),
        'locations page links prominently to the five local SEO guides'
    );
    assert(
        locationsPage.includes('./app/reserve/page.html'),
        'locations page links into the reservation flow'
    );

    const servicesPage = readFile('site/services.html');
    assert(
        servicesPage.includes('./airport-concierge-dubai.html') &&
        servicesPage.includes('./chauffeur-service-dubai.html') &&
        servicesPage.includes('./hotel-villa-airport-delivery-dubai.html') &&
        servicesPage.includes('./monthly-luxury-car-rental-dubai.html'),
        'services page links into the detailed service landing pages'
    );
    assert(
        servicesPage.includes('./locations.html') &&
        servicesPage.includes('./fleet.html') &&
        servicesPage.includes('./app/reserve/page.html'),
        'services page links to locations, fleet and reservation'
    );

    const aboutPage = readFile('site/about.html');
    assert(
        aboutPage.includes('./fleet.html') &&
        aboutPage.includes('./contact.html') &&
        aboutPage.includes('./app/reserve/page.html'),
        'about page links to fleet, contact and reservation'
    );

    const contactPage = readFile('site/contact.html');
    assert(
        contactPage.includes('id="contactForm"') &&
        contactPage.includes('/app/reserve/page.html') &&
        contactPage.includes('config.js') &&
        contactPage.includes('/js/contact-form.js'),
        'contact page includes the contact form, reservation link and runtime config'
    );

    const htmlFiles = listFilesRecursive(siteRoot, '.html');
    htmlFiles.forEach((absolutePath) => {
        const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/');
        const html = fs.readFileSync(absolutePath, 'utf8');

        assert(!html.includes('../site/'), `${relativePath} no longer references ../site legacy paths`);

        collectLocalReferences(html).forEach((reference) => {
            const resolvedReference = resolveLocalReference(absolutePath, reference);
            if (!resolvedReference) {
                return;
            }

            assert(
                isWithinRoot(resolvedReference, siteRoot),
                `${relativePath} keeps local references inside /site`
            );
            assert(
                fs.existsSync(resolvedReference),
                `${relativePath} points to an existing local reference: ${reference}`
            );
        });
    });

    const backendFile = readFile('server/backend-example.js');
    assert(
        backendFile.includes("require('../app/api/reserve/route')"),
        'backend loads reservation routes from the backend app directory'
    );
    assert(
        backendFile.includes('origin(origin, callback)') && backendFile.includes('credentials: false'),
        'backend CORS uses an allowlist and disables credentials'
    );
    assert(
        backendFile.includes("require('./email-config')") &&
        backendFile.includes('Stripe-dependent routes will return 503'),
        'backend reuses shared email config and no longer hard-fails without Stripe'
    );

    const staticServerFile = readFile('server/server-http.js');
    assert(
        staticServerFile.includes("path.resolve(__dirname, '../site')"),
        'local static server serves the /site directory'
    );
    assert(
        staticServerFile.includes('process.env.PORT || 8080'),
        'local static server accepts a configurable port'
    );

    const robotsFile = readFile('site/robots.txt');
    assert(
        robotsFile.includes('Sitemap: https://prestigegoalmotion.com/sitemap.xml'),
        'robots.txt points to the public sitemap'
    );

    const sitemapPaths = parseSitemapPaths(readFile('site/sitemap.xml'));
    assert(sitemapPaths.length >= 20, 'sitemap.xml lists the expected public URLs for the new production site');
    sitemapPaths.forEach((pathname) => {
        assert(fs.existsSync(siteFileForPath(pathname)), `${pathname} from sitemap exists in /site`);
    });

    const { child, logs } = await startStaticServer();

    try {
        const specialPaths = ['/', '/robots.txt', '/sitemap.xml', '/manifest.json', '/contact.html', '/app/reserve/page.html'];
        for (const pathname of [...specialPaths, ...sitemapPaths]) {
            const response = await fetchUrl(`${staticBaseUrl}${pathname}`);
            assert(response.statusCode === 200, `${pathname} responds with HTTP 200 on the local static server`);
        }

        for (const pathname of keyMarketingPaths) {
            const response = await fetchUrl(`${staticBaseUrl}${pathname}`);
            createStaticMarkupAssertions(pathname, response.body);
            assert(countMatches(response.body, /<h1\b/gi) === 1, `${pathname} exposes a single <h1>`);
        }

        const reserveResponse = await fetchUrl(`${staticBaseUrl}/app/reserve/page.html`);
        assert(
            reserveResponse.body.includes('id="payButton"') && reserveResponse.body.includes('name="email"'),
            'reserve page renders the checkout structure through the local static server'
        );

        const contactResponse = await fetchUrl(`${staticBaseUrl}/contact.html`);
        assert(
            contactResponse.body.includes('id="contactForm"') &&
            contactResponse.body.includes('/js/contact-form.js'),
            'contact page renders the shared contact form through the local static server'
        );
    } catch (error) {
        throw new Error(`${error.message}\n${logs()}`);
    } finally {
        stopProcess(child);
    }

    console.log('\nSmoke test complete: all checks passed.\n');
}

run().catch((error) => {
    console.error('\nSmoke test failed.\n');
    console.error(error.message);
    process.exit(1);
});
