const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PUBLIC_PAGE_FILE_MAP } = require('./public-page-map');
const {
    countMatches,
    extractTagValue,
    fetchUrl,
    parseSitemapPaths,
    publicPathForFile: resolvePublicPathForFile,
    siteFileForPath: resolveSiteFileForPath,
    startStaticServer: launchStaticServer,
    stopProcess
} = require('./site-audit-utils');

const projectRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(projectRoot, 'site');
const staticServerPort = Number(process.env.TEST_STATIC_PORT || (8400 + Math.floor(Math.random() * 200)));
const staticBaseUrl = `http://127.0.0.1:${staticServerPort}`;
const requiredPublicFiles = Object.values(PUBLIC_PAGE_FILE_MAP).map((relativePath) => `site/${relativePath}`);

const requiredFiles = [
    'server/backend-example.js',
    'server/email-config.js',
    'server/google-reviews.js',
    'server/seo-audit-core.js',
    'server/server-http.js',
    'server/verificar-stripe.js',
    'vercel.json',
    'scripts/run-copy-audit.js',
    'scripts/seed-demo-reservation.js',
    'scripts/run-seo-agent.js',
    'app/api/reserve/route.js',
    'site/config.js',
    'site/robots.txt',
    'site/sitemap.xml',
    'site/manifest.json',
    'site/favicon.ico',
    ...requiredPublicFiles,
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
    'site/js/reservation-lookup.js',
    'site/css/site-v2-reservation-lookup.css'
];

const syntaxFiles = [
    'server/backend-example.js',
    'server/email-config.js',
    'server/google-reviews.js',
    'server/seo-audit-core.js',
    'server/server-http.js',
    'server/verificar-stripe.js',
    'scripts/run-copy-audit.js',
    'scripts/seed-demo-reservation.js',
    'scripts/run-seo-agent.js',
    'app/api/reserve/route.js',
    'site/config.js',
    'site/js/reservation-lookup.js'
];

const keyMarketingPaths = [
    '/',
    '/fleet.html',
    '/locations.html',
    '/services.html',
    '/about.html',
    '/contact.html',
    '/reservation-lookup.html',
    '/luxury-car-rental-dubai.html',
    '/abu-dhabi-luxury-car-rental.html',
    '/dubai-airport-luxury-car-rental.html',
    '/palm-jumeirah-luxury-car-rental.html',
    '/dubai-marina-luxury-car-rental.html',
    '/lamborghini-rental-dubai.html'
];

const officialServiceClusterPaths = [
    '/services.html',
    '/chauffeur-service-dubai.html',
    '/airport-concierge-dubai.html',
    '/hotel-villa-airport-delivery-dubai.html',
    '/wedding-event-car-rental-dubai.html',
    '/business-car-rental-dubai.html',
    '/monthly-luxury-car-rental-dubai.html'
];

const serviceLocationGuidePaths = [
    './luxury-car-rental-dubai.html',
    './abu-dhabi-luxury-car-rental.html',
    './dubai-airport-luxury-car-rental.html',
    './palm-jumeirah-luxury-car-rental.html',
    './dubai-marina-luxury-car-rental.html'
];

const pathsOutsideOfficialServicesCluster = [
    '/luxury-car-rental-dubai.html',
    '/supercar-rental-dubai.html',
    '/lamborghini-rental-dubai.html',
    '/ferrari-rental-dubai.html',
    '/mercedes-rental-dubai.html',
    '/porsche-rental-dubai.html',
    '/rolls-royce-rental-dubai.html',
    '/abu-dhabi-luxury-car-rental.html',
    '/dubai-airport-luxury-car-rental.html',
    '/palm-jumeirah-luxury-car-rental.html',
    '/dubai-marina-luxury-car-rental.html'
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

function siteFileForPath(urlPath) {
    return resolveSiteFileForPath(siteRoot, urlPath);
}

function readPublicPage(pathname) {
    return fs.readFileSync(siteFileForPath(pathname), 'utf8');
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasMetaTagContent(html, attributeName, attributeValue) {
    const escapedAttribute = escapeRegExp(attributeValue);
    const patterns = [
        new RegExp(`<meta[^>]+${attributeName}=["']${escapedAttribute}["'][^>]+content=["'][^"']+["'][^>]*>`, 'i'),
        new RegExp(`<meta[^>]+content=["'][^"']+["'][^>]+${attributeName}=["']${escapedAttribute}["'][^>]*>`, 'i')
    ];

    return patterns.some((pattern) => pattern.test(html));
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

function createServiceClusterAssertions(pathname, html) {
    const canonical = extractTagValue(
        html,
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
    );

    createStaticMarkupAssertions(pathname, html);

    assert(hasMetaTagContent(html, 'property', 'og:title'), `${pathname} exposes og:title`);
    assert(hasMetaTagContent(html, 'property', 'og:description'), `${pathname} exposes og:description`);
    assert(hasMetaTagContent(html, 'property', 'og:image'), `${pathname} exposes og:image`);
    assert(hasMetaTagContent(html, 'name', 'twitter:card'), `${pathname} exposes twitter:card`);
    assert(hasMetaTagContent(html, 'name', 'twitter:title'), `${pathname} exposes twitter:title`);
    assert(hasMetaTagContent(html, 'name', 'twitter:description'), `${pathname} exposes twitter:description`);
    assert(hasMetaTagContent(html, 'name', 'twitter:image'), `${pathname} exposes twitter:image`);
    assert(/aria-label=["']Breadcrumb["']/i.test(html), `${pathname} exposes visible breadcrumbs`);
    assert(/"@type"\s*:\s*"BreadcrumbList"/.test(html), `${pathname} includes BreadcrumbList JSON-LD`);
    assert(
        /data-analytics-event=["']service_whatsapp_click["']/i.test(html),
        `${pathname} exposes a tracked WhatsApp CTA`
    );
    assert(
        /data-analytics-event=["']service_reservation_click["']/i.test(html),
        `${pathname} exposes a tracked reservation CTA`
    );

    if (pathname === '/services.html') {
        return;
    }

    assert(/"@type"\s*:\s*"Service"/.test(html), `${pathname} includes Service JSON-LD`);
    assert(
        new RegExp(`"url"\\s*:\\s*"${escapeRegExp(canonical)}"`).test(html),
        `${pathname} aligns Service JSON-LD with the canonical URL`
    );
    assert(html.includes('href="./app/reserve/page.html"'), `${pathname} links to the reservation flow`);
    assert(html.includes('href="./services.html"'), `${pathname} links back to the services hub`);
    assert(
        serviceLocationGuidePaths.some((link) => html.includes(`href="${link}"`) || html.includes(`href='${link}'`)),
        `${pathname} links to at least one relevant location guide`
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

    const html = fs.readFileSync(fromFile, 'utf8');
    const baseHref = extractTagValue(html, /<base[^>]+href=["']([^"']+)["'][^>]*>/i);
    const basePath = baseHref.startsWith('/') ? baseHref : resolvePublicPathForFile(siteRoot, fromFile);
    const resolvedPath = new URL(cleanReference, `https://prestigegoalmotion.com${basePath}`).pathname;
    return siteFileForPath(resolvedPath);
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
    return launchStaticServer({
        projectRoot,
        port: staticServerPort,
        baseUrl: staticBaseUrl,
        label: 'Static server'
    });
}

function loadConfigModuleForWindow(windowValue) {
    const configPath = path.join(projectRoot, 'site/config.js');
    const previousWindow = global.window;
    const hadWindow = Object.prototype.hasOwnProperty.call(global, 'window');

    try {
        if (typeof windowValue === 'undefined') {
            delete global.window;
        } else {
            global.window = windowValue;
        }

        delete require.cache[require.resolve(configPath)];
        return require(configPath);
    } finally {
        delete require.cache[require.resolve(configPath)];

        if (hadWindow) {
            global.window = previousWindow;
        } else {
            delete global.window;
        }
    }
}

async function run() {
    console.log('\nRepo smoke test\n');

    requiredFiles.forEach((relativePath) => {
        const fullPath = path.join(projectRoot, relativePath);
        assert(fs.existsSync(fullPath), `${relativePath} exists`);
    });

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
    const packageJson = JSON.parse(readFile('package.json'));
    assert(
        packageJson.scripts && packageJson.scripts['audit:copy'] === 'node scripts/run-copy-audit.js',
        'package.json exposes the advisory copy audit script'
    );

    const hasSiteRewrite = Array.isArray(vercelConfig.rewrites) &&
        vercelConfig.rewrites.some((rule) => String(rule.destination || '').startsWith('/site/'));
    assert(hasSiteRewrite, 'vercel.json rewrites public requests into /site');

    const configModule = loadConfigModuleForWindow();
    assert(
        configModule.STRIPE_CONFIG && configModule.STRIPE_CONFIG.isDevelopment === true,
        'config.js defaults to development in local Node runtime'
    );
    assert(
        configModule.DEV_CONFIG_DUBAI.backendUrl === 'http://localhost:3000',
        'development backend points to localhost:3000'
    );

    const productionBrowserConfig = loadConfigModuleForWindow({
        location: {
            protocol: 'https:',
            hostname: 'prestigegoalmotion.com'
        }
    });
    assert(
        productionBrowserConfig.STRIPE_CONFIG &&
        productionBrowserConfig.STRIPE_CONFIG.environment === 'production' &&
        productionBrowserConfig.STRIPE_CONFIG.isProduction === true,
        'config.js switches public custom domains to production'
    );
    assert(
        productionBrowserConfig.STRIPE_CONFIG.backendUrl === productionBrowserConfig.PROD_CONFIG_DUBAI.backendUrl,
        'production browser runtime points to the production backend'
    );

    const previewBrowserConfig = loadConfigModuleForWindow({
        location: {
            protocol: 'https:',
            hostname: 'pgm-git-staging-lqdtywallst.vercel.app'
        }
    });
    assert(
        previewBrowserConfig.STRIPE_CONFIG &&
        previewBrowserConfig.STRIPE_CONFIG.environment === 'staging' &&
        previewBrowserConfig.STRIPE_CONFIG.isStaging === true,
        'config.js switches Vercel preview hostnames to staging'
    );
    assert(
        previewBrowserConfig.STRIPE_CONFIG.backendUrl === previewBrowserConfig.STAGING_CONFIG_DUBAI.backendUrl &&
        previewBrowserConfig.STRIPE_CONFIG.backendUrl !== previewBrowserConfig.PROD_CONFIG_DUBAI.backendUrl,
        'Vercel preview runtime points to the staging backend instead of production'
    );

    const stagingDomainConfig = loadConfigModuleForWindow({
        location: {
            protocol: 'https:',
            hostname: 'staging.prestigegoalmotion.com'
        }
    });
    assert(
        stagingDomainConfig.STRIPE_CONFIG &&
        stagingDomainConfig.STRIPE_CONFIG.environment === 'staging' &&
        stagingDomainConfig.STRIPE_CONFIG.backendUrl === stagingDomainConfig.STAGING_CONFIG_DUBAI.backendUrl,
        'staging custom domain points to the staging backend'
    );

    const runtimeOverrideConfig = loadConfigModuleForWindow({
        PGM_RUNTIME_CONFIG: {
            backendUrl: 'https://runtime-staging.example.com',
            publishableKey: 'pk_test_runtime'
        },
        location: {
            protocol: 'https:',
            hostname: 'staging.prestigegoalmotion.com'
        }
    });
    assert(
        runtimeOverrideConfig.STRIPE_CONFIG.backendUrl === 'https://runtime-staging.example.com' &&
        runtimeOverrideConfig.STRIPE_CONFIG.publishableKey === 'pk_test_runtime',
        'runtime config can override staging backend and Stripe publishable key'
    );

    const cspHeader = JSON.stringify(vercelConfig.headers || []);
    assert(
        cspHeader.includes('https://pgm-staging.up.railway.app') &&
        cspHeader.includes('https://staging.prestigegoalmotion.com') &&
        cspHeader.includes('https://preprod.prestigegoalmotion.com'),
        'Vercel CSP allows the staging backend and staging domains'
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
    assert(
        reserveRoute.includes("require('../../../server/reservation-store')") &&
        reserveRoute.includes('saveReservationRecord') &&
        reserveRoute.includes('reservationId'),
        'reservation backend persists each booking with a stable reservation id'
    );
    assert(
        reserveRoute.includes("router.post('/lookup'") &&
        reserveRoute.includes('buildSafeReservationLookupSummary') &&
        reserveRoute.includes('findReservationForLookup'),
        'reservation backend exposes a safe customer lookup endpoint without raw customer records'
    );
    const reservationStore = readFile('server/reservation-store.js');
    assert(
        reservationStore.includes('CREATE TABLE IF NOT EXISTS reservations') &&
        reservationStore.includes('DATABASE_URL') &&
        reservationStore.includes('runtimeReservationDir') &&
        reservationStore.includes('findReservationForLookup'),
        'reservation store supports PostgreSQL, local JSON storage and secure reservation lookup'
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
    const reserveFlowScript = readFile('site/js/reserve-flow.js');
    assert(
        reserveFlowScript.includes("const BOOKING_INTENT_KEY = 'dynastyBookingIntent'") &&
        reserveFlowScript.includes("urlParams.get('startDate')") &&
        reserveFlowScript.includes('applyPrefilledBookingSchedule()') &&
        reserveFlowScript.includes('clampBookingDateValue('),
        'reserve page can prefill and clamp dates and times from the booking intent'
    );
    assert(
        reserveFlowScript.includes('https://js.stripe.com/v3/') && reservePage.includes('config.js'),
        'reserve page loads Stripe.js and runtime config'
    );

    const indexPage = readFile('site/index.html');
    const homeSiteCss = readFile('site/css/site-v2.css');
    assert(
        indexPage.includes('id="hero-lab-overlay"') &&
        indexPage.includes('id="hero-lab-pickup-date"') &&
        indexPage.includes('id="hero-lab-return-date"') &&
        indexPage.includes('js-booking-open'),
        'home page exposes the date-first hero controls'
    );
    const homeMobileHeroVideoRule = /\.home-page\s+\.hero-lab__video\s*\{(?=[^}]*display:\s*block;)(?=[^}]*opacity:\s*0\.72;)[^}]*\}/m;
    const homeMobileHeroStillRule = /\.home-page\s+\.hero-lab__still\s*\{(?=[^}]*opacity:\s*0;)[^}]*\}/m;
    assert(
        indexPage.includes('data-src-mobile="./media/hero-sports-road.mp4"') &&
        homeMobileHeroVideoRule.test(homeSiteCss) &&
        homeMobileHeroStillRule.test(homeSiteCss),
        'home mobile hero keeps the lightweight video visible above the fold'
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
        indexPage.includes('./palm-jumeirah-luxury-car-rental.html') &&
        indexPage.includes('./dubai-marina-luxury-car-rental.html') &&
        indexPage.includes('./dubai-airport-luxury-car-rental.html') &&
        indexPage.includes('./monthly-luxury-car-rental-dubai.html'),
        'home page links into the locations hub, priority guides and service-guide layer'
    );
    assert(
        indexPage.includes('data-google-reviews') &&
        readFile('site/js/site-v2.js').includes('/api/reviews/google') &&
        indexPage.includes('Read Google reviews') &&
        indexPage.includes('Google reviews load here from the official Dynasty Prestige Google Business profile') &&
        !indexPage.includes('Handover feedback') &&
        !indexPage.includes('WhatsApp support') &&
        !indexPage.includes('Dubai delivery</strong>') &&
        !indexPage.includes('Luxury Supercars Rental LLC') &&
        !indexPage.includes('Kashif Dogar') &&
        !indexPage.includes('Hassan Khreis') &&
        !indexPage.includes('roy ashkar') &&
        !indexPage.includes('ChIJZTglPZZpXz4R2NFpN-mV594'),
        'home reviews load from the official Google profile and do not hardcode fake or third-party testimonials'
    );

    const fleetPage = readPublicPage('/fleet.html');
    assert(
        fleetPage.includes('./luxury-car-rental-dubai.html') &&
        fleetPage.includes('./dubai-airport-luxury-car-rental.html') &&
        fleetPage.includes('./palm-jumeirah-luxury-car-rental.html') &&
        fleetPage.includes('./dubai-marina-luxury-car-rental.html'),
        'fleet page links into the core local SEO guide pages'
    );
    assert(
        fleetPage.includes('./chauffeur-service-dubai.html') &&
        fleetPage.includes('./airport-concierge-dubai.html') &&
        fleetPage.includes('./hotel-villa-airport-delivery-dubai.html') &&
        fleetPage.includes('./monthly-luxury-car-rental-dubai.html'),
        'fleet page links contextually into the core service detail pages'
    );

    const locationsPage = readPublicPage('/locations.html');
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
    assert(
        locationsPage.includes('./airport-concierge-dubai.html') &&
        locationsPage.includes('./hotel-villa-airport-delivery-dubai.html') &&
        locationsPage.includes('./chauffeur-service-dubai.html') &&
        locationsPage.includes('./business-car-rental-dubai.html'),
        'locations page links contextually into the service detail pages'
    );
    assert(
        locationsPage.includes('./fleet.html') &&
        locationsPage.includes('./contact.html') &&
        locationsPage.includes('Palm Jumeirah, Dubai UAE') &&
        locationsPage.includes('Service-area model') &&
        locationsPage.includes('locations-faq-list') &&
        locationsPage.includes('FAQPage'),
        'locations page exposes the operating model, navigation paths and visible FAQ content'
    );
    assert(
        /data-analytics-event=["']location_whatsapp_click["']/i.test(locationsPage) &&
        /data-analytics-event=["']location_reservation_click["']/i.test(locationsPage) &&
        /data-analytics-event=["']location_call_click["']/i.test(locationsPage) &&
        locationsPage.includes('data-analytics-location="locations_hub"'),
        'locations hub exposes tracked WhatsApp, reservation and call CTAs'
    );

    [
        ['/luxury-car-rental-dubai.html', 'dubai_guide'],
        ['/abu-dhabi-luxury-car-rental.html', 'abu_dhabi_guide'],
        ['/dubai-airport-luxury-car-rental.html', 'dubai_airport_guide'],
        ['/palm-jumeirah-luxury-car-rental.html', 'palm_jumeirah_guide'],
        ['/dubai-marina-luxury-car-rental.html', 'dubai_marina_guide']
    ].forEach(([pathname, locationKey]) => {
        const html = readPublicPage(pathname);
        assert(
            /data-analytics-event=["']location_reservation_click["']/i.test(html) &&
            /data-analytics-event=["']location_whatsapp_click["']/i.test(html) &&
            /data-analytics-event=["']location_call_click["']/i.test(html) &&
            html.includes(`data-analytics-location="${locationKey}"`),
            `${pathname} exposes tracked local reservation, WhatsApp and call CTAs`
        );
    });

    const servicesPage = readPublicPage('/services.html');
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

    const siteV2Script = readFile('site/js/site-v2.js');
    assert(
        siteV2Script.includes('a[data-analytics-event]') &&
        siteV2Script.includes('emitAnalyticsEvent') &&
        siteV2Script.includes('dynastyReservationAttribution') &&
        siteV2Script.includes('analyticsCluster') &&
        siteV2Script.includes('location_name') &&
        siteV2Script.includes('eventName.endsWith("_reservation_click")'),
        'site-v2.js exposes the shared services and locations CTA analytics bridge'
    );
    assert(
        siteV2Script.includes('initFloatingBackButton') &&
        siteV2Script.includes('dynastyPreviousPage') &&
        siteV2Script.includes('lab-floating-back'),
        'site-v2.js exposes the shared floating previous-page navigation'
    );
    assert(
        siteV2Script.includes('initFloatingContactButtons') &&
        siteV2Script.includes('normalizeGenericContactLinks') &&
        siteV2Script.includes('lab-floating-contact') &&
        siteV2Script.includes('help booking a luxury car in Dubai'),
        'site-v2.js exposes generic floating call and WhatsApp contact buttons'
    );

    const reserveShellScript = readFile('site/js/reserve-shell.js');
    const sharedSiteCss = readFile('site/css/site-v2.css');
    const reserveShellCss = readFile('site/css/reserve-shell.css');
    assert(
        reserveShellScript.includes('initFloatingBackButton') &&
        reserveShellScript.includes('dynastyPreviousPage') &&
        reserveShellScript.includes('lab-floating-back'),
        'reserve shell exposes the floating previous-page navigation'
    );
    assert(
        reserveShellScript.includes('initFloatingContactButtons') &&
        reserveShellScript.includes('normalizeGenericContactLinks') &&
        reserveShellScript.includes('lab-floating-contact') &&
        reserveShellScript.includes('help booking a luxury car in Dubai'),
        'reserve shell exposes generic floating call and WhatsApp contact buttons'
    );
    assert(
        sharedSiteCss.includes('.lab-floating-back') &&
        reserveShellCss.includes('.lab-floating-back') &&
        sharedSiteCss.includes('.lab-floating-contact') &&
        reserveShellCss.includes('.lab-floating-contact') &&
        sharedSiteCss.includes('.home-page .lab-floating-back') &&
        sharedSiteCss.includes('.hero-lab-overlay-open .lab-floating-back') &&
        sharedSiteCss.includes('.lab-mobile-nav-open .lab-floating-back') &&
        sharedSiteCss.includes('.fleet-filter-sheet-open .lab-floating-back'),
        'shared and reserve shells style floating previous-page and contact navigation'
    );
    const servicesCss = readFile('site/css/site-v2-services.css');
    const functionalAgentScript = readFile('scripts/run-functional-agent.js');
    assert(
        siteV2Script.includes('initVehicleMediaLightbox') &&
        siteV2Script.includes('vehicle-media-lightbox') &&
        sharedSiteCss.includes('.vehicle-media-lightbox.is-open') &&
        sharedSiteCss.includes('.is-lightbox-trigger'),
        'vehicle galleries expose an interactive media lightbox'
    );
    assert(
        siteV2Script.includes('is-service-updating') &&
        servicesCss.includes('services-panel-response') &&
        functionalAgentScript.includes('createServicesLaneSelectorAction') &&
        functionalAgentScript.includes('createVehicleGalleryLightboxAction'),
        'functional auditor checks service circles and vehicle gallery popups'
    );
    assert(
        functionalAgentScript.includes('createContactProtocolLinksAction') &&
        functionalAgentScript.includes('EXPECTED_CONTACT_PHONE_E164') &&
        functionalAgentScript.includes('EXPECTED_GENERIC_WHATSAPP_MESSAGE') &&
        functionalAgentScript.includes('car-context WhatsApp'),
        'functional agent validates call and WhatsApp number/message contracts'
    );

    const fleetScript = readFile('site/js/site-v2-fleet.js');
    const fleetCss = readFile('site/css/site-v2-fleet.css');
    assert(
        fleetScript.includes('fleet-filter-close__icon') &&
        fleetScript.includes('Close filters and return to car results') &&
        !fleetScript.includes('Back to cars'),
        'fleet mobile filter sheet uses a close icon instead of a competing back button'
    );
    const mobileToolbarBlocks = [...fleetCss.matchAll(/\.fleet-mobile-toolbar\s*\{([\s\S]*?)\n\s*\}/g)].map((match) => match[1]);
    assert(
        mobileToolbarBlocks.some((block) => /position:\s*relative\b/.test(block)) &&
        !mobileToolbarBlocks.some((block) => /position:\s*(sticky|fixed)\b/.test(block)),
        'fleet mobile filter toolbar scrolls with car results instead of pinning over cards'
    );

    const aboutPage = readPublicPage('/about.html');
    assert(
        aboutPage.includes('./fleet.html') &&
        aboutPage.includes('./contact.html') &&
        aboutPage.includes('./app/reserve/page.html'),
        'about page links to fleet, contact and reservation'
    );

    const contactPage = readPublicPage('/contact.html');
    assert(
        contactPage.includes('id="contactForm"') &&
        contactPage.includes('/app/reserve/page.html') &&
        contactPage.includes('config.js') &&
        contactPage.includes('/js/contact-form.js'),
        'contact page includes the contact form, reservation link and runtime config'
    );

    const reservationLookupPage = readPublicPage('/reservation-lookup.html');
    assert(
        reservationLookupPage.includes('data-reservation-lookup-form') &&
        reservationLookupPage.includes('/api/reserve/lookup') === false &&
        reservationLookupPage.includes('./js/reservation-lookup.js') &&
        reservationLookupPage.includes('Find booking'),
        'reservation lookup page exposes a safe customer-facing lookup form'
    );
    const reservationLookupScript = readFile('site/js/reservation-lookup.js');
    assert(
        reservationLookupScript.includes('/api/reserve/lookup') &&
        reservationLookupScript.includes('Reservation lookup is not configured yet') &&
        reservationLookupScript.includes('WhatsApp the team'),
        'reservation lookup script calls the secure backend endpoint with support fallbacks'
    );

    const htmlFiles = listFilesRecursive(siteRoot, '.html');
    htmlFiles.forEach((absolutePath) => {
        const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/');
        const html = fs.readFileSync(absolutePath, 'utf8');

        assert(!html.includes('../site/'), `${relativePath} no longer references ../site path patterns`);

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
    assert(
        backendFile.includes("require('./reservation-store')") &&
        backendFile.includes('buildReservationRecordFromPaymentIntent') &&
        backendFile.includes('stripe webhook payment succeeded'),
        'backend records reservation state from legacy payment intents and Stripe webhooks'
    );
    const envExample = readFile('.env.example');
    assert(
        envExample.includes('DATABASE_URL=') && envExample.includes('DATABASE_SSL='),
        '.env.example documents production reservation database settings'
    );
    assert(
        envExample.includes('ADMIN_USER=') &&
        envExample.includes('ADMIN_PASSWORD_HASH=') &&
        envExample.includes('ADMIN_SESSION_SECRET='),
        '.env.example documents private admin reservation desk settings'
    );
    assert(
        envExample.includes('TEST_DATABASE_URL=') &&
        packageJson.scripts['test:db'] &&
        packageJson.scripts['admin:seed-demo'],
        'PostgreSQL reservation storage can be tested and locally seeded'
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

    const officialServiceClusterSet = new Set(officialServiceClusterPaths);
    assert(
        officialServiceClusterSet.size === officialServiceClusterPaths.length &&
            officialServiceClusterPaths.length === 7,
        'services cluster keeps a single official scope made of the hub plus six detail pages'
    );
    pathsOutsideOfficialServicesCluster.forEach((pathname) => {
        assert(
            !officialServiceClusterSet.has(pathname),
            `${pathname} stays outside the official services cluster`
        );
        const html = readPublicPage(pathname);
        assert(
            !/data-analytics-event=["']service_(?:whatsapp|reservation)_click["']/i.test(html),
            `${pathname} does not emit services-cluster CTA analytics`
        );
    });

    const { child, logs } = await startStaticServer();

    try {
        const specialPaths = ['/', '/robots.txt', '/sitemap.xml', '/manifest.json', '/contact.html', '/reservation-lookup.html', '/app/reserve/page.html'];
        for (const pathname of [...specialPaths, ...sitemapPaths]) {
            const response = await fetchUrl(`${staticBaseUrl}${pathname}`);
            assert(response.statusCode === 200, `${pathname} responds with HTTP 200 on the local static server`);
        }

        for (const pathname of keyMarketingPaths) {
            const response = await fetchUrl(`${staticBaseUrl}${pathname}`);
            createStaticMarkupAssertions(pathname, response.body);
            assert(countMatches(response.body, /<h1\b/gi) === 1, `${pathname} exposes a single <h1>`);
        }

        for (const pathname of officialServiceClusterPaths) {
            const response = await fetchUrl(`${staticBaseUrl}${pathname}`);
            createServiceClusterAssertions(pathname, response.body);
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
