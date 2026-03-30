const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { spawn, spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(projectRoot, 'site');
const staticServerPort = Number(process.env.TEST_STATIC_PORT || 8091);
const staticBaseUrl = `http://127.0.0.1:${staticServerPort}`;

const requiredFiles = [
    'server/backend-example.js',
    'site/config.js',
    'server/email-config.js',
    'server/server-http.js',
    'server/verificar-stripe.js',
    'vercel.json',
    'site/robots.txt',
    'site/sitemap.xml',
    'app/api/reserve/route.js',
    'site/app/reserve/page.html',
    'site/index.html',
    'site/fleet.html',
    'site/locations.html',
    'site/services.html',
    'site/about.html',
    'site/contact.html',
    'site/css/hub-pages.css',
    'site/js/contact-form.js'
];

const syntaxFiles = [
    'server/backend-example.js',
    'server/email-config.js',
    'site/config.js',
    'server/server-http.js',
    'server/verificar-stripe.js',
    'app/api/reserve/route.js'
];

const keyMarketingPaths = [
    '/',
    '/fleet.html',
    '/locations.html',
    '/services.html',
    '/about.html',
    '/contact.html',
    '/lamborghini-rental-dubai.html',
    '/ferrari-rental-dubai.html',
    '/palm-jumeirah-luxury-car-rental.html'
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
    if (urlPath === '/') {
        return path.join(siteRoot, 'index.html');
    }

    return path.join(siteRoot, urlPath.replace(/^\//, ''));
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
        reservePage.includes('https://js.stripe.com/v3/') && reservePage.includes('config.js'),
        'reserve page loads Stripe.js and runtime config'
    );

    const indexPage = readFile('site/index.html');
    assert(
        indexPage.includes('/app/reserve/page.html') &&
        indexPage.includes('/fleet.html') &&
        indexPage.includes('/locations.html') &&
        indexPage.includes('/services.html') &&
        indexPage.includes('/about.html') &&
        indexPage.includes('/contact.html') &&
        indexPage.includes('/lamborghini-rental-dubai.html'),
        'home page links to reservation, core trunk pages and key SEO landing pages'
    );

    const fleetPage = readFile('site/fleet.html');
    assert(
        fleetPage.includes('/app/reserve/page.html') && fleetPage.includes('/lamborghini-rental-dubai.html'),
        'fleet page links to reservation and supporting brand landing pages'
    );
    assert(
        fleetPage.includes('/css/hub-pages.css'),
        'fleet page uses the shared hub stylesheet'
    );
    const locationsPage = readFile('site/locations.html');
    assert(
        locationsPage.includes('/app/reserve/page.html') &&
        locationsPage.includes('/palm-jumeirah-luxury-car-rental.html') &&
        locationsPage.includes('/dubai-marina-luxury-car-rental.html'),
        'locations page links to reservation and key area guides'
    );
    assert(
        locationsPage.includes('/css/hub-pages.css'),
        'locations page uses the shared hub stylesheet'
    );
    const servicesPage = readFile('site/services.html');
    assert(
        servicesPage.includes('/app/reserve/page.html') &&
        servicesPage.includes('/fleet.html') &&
        servicesPage.includes('/locations.html'),
        'services page links to reservation, fleet and locations'
    );
    assert(
        servicesPage.includes('/css/hub-pages.css'),
        'services page uses the shared hub stylesheet'
    );
    const aboutPage = readFile('site/about.html');
    assert(
        aboutPage.includes('/fleet.html') &&
        aboutPage.includes('/contact.html') &&
        aboutPage.includes('/app/reserve/page.html'),
        'about page links to fleet, contact and reservation'
    );
    assert(
        aboutPage.includes('/css/hub-pages.css'),
        'about page uses the shared hub stylesheet'
    );
    const contactPage = readFile('site/contact.html');
    assert(
        contactPage.includes('id="contactForm"') &&
        contactPage.includes('/app/reserve/page.html') &&
        contactPage.includes('config.js') &&
        contactPage.includes('/js/contact-form.js'),
        'contact page includes the contact form, reservation link and runtime config'
    );
    assert(
        contactPage.includes('/css/hub-pages.css'),
        'contact page uses the shared hub stylesheet'
    );
    assert(
        indexPage.includes('js/contact-form.js') &&
        indexPage.includes('window.DynastyContactForm'),
        'home page uses the shared contact form helper'
    );
    assert(
        indexPage.includes('GOOGLE_REVIEWS_CONFIG') &&
        indexPage.includes('Google reviews slider disabled until real Places credentials are configured.'),
        'home page disables Google reviews fetches until real Places credentials are configured'
    );
    assert(
        indexPage.includes('isLocalPreviewMode') &&
        indexPage.includes('Local preview detected. Skipping automatic backend healthcheck'),
        'home page softens backend health warnings during local static previews'
    );

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
    assert(
        !robotsFile.includes('Disallow: /index.html') && !robotsFile.includes('Disallow: /lamborghini-rental-dubai.html'),
        'robots.txt does not block key public pages'
    );

    const sitemapPaths = parseSitemapPaths(readFile('site/sitemap.xml'));
    assert(sitemapPaths.length >= 10, 'sitemap.xml lists the expected public URLs');

    sitemapPaths.forEach((pathname) => {
        assert(fs.existsSync(siteFileForPath(pathname)), `${pathname} from sitemap exists in /site`);
    });

    const { child, logs } = await startStaticServer();

    try {
        const specialPaths = ['/', '/robots.txt', '/sitemap.xml', '/manifest.json'];
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
