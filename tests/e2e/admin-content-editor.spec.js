const { expect, test } = require('@playwright/test');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');

const {
    hashAdminPassword
} = require('../../server/admin/admin-auth');

const repoRoot = path.resolve(__dirname, '../..');
const adminUser = 'owner';
const adminPassword = 'AdminContentTest2026!';

let backendProcess = null;
let adminBaseUrl = '';

function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close(() => resolve(address.port));
        });
    });
}

async function waitForBackend(url, processRef) {
    const startedAt = Date.now();
    let lastError = null;

    while (Date.now() - startedAt < 15000) {
        if (processRef.exitCode !== null) {
            throw new Error(`Admin backend exited early with code ${processRef.exitCode}`);
        }

        try {
            const response = await fetch(`${url}/health`);
            if (response.ok) {
                return;
            }
        } catch (error) {
            lastError = error;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Admin backend did not start: ${lastError?.message || 'timeout'}`);
}

async function loginToContentEditor(page) {
    await page.goto(`${adminBaseUrl}/admin/login.html?next=%2Fadmin%2Fcontent.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#username', adminUser);
    await page.fill('#password', adminPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/content\.html$/);
    await expect(page.locator('#headerUtilityLinks')).toContainText('Quick contact buttons');
}

test.describe('Private admin content editor', () => {
    test.beforeAll(async () => {
        const port = await getFreePort();
        adminBaseUrl = `http://127.0.0.1:${port}`;
        backendProcess = childProcess.spawn(process.execPath, ['server/apps/backend.js'], {
            cwd: repoRoot,
            env: {
                ...process.env,
                ADMIN_USER: adminUser,
                ADMIN_PASSWORD_HASH: hashAdminPassword(adminPassword),
                ADMIN_SESSION_SECRET: `test-secret-${crypto.randomBytes(32).toString('hex')}`,
                CONTACT_FORM_LOG_ONLY: 'true',
                NODE_ENV: 'test',
                PORT: String(port)
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        await waitForBackend(adminBaseUrl, backendProcess);
    });

    test.afterAll(async () => {
        if (backendProcess && backendProcess.exitCode === null) {
            backendProcess.kill();
        }
    });

    test('simple editor controls stay coherent while editing locally', async ({ page }) => {
        await loginToContentEditor(page);

        const qa = await page.evaluate(() => {
            function setQuickType(type) {
                const firstUtility = document.querySelector('#headerUtilityLinks details[data-item-index="0"]');
                const kind = firstUtility.querySelector('[data-field="kind"]');
                kind.value = type;
                kind.dispatchEvent(new Event('change', { bubbles: true }));

                return {
                    type,
                    label: firstUtility.querySelector('[data-field="label"]').value,
                    href: firstUtility.querySelector('[data-field="href"]').value,
                    ariaLabel: firstUtility.querySelector('[data-field="ariaLabel"]').value
                };
            }

            function addCollectionItem(rootId) {
                const before = document.querySelectorAll(`#${rootId} details[data-item-index]`).length;
                document.querySelector(`#${rootId} [data-collection-action="add"]`).click();
                const items = Array.from(document.querySelectorAll(`#${rootId} details[data-item-index]`));
                const last = items[items.length - 1];

                return {
                    before,
                    after: items.length,
                    lastOpen: Boolean(last && last.open)
                };
            }

            const firstNav = document.querySelector('#headerNavItems [data-header-nav-item="0"]');
            const navType = firstNav.querySelector('[data-field="itemType"]');
            navType.value = 'mega';
            navType.dispatchEvent(new Event('change', { bubbles: true }));
            const refreshedFirstNav = document.querySelector('#headerNavItems [data-header-nav-item="0"]');

            const headlineInput = document.querySelector('#heroHeadline');
            headlineInput.value = 'QA homepage headline';
            headlineInput.dispatchEvent(new Event('input', { bubbles: true }));

            const firstFleet = document.querySelector('#fleetEditor [data-card-editor]');
            const fleetTitle = firstFleet.querySelector('[data-field="title"]');
            fleetTitle.value = 'QA Fleet Title';
            fleetTitle.dispatchEvent(new Event('input', { bubbles: true }));

            const heroToggle = document.querySelector('#styleShowHeroCta');
            heroToggle.checked = false;
            heroToggle.dispatchEvent(new Event('change', { bubbles: true }));
            const secondaryToggle = document.querySelector('#styleShowBookingSecondary');
            secondaryToggle.checked = true;
            secondaryToggle.dispatchEvent(new Event('change', { bubbles: true }));

            return {
                quickButtons: [setQuickType('call'), setQuickType('email'), setQuickType('whatsapp')],
                panelVariantValueGroups: Array.from(document.querySelectorAll('#headerNavItems [data-field="panelVariant"]')).map((select) => {
                    return Array.from(select.options).map((option) => option.value);
                }),
                navTypeAfterMega: {
                    hasCardControls: Boolean(refreshedFirstNav.querySelector('[data-header-nav-card]')),
                    open: refreshedFirstNav.open
                },
                added: {
                    quick: addCollectionItem('headerUtilityLinks'),
                    service: addCollectionItem('servicesLanes'),
                    location: addCollectionItem('locationsHeroZones')
                },
                previews: {
                    homeHeadline: document.querySelector('#previewHeadline').textContent,
                    fleetTitle: document.querySelector('#fleetPreviewGrid h3').textContent.trim(),
                    heroDisplay: getComputedStyle(document.querySelector('#stylePreviewButton')).display,
                    secondaryDisplay: getComputedStyle(document.querySelector('#stylePreviewSecondaryButton')).display
                }
            };
        });

        expect(qa.quickButtons).toEqual([
            expect.objectContaining({ type: 'call', label: 'Call', href: expect.stringMatching(/^tel:\+/), ariaLabel: expect.stringMatching(/call/i) }),
            expect.objectContaining({ type: 'email', label: 'Email', href: expect.stringMatching(/^mailto:/), ariaLabel: expect.stringMatching(/email/i) }),
            expect.objectContaining({ type: 'whatsapp', label: 'WhatsApp', href: expect.stringMatching(/^https:\/\/wa\.me\//), ariaLabel: expect.stringMatching(/whatsapp/i) })
        ]);
        qa.panelVariantValueGroups.forEach((values) => {
            expect(new Set(values).size).toBe(values.length);
        });
        expect(qa.navTypeAfterMega).toEqual({ hasCardControls: true, open: true });
        expect(qa.added.quick).toEqual(expect.objectContaining({ after: qa.added.quick.before + 1, lastOpen: true }));
        expect(qa.added.service).toEqual(expect.objectContaining({ after: qa.added.service.before + 1, lastOpen: true }));
        expect(qa.added.location).toEqual(expect.objectContaining({ after: qa.added.location.before + 1, lastOpen: true }));
        expect(qa.previews.homeHeadline).toBe('QA homepage headline');
        expect(qa.previews.fleetTitle).toBe('QA Fleet Title');
        expect(qa.previews.heroDisplay).toBe('none');
        expect(qa.previews.secondaryDisplay).not.toBe('none');
    });

    test('each content section supports local controls, reloads and previews', async ({ page }) => {
        await loginToContentEditor(page);

        const qa = await page.evaluate(async () => {
            const results = [];
            const add = (section, name, ok, details = {}) => results.push({ section, name, ok: Boolean(ok), details });
            const text = (selector) => document.querySelector(selector)?.textContent.trim() || '';
            const value = (selector) => document.querySelector(selector)?.value || '';
            const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

            function collectionCount(rootId) {
                return document.querySelectorAll(`#${rootId} details[data-item-index]`).length;
            }

            function clickCollection(rootId, action, index = 0) {
                const before = collectionCount(rootId);
                const selector = action === 'add'
                    ? `#${rootId} [data-collection-action="add"]`
                    : `#${rootId} details[data-item-index="${index}"] [data-collection-action="${action}"]`;
                const button = document.querySelector(selector);
                if (!button) {
                    return { before, after: before, found: false, open: false };
                }

                button.click();
                const after = collectionCount(rootId);
                const targetIndex = action === 'add'
                    ? after - 1
                    : Math.min(index + (action === 'duplicate' ? 1 : 0), after - 1);

                return {
                    before,
                    after,
                    found: true,
                    open: Boolean(document.querySelector(`#${rootId} details[data-item-index="${targetIndex}"]`)?.open)
                };
            }

            function assertCollection(rootId, section) {
                const added = clickCollection(rootId, 'add');
                add(section, `${rootId} add opens new item`, added.found && added.after === added.before + 1 && added.open, added);

                const duplicated = clickCollection(rootId, 'duplicate', Math.max(0, added.after - 1));
                add(section, `${rootId} duplicate`, duplicated.found && duplicated.after === duplicated.before + 1 && duplicated.open, duplicated);

                const deleted = clickCollection(rootId, 'delete', Math.max(0, duplicated.after - 1));
                add(section, `${rootId} delete`, deleted.found && deleted.after === deleted.before - 1, deleted);
            }

            document.querySelector('#appearancePageSelect').value = '/fleet.html';
            document.querySelector('#appearancePageSelect').dispatchEvent(new Event('change', { bubbles: true }));
            add('Appearance', 'page select asks user to load selected page', /load it/i.test(text('#appearanceStatus')), { status: text('#appearanceStatus') });
            document.querySelector('#loadAppearanceButton').click();
            await wait(300);
            add('Appearance', 'load selected page fills browser title', value('#appearanceTitle').length > 0, { title: value('#appearanceTitle') });
            const faviconButton = document.querySelectorAll('#faviconOptionGrid [data-favicon-option]')[1] ||
                document.querySelector('#faviconOptionGrid [data-favicon-option]');
            faviconButton.click();
            const faviconHref = faviconButton.getAttribute('data-favicon-option');
            add('Appearance', 'favicon picker updates field and preview', value('#appearanceFaviconHref') === faviconHref &&
                document.querySelector('#appearanceFaviconLargePreview').getAttribute('src') === faviconHref, { faviconHref });
            document.querySelector('#appearanceTitle').value = 'QA Browser Title';
            document.querySelector('#appearanceTitle').dispatchEvent(new Event('input', { bubbles: true }));
            add('Appearance', 'browser tab preview updates', text('#appearanceTitlePreview') === 'QA Browser Title', { preview: text('#appearanceTitlePreview') });

            document.querySelector('#runConsistencyAuditButton').click();
            await wait(700);
            add('Audit', 'consistency audit populates metrics', text('#auditStatus') === 'Audit complete.' &&
                text('#auditSummaryGrid').includes('Pages'), { status: text('#auditStatus'), metrics: text('#auditSummaryGrid') });

            document.querySelector('#styleHeroTitleDesktopRem').value = '4.1';
            document.querySelector('#styleHeroTitleDesktopRem').dispatchEvent(new Event('input', { bubbles: true }));
            add('Style', 'hero title size updates preview', getComputedStyle(document.querySelector('#stylePreviewTitle')).fontSize !== '', {
                fontSize: getComputedStyle(document.querySelector('#stylePreviewTitle')).fontSize
            });
            document.querySelector('#styleShowHeroCta').checked = false;
            document.querySelector('#styleShowHeroCta').dispatchEvent(new Event('change', { bubbles: true }));
            add('Style', 'hero CTA toggle hides preview button', getComputedStyle(document.querySelector('#stylePreviewButton')).display === 'none', {
                display: getComputedStyle(document.querySelector('#stylePreviewButton')).display
            });
            document.querySelector('#styleShowBookingSecondary').checked = true;
            document.querySelector('#styleShowBookingSecondary').dispatchEvent(new Event('change', { bubbles: true }));
            add('Style', 'secondary booking toggle shows preview button', getComputedStyle(document.querySelector('#stylePreviewSecondaryButton')).display !== 'none', {
                display: getComputedStyle(document.querySelector('#stylePreviewSecondaryButton')).display
            });
            document.querySelector('#reloadStyleButton').click();
            add('Style', 'reload style restores saved values', /reloaded/i.test(text('#styleStatus')), { status: text('#styleStatus') });

            const oldHeadline = value('#heroHeadline');
            document.querySelector('#heroHeadline').value = 'QA Homepage Hero';
            document.querySelector('#heroHeadline').dispatchEvent(new Event('input', { bubbles: true }));
            add('Home', 'headline input updates preview', text('#previewHeadline') === 'QA Homepage Hero', { preview: text('#previewHeadline') });
            document.querySelector('#syncHomePreviewButton').click();
            add('Home', 'refresh keeps current form preview', text('#previewHeadline') === 'QA Homepage Hero', { preview: text('#previewHeadline') });
            document.querySelector('#reloadHomeButton').click();
            add('Home', 'reload restores saved headline', value('#heroHeadline') === oldHeadline, { current: value('#heroHeadline'), oldHeadline });

            const firstFleetTitle = document.querySelector('#fleetEditor [data-card-editor] [data-field="title"]');
            const oldFleetTitle = firstFleetTitle.value;
            firstFleetTitle.value = 'QA Fleet Card';
            firstFleetTitle.dispatchEvent(new Event('input', { bubbles: true }));
            add('Fleet', 'fleet title input updates preview', text('#fleetPreviewGrid h3') === 'QA Fleet Card', { preview: text('#fleetPreviewGrid h3') });
            document.querySelector('#syncFleetPreviewButton').click();
            add('Fleet', 'refresh keeps current fleet preview', text('#fleetPreviewGrid h3') === 'QA Fleet Card', { preview: text('#fleetPreviewGrid h3') });
            document.querySelector('#reloadFleetButton').click();
            add('Fleet', 'reload restores saved fleet title', document.querySelector('#fleetEditor [data-card-editor] [data-field="title"]').value === oldFleetTitle, {
                current: document.querySelector('#fleetEditor [data-card-editor] [data-field="title"]').value,
                oldFleetTitle
            });

            ['servicesLanes', 'servicesAdditionalRoutes', 'servicesGuideRoutes'].forEach((rootId) => {
                assertCollection(rootId, 'Services');
            });
            document.querySelector('#reloadServicesButton').click();
            add('Services', 'reload restores saved services data', /reloaded/i.test(text('#servicesStatus')), { status: text('#servicesStatus') });

            ['locationsHeroZones', 'locationsGuideCards', 'locationsZoneCards', 'locationsProcessSteps'].forEach((rootId) => {
                assertCollection(rootId, 'Locations');
            });
            document.querySelector('#reloadLocationsButton').click();
            add('Locations', 'reload restores saved locations data', /reloaded/i.test(text('#locationsStatus')), { status: text('#locationsStatus') });

            document.querySelector('.panel--advanced').open = true;
            document.querySelector('#pageSelect').value = '/fleet.html';
            document.querySelector('#pageSelect').dispatchEvent(new Event('change', { bubbles: true }));
            add('Advanced HTML', 'page select updates preview link and status', document.querySelector('#openPagePreviewLink').href.endsWith('/fleet.html') &&
                /load it/i.test(text('#pageStatus')), { href: document.querySelector('#openPagePreviewLink').href, status: text('#pageStatus') });
            document.querySelector('#loadPageButton').click();
            await wait(500);
            add('Advanced HTML', 'load page fills source editor', value('#pageSource').length > 1000 && text('#pageSourceMeta').includes('Lines:'), {
                characters: value('#pageSource').length,
                meta: text('#pageSourceMeta')
            });
            const oldPreviewSrc = document.querySelector('#pagePreviewFrame').src;
            document.querySelector('#reloadPagePreviewButton').click();
            add('Advanced HTML', 'reload preview refreshes iframe URL', document.querySelector('#pagePreviewFrame').src !== oldPreviewSrc, {
                before: oldPreviewSrc,
                after: document.querySelector('#pagePreviewFrame').src
            });

            return results;
        });

        const failures = qa.filter((item) => !item.ok);
        expect(failures).toEqual([]);
    });

    test('save buttons call the expected endpoints without writing files in the test', async ({ page }) => {
        const savePattern = /\/api\/admin\/content\/(header|appearance|style|home|fleet|services|locations|page)$/;
        const calls = [];

        await loginToContentEditor(page);
        await page.route(savePattern, async (route) => {
            const request = route.request();
            if (request.method() !== 'PUT') {
                await route.continue();
                return;
            }

            const endpoint = request.url().split('/api/admin/content/')[1].split(/[?#]/)[0];
            const body = request.postDataJSON();
            calls.push({ endpoint, body });

            const payloads = {
                header: { ok: true, header: body },
                appearance: {
                    ok: true,
                    appearance: {
                        settings: body.settings || { faviconHref: '/favicon.ico' },
                        faviconOptions: [{ href: '/favicon.ico', label: 'favicon.ico' }],
                        page: {
                            publicPath: body.publicPath || '/',
                            title: body.page?.title || 'QA title',
                            description: body.page?.description || 'QA description'
                        }
                    }
                },
                style: { ok: true, style: body },
                home: { ok: true, home: body },
                fleet: { ok: true, fleet: body.cards || [] },
                services: { ok: true, services: body },
                locations: { ok: true, locations: body },
                page: {
                    ok: true,
                    page: {
                        publicPath: body.path || '/',
                        filePath: 'index.html',
                        label: 'Home',
                        source: body.source || '<!doctype html><html><head></head><body></body></html>'
                    }
                }
            };

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(payloads[endpoint])
            });
        });

        async function clickAndExpectStatus(selector, statusSelector, pattern) {
            await page.locator(selector).scrollIntoViewIfNeeded();
            await page.click(selector);
            await expect(page.locator(statusSelector)).toContainText(pattern);
        }

        await clickAndExpectStatus('#saveHeaderButton', '#headerStatus', /saved/i);
        await clickAndExpectStatus('#saveAppearanceButton', '#appearanceStatus', /saved/i);
        await clickAndExpectStatus('#saveStyleButton', '#styleStatus', /saved/i);
        await clickAndExpectStatus('#homeForm button[type="submit"]', '#homeStatus', /saved/i);
        await clickAndExpectStatus('#saveFleetButton', '#fleetStatus', /saved/i);
        await clickAndExpectStatus('#saveServicesButton', '#servicesStatus', /saved/i);
        await clickAndExpectStatus('#saveLocationsButton', '#locationsStatus', /saved/i);

        await page.evaluate(() => {
            document.querySelector('.panel--advanced').open = true;
        });
        await page.click('#loadPageButton');
        await expect(page.locator('#pageSource')).not.toHaveValue('');
        await clickAndExpectStatus('#savePageButton', '#pageStatus', /saved/i);

        expect(calls.map((call) => call.endpoint)).toEqual([
            'header',
            'appearance',
            'style',
            'home',
            'fleet',
            'services',
            'locations',
            'page'
        ]);
    });
});
