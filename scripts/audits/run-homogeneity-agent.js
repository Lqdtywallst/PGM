const fs = require('fs');
const net = require('net');
const path = require('path');

const { chromium } = require('@playwright/test');

const {
    PUBLIC_PAGE_FILE_MAP
} = require('../../server/shared/public-page-map');
const {
    getViewportCoverageMatrix
} = require('../../server/design-system/design-system-contract');
const {
    startStaticServer,
    stopProcess
} = require('../../server/shared/site-audit-utils');
const {
    buildHomogeneityFindings,
    normalizeRoute,
    summarizeHomogeneityFindings
} = require('../../server/audits/homogeneity-audit-core');

const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'homogeneity-agent');
const DEFAULT_ROUTES = Object.freeze([
    '/',
    '/fleet.html',
    '/services.html',
    '/locations.html',
    '/contact.html',
    '/app/reserve/page.html',
    '/ferrari-rental-dubai.html',
    '/ferrari-296-gts-rental-dubai.html'
]);
const DEFAULT_VIEWPORTS = Object.freeze(['mobile-modern', 'desktop-wide']);
const ALL_VIEWPORTS = Object.freeze(getViewportCoverageMatrix('all'));

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function routeFileStem(route = '') {
    return normalizeRoute(route)
        .replace(/^\//, '')
        .replace(/[\/.]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'home';
}

function parseArgs(argv = []) {
    const args = {
        routes: [],
        viewports: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        scope: 'critical',
        strict: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--route' && argv[index + 1]) {
            args.routes.push(normalizeRoute(argv[index + 1]));
            index += 1;
            continue;
        }

        if (value === '--viewport' && argv[index + 1]) {
            args.viewports.push(String(argv[index + 1]).trim());
            index += 1;
            continue;
        }

        if (value === '--base-url' && argv[index + 1]) {
            args.baseUrl = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--output-dir' && argv[index + 1]) {
            args.outputDir = path.resolve(repoRoot, argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--scope' && argv[index + 1]) {
            args.scope = String(argv[index + 1]).trim() || args.scope;
            index += 1;
            continue;
        }

        if (value === '--strict') {
            args.strict = true;
        }
    }

    return args;
}

function resolveRoutes(args = {}) {
    if (args.routes?.length > 0) {
        return [...new Set(args.routes.map(normalizeRoute))];
    }

    if (args.scope === 'all') {
        return Object.keys(PUBLIC_PAGE_FILE_MAP).map(normalizeRoute);
    }

    return [...DEFAULT_ROUTES];
}

function resolveViewports(args = {}) {
    const requested = args.viewports?.length > 0 ? args.viewports : DEFAULT_VIEWPORTS;
    return requested.map((name) => {
        const viewport = ALL_VIEWPORTS.find((entry) => entry.name === name);
        if (!viewport) {
            throw new Error(`Unknown viewport: ${name}`);
        }

        return viewport;
    });
}

function findAvailablePort(startPort = 8095) {
    return new Promise((resolve, reject) => {
        function tryPort(port) {
            const server = net.createServer();
            server.once('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    tryPort(port + 1);
                    return;
                }
                reject(error);
            });
            server.once('listening', () => {
                server.close(() => resolve(port));
            });
            server.listen(port, '127.0.0.1');
        }

        tryPort(startPort);
    });
}

async function resolveBaseUrl(baseUrl = '') {
    if (baseUrl) {
        return {
            baseUrl: baseUrl.replace(/\/+$/, ''),
            serverHandle: null
        };
    }

    const port = await findAvailablePort();
    const resolvedBaseUrl = `http://127.0.0.1:${port}`;
    const serverHandle = await startStaticServer({
        projectRoot: repoRoot,
        port,
        baseUrl: resolvedBaseUrl,
        label: 'Homogeneity static server'
    });

    return {
        baseUrl: resolvedBaseUrl,
        serverHandle
    };
}

function publicUrl(baseUrl, route) {
    return `${baseUrl}${normalizeRoute(route)}`;
}

async function captureIfVisible(locator, outputPath) {
    try {
        if (await locator.count() === 0 || !(await locator.first().isVisible())) {
            return '';
        }

        await locator.first().screenshot({
            path: outputPath,
            animations: 'disabled',
            caret: 'hide'
        });

        return outputPath;
    } catch (error) {
        if (!/Target closed|element is not visible|not attached/i.test(String(error?.message || error))) {
            throw error;
        }
        return '';
    }
}

function safeFileSlug(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'dropdown';
}

async function collectHeaderDropdownStates(page, pageDir) {
    const dropdowns = [];
    const triggers = page.locator('.lab-header .lab-nav__item--has-panel .lab-nav__trigger');
    const triggerCount = Math.min(await triggers.count(), 6);

    for (let index = 0; index < triggerCount; index += 1) {
        const trigger = triggers.nth(index);

        if (!(await trigger.isVisible().catch(() => false))) {
            continue;
        }

        const label = (await trigger.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        const panelId = await trigger.getAttribute('aria-controls').catch(() => '');

        await trigger.click();
        await page.waitForTimeout(180);

        const panelLocator = panelId
            ? page.locator(`#${panelId}`).first()
            : trigger.locator('xpath=..').locator('.lab-nav__panel').first();
        const screenshotPath = await captureIfVisible(
            panelLocator,
            path.join(pageDir, `dropdown-${index + 1}-${safeFileSlug(label)}.png`)
        );

        const metrics = await page.evaluate(({ triggerIndex, label: fallbackLabel, panelId: controlledPanelId }) => {
            function isVisible(element) {
                if (!(element instanceof HTMLElement)) {
                    return false;
                }

                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    Number(style.opacity || 1) > 0 &&
                    rect.width > 0 &&
                    rect.height > 0;
            }

            function text(element) {
                return (element?.textContent || '').replace(/\s+/g, ' ').trim();
            }

            function rect(element) {
                if (!(element instanceof Element)) {
                    return null;
                }

                const value = element.getBoundingClientRect();
                return {
                    bottom: Number(value.bottom.toFixed(2)),
                    height: Number(value.height.toFixed(2)),
                    left: Number(value.left.toFixed(2)),
                    right: Number(value.right.toFixed(2)),
                    top: Number(value.top.toFixed(2)),
                    width: Number(value.width.toFixed(2))
                };
            }

            function parsePx(value) {
                const parsed = Number.parseFloat(String(value || '').replace('px', ''));
                return Number.isFinite(parsed) ? parsed : 0;
            }

            function classSignature(element) {
                return element instanceof HTMLElement
                    ? String(element.className || '').split(/\s+/).filter(Boolean).slice(0, 8).join('.')
                    : '';
            }

            function parseCssColor(value) {
                const raw = String(value || '').trim();

                if (!raw || raw === 'transparent') {
                    return { red: 0, green: 0, blue: 0, alpha: 0, luminance: 0 };
                }

                const match = raw.match(/rgba?\(([^)]+)\)/i);
                if (!match) {
                    return null;
                }

                const parts = match[1]
                    .split(/[\s,\/]+/)
                    .map((part) => part.trim())
                    .filter(Boolean);
                const red = Number.parseFloat(parts[0]);
                const green = Number.parseFloat(parts[1]);
                const blue = Number.parseFloat(parts[2]);
                const alpha = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]);

                if (![red, green, blue, alpha].every(Number.isFinite)) {
                    return null;
                }

                const channels = [red, green, blue].map((channel) => {
                    const normalized = channel / 255;
                    return normalized <= 0.03928
                        ? normalized / 12.92
                        : ((normalized + 0.055) / 1.055) ** 2.4;
                });
                const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);

                return {
                    red,
                    green,
                    blue,
                    alpha,
                    luminance: Number(luminance.toFixed(4))
                };
            }

            function extractCssColors(value) {
                return (String(value || '').match(/rgba?\([^)]+\)/gi) || [])
                    .map(parseCssColor)
                    .filter(Boolean);
            }

            function surfaceTone(color, hasGradient) {
                if (!color || color.alpha < 0.18) {
                    return hasGradient ? 'transparent-gradient' : 'transparent';
                }

                if (color.luminance <= 0.32) {
                    return hasGradient ? 'dark-gradient' : 'dark';
                }

                if (color.luminance >= 0.72) {
                    return 'light';
                }

                return 'muted';
            }

            function contrastRatio(left, right) {
                if (!left || !right) {
                    return null;
                }

                const lighter = Math.max(left.luminance, right.luminance);
                const darker = Math.min(left.luminance, right.luminance);
                return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
            }

            const triggers = Array.from(document.querySelectorAll('.lab-header .lab-nav__item--has-panel .lab-nav__trigger'));
            const trigger = triggers[triggerIndex] || null;
            const panel = controlledPanelId
                ? document.getElementById(controlledPanelId)
                : trigger?.closest('.lab-nav__item')?.querySelector('.lab-nav__panel');

            if (!(panel instanceof HTMLElement)) {
                return {
                    exists: false,
                    label: fallbackLabel
                };
            }

            const header = document.querySelector('.lab-header, .site-header, header');
            const style = window.getComputedStyle(panel);
            const backgroundColor = parseCssColor(style.backgroundColor);
            const imageColors = extractCssColors(style.backgroundImage);
            const dominantColor = (
                backgroundColor && backgroundColor.alpha >= 0.18
                    ? backgroundColor
                    : imageColors.find((color) => color.alpha >= 0.18) || backgroundColor
            );
            const hasGradient = /gradient/i.test(style.backgroundImage || '');
            const backdropFilter = `${style.backdropFilter || ''} ${style.webkitBackdropFilter || ''}`;
            const textCandidates = Array.from(panel.querySelectorAll('a, button, strong, span, p'))
                .filter((element) => element instanceof HTMLElement)
                .filter(isVisible)
                .filter((element) => text(element));
            const contrastValues = textCandidates
                .map((element) => parseCssColor(window.getComputedStyle(element).color))
                .map((color) => contrastRatio(color, dominantColor))
                .filter(Number.isFinite);
            const panelRect = rect(panel);
            const triggerRect = rect(trigger);
            const headerRect = rect(header);
            const firstCard = panel.querySelector('.lab-nav__card, a[href], button');

            return {
                exists: true,
                label: text(trigger) || fallbackLabel,
                triggerLabel: text(trigger) || fallbackLabel,
                panelId: panel.id || controlledPanelId || '',
                classSignature: classSignature(panel),
                cardCount: panel.querySelectorAll('.lab-nav__card, a[href], button').length,
                linkCount: panel.querySelectorAll('a[href]').length,
                imageCount: panel.querySelectorAll('img, svg').length,
                backgroundColor: style.backgroundColor || '',
                backgroundImage: style.backgroundImage === 'none' ? '' : String(style.backgroundImage || '').slice(0, 220),
                backgroundAlpha: dominantColor ? Number(dominantColor.alpha.toFixed(3)) : null,
                backgroundLuminance: dominantColor ? dominantColor.luminance : null,
                surfaceTone: surfaceTone(dominantColor, hasGradient),
                hasGradient,
                hasBackdropBlur: /blur\((?!0(?:px)?\))/i.test(backdropFilter),
                borderRadiusPx: Number(parsePx(style.borderTopLeftRadius).toFixed(2)),
                borderColor: style.borderColor || '',
                boxShadow: style.boxShadow && style.boxShadow !== 'none',
                minTextContrastRatio: contrastValues.length > 0 ? Number(Math.min(...contrastValues).toFixed(2)) : null,
                panelRect,
                firstCardRect: firstCard ? rect(firstCard) : null,
                triggerRect,
                topOffsetFromHeaderPx: panelRect && headerRect ? Number((panelRect.top - headerRect.bottom).toFixed(2)) : null,
                triggerToPanelGapPx: panelRect && triggerRect ? Number((panelRect.top - triggerRect.bottom).toFixed(2)) : null
            };
        }, {
            triggerIndex: index,
            label,
            panelId
        });

        dropdowns.push({
            ...metrics,
            screenshotPath
        });

        await page.keyboard.press('Escape').catch(() => {});
        await page.mouse.click(1, 1).catch(() => {});
        await page.waitForTimeout(80);
    }

    await page.evaluate(() => {
        document.querySelectorAll('.lab-header .js-nav-mega.is-open').forEach((item) => {
            item.classList.remove('is-open');
            const trigger = item.querySelector('.lab-nav__trigger');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }).catch(() => {});

    return dropdowns;
}

async function collectIdentityMetrics(page) {
    return page.evaluate(() => {
        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity || 1) > 0 &&
                rect.width > 0 &&
                rect.height > 0;
        }

        function firstVisible(selectors) {
            for (const selector of selectors) {
                const element = Array.from(document.querySelectorAll(selector)).find(isVisible);
                if (element) {
                    return element;
                }
            }
            return null;
        }

        function text(element) {
            return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function rect(element) {
            if (!(element instanceof HTMLElement)) {
                return null;
            }

            const value = element.getBoundingClientRect();
            return {
                x: Number(value.x.toFixed(2)),
                y: Number(value.y.toFixed(2)),
                width: Number(value.width.toFixed(2)),
                height: Number(value.height.toFixed(2)),
                top: Number(value.top.toFixed(2)),
                right: Number(value.right.toFixed(2)),
                bottom: Number(value.bottom.toFixed(2)),
                left: Number(value.left.toFixed(2))
            };
        }

        function parsePx(value) {
            const parsed = Number.parseFloat(String(value || '').replace('px', ''));
            return Number.isFinite(parsed) ? parsed : 0;
        }

        function classSignature(element) {
            return element instanceof HTMLElement
                ? String(element.className || '').split(/\s+/).filter(Boolean).slice(0, 8).join('.')
                : '';
        }

        function firstVisibleWithin(root, selectors) {
            if (!(root instanceof HTMLElement)) {
                return null;
            }

            for (const selector of selectors) {
                const element = Array.from(root.querySelectorAll(selector)).find(isVisible);
                if (element) {
                    return element;
                }
            }

            return null;
        }

        function gapBetween(left, right) {
            if (!left || !right) {
                return null;
            }

            return Number((right.left - left.right).toFixed(2));
        }

        function centerY(value) {
            return value ? value.top + (value.height / 2) : null;
        }

        function parseCssColor(value) {
            const raw = String(value || '').trim();

            if (!raw || raw === 'transparent') {
                return { red: 0, green: 0, blue: 0, alpha: 0, luminance: 0 };
            }

            const match = raw.match(/rgba?\(([^)]+)\)/i);
            if (!match) {
                return null;
            }

            const parts = match[1]
                .split(/[\s,\/]+/)
                .map((part) => part.trim())
                .filter(Boolean);
            const red = Number.parseFloat(parts[0]);
            const green = Number.parseFloat(parts[1]);
            const blue = Number.parseFloat(parts[2]);
            const alpha = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]);

            if (![red, green, blue, alpha].every(Number.isFinite)) {
                return null;
            }

            const channels = [red, green, blue].map((channel) => {
                const normalized = channel / 255;
                return normalized <= 0.03928
                    ? normalized / 12.92
                    : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);

            return {
                red,
                green,
                blue,
                alpha,
                luminance: Number(luminance.toFixed(4))
            };
        }

        function extractCssColors(value) {
            return (String(value || '').match(/rgba?\([^)]+\)/gi) || [])
                .map(parseCssColor)
                .filter(Boolean);
        }

        function extractLastLinearGradientMinAlpha(value) {
            const source = String(value || '');
            const linearStart = source.toLowerCase().lastIndexOf('linear-gradient');
            const alphaSource = linearStart >= 0 ? source.slice(linearStart) : source;
            const alphas = (alphaSource.match(/rgba?\([^)]+\)/gi) || [])
                .map(parseCssColor)
                .filter(Boolean)
                .map((color) => color.alpha)
                .filter(Number.isFinite);

            return alphas.length > 0 ? Number(Math.min(...alphas).toFixed(3)) : null;
        }

        function surfaceTone(color, hasGradient) {
            if (!color || color.alpha < 0.18) {
                return hasGradient ? 'transparent-gradient' : 'transparent';
            }

            if (color.luminance <= 0.32) {
                return hasGradient ? 'dark-gradient' : 'dark';
            }

            if (color.luminance >= 0.72) {
                return 'light';
            }

            return 'muted';
        }

        function collectHeaderSurface(header) {
            if (!(header instanceof HTMLElement)) {
                return { exists: false };
            }

            const style = window.getComputedStyle(header);
            const backgroundColor = parseCssColor(style.backgroundColor);
            const imageColors = extractCssColors(style.backgroundImage);
            const dominantColor = (
                backgroundColor && backgroundColor.alpha >= 0.18
                    ? backgroundColor
                    : imageColors.find((color) => color.alpha >= 0.18) || backgroundColor
            );
            const hasGradient = /gradient/i.test(style.backgroundImage || '');
            const backdropFilter = `${style.backdropFilter || ''} ${style.webkitBackdropFilter || ''}`;

            return {
                exists: true,
                position: style.position || '',
                backgroundColor: style.backgroundColor || '',
                backgroundImage: style.backgroundImage === 'none' ? '' : String(style.backgroundImage || '').slice(0, 220),
                backgroundAlpha: dominantColor ? Number(dominantColor.alpha.toFixed(3)) : null,
                backgroundMinAlpha: extractLastLinearGradientMinAlpha(style.backgroundImage || style.backgroundColor || ''),
                backgroundLuminance: dominantColor ? dominantColor.luminance : null,
                surfaceTone: surfaceTone(dominantColor, hasGradient),
                hasGradient,
                hasBackdropBlur: /blur\((?!0(?:px)?\))/i.test(backdropFilter),
                borderBottomWidthPx: Number(parsePx(style.borderBottomWidth).toFixed(2)),
                borderBottomColor: style.borderBottomColor || '',
                boxShadow: style.boxShadow && style.boxShadow !== 'none',
                rect: rect(header)
            };
        }

        function collectHeaderLayout(header) {
            if (!(header instanceof HTMLElement)) {
                return { exists: false };
            }

            const headerRect = rect(header);
            const inner = firstVisibleWithin(header, ['.lab-header__inner', '.site-header__inner']) || header;
            const brand = firstVisibleWithin(header, ['.lab-brand', '.header-brand']);
            const utility = firstVisibleWithin(header, ['.lab-header__utility']);
            const navWrap = firstVisibleWithin(header, ['.lab-header__nav']);
            const nav = firstVisibleWithin(header, ['.lab-nav', 'nav[aria-label="Main navigation"]']);
            const reserve = firstVisibleWithin(header, ['.lab-reserve', 'a[href*="reserve"]']);
            const toggle = firstVisibleWithin(header, ['.lab-mobile-toggle', '[aria-controls="lab-mobile-drawer"]']);
            const innerRect = rect(inner);
            const brandRect = rect(brand);
            const utilityRect = rect(utility);
            const navWrapRect = rect(navWrap);
            const navRect = rect(nav);
            const reserveRect = rect(reserve);
            const toggleRect = rect(toggle);
            const mode = (toggleRect || !navRect || window.innerWidth <= 860) ? 'mobile' : 'desktop';
            const orderedComponents = [
                ['brand', brandRect],
                ['utility', utilityRect],
                ['nav', navRect],
                ['reserve', reserveRect],
                ['toggle', toggleRect]
            ]
                .filter(([, value]) => value)
                .sort((left, right) => left[1].left - right[1].left)
                .map(([name]) => name);
            const centers = [brandRect, utilityRect, navRect, reserveRect, toggleRect]
                .map(centerY)
                .filter(Number.isFinite);
            const minCenter = centers.length > 0 ? Math.min(...centers) : null;
            const maxCenter = centers.length > 0 ? Math.max(...centers) : null;
            const componentRights = [brandRect, utilityRect, navWrapRect, navRect, reserveRect, toggleRect]
                .filter(Boolean)
                .map((value) => value.right);
            const componentLefts = [brandRect, utilityRect, navWrapRect, navRect, reserveRect, toggleRect]
                .filter(Boolean)
                .map((value) => value.left);
            const overflowRight = componentRights.length > 0 ? Math.max(0, Math.max(...componentRights) - window.innerWidth) : 0;
            const overflowLeft = componentLefts.length > 0 ? Math.max(0, 0 - Math.min(...componentLefts)) : 0;

            return {
                exists: true,
                mode,
                headerRect,
                innerRect,
                brandRect,
                utilityRect,
                navWrapRect,
                navRect,
                reserveRect,
                toggleRect,
                headerHeightPx: headerRect?.height ?? null,
                innerHeightPx: innerRect?.height ?? null,
                orderSignature: orderedComponents.join('|'),
                brandToUtilityGapPx: gapBetween(brandRect, utilityRect),
                utilityToNavGapPx: gapBetween(utilityRect, navWrapRect || navRect),
                navToReserveGapPx: gapBetween(navRect, reserveRect),
                brandToNavGapPx: gapBetween(brandRect, navWrapRect || navRect),
                brandToToggleGapPx: gapBetween(brandRect, toggleRect),
                leftInsetPx: brandRect && innerRect ? Number((brandRect.left - innerRect.left).toFixed(2)) : null,
                rightInsetPx: innerRect && componentRights.length > 0
                    ? Number((innerRect.right - Math.max(...componentRights)).toFixed(2))
                    : null,
                verticalCenterSpreadPx: minCenter !== null && maxCenter !== null
                    ? Number((maxCenter - minCenter).toFixed(2))
                    : null,
                horizontalOverflowPx: Number(Math.max(overflowLeft, overflowRight).toFixed(2))
            };
        }

        function brandSurface(root) {
            if (!(root instanceof HTMLElement)) {
                return { exists: false };
            }

            const copyRoot = root.querySelector('.lab-brand__copy, .lab-mobile-drawer__brand-copy') || root;
            const title = copyRoot.querySelector('strong') || root.querySelector('strong');
            const subtitle = Array.from(copyRoot.children || []).find((child) => (
                child !== title &&
                child instanceof HTMLElement &&
                !child.matches('[aria-hidden="true"], strong') &&
                text(child)
            )) || null;
            const logo = root.querySelector('img');
            const crest = root.querySelector('.lab-brand__crest, .lab-mobile-drawer__crest, .site-v2-footer__crest') || logo?.parentElement;
            const titleStyle = title ? window.getComputedStyle(title) : null;
            const subtitleStyle = subtitle ? window.getComputedStyle(subtitle) : null;

            return {
                exists: true,
                classSignature: classSignature(root),
                title: text(title),
                subtitle: text(subtitle),
                logoSrc: logo ? (logo.currentSrc || logo.src || logo.getAttribute('src') || '') : '',
                rootRect: rect(root),
                logoRect: rect(crest || logo),
                titleFontFamily: titleStyle?.fontFamily || '',
                titleFontSizePx: Number(parsePx(titleStyle?.fontSize).toFixed(2)),
                titleLetterSpacingPx: Number(parsePx(titleStyle?.letterSpacing).toFixed(2)),
                titleTextTransform: titleStyle?.textTransform || '',
                titleColor: titleStyle?.color || '',
                subtitleFontFamily: subtitleStyle?.fontFamily || '',
                subtitleFontSizePx: Number(parsePx(subtitleStyle?.fontSize).toFixed(2)),
                subtitleLetterSpacingPx: Number(parsePx(subtitleStyle?.letterSpacing).toFixed(2)),
                subtitleColor: subtitleStyle?.color || ''
            };
        }

        function actionSurface(root) {
            if (!(root instanceof HTMLElement) || !isVisible(root)) {
                return { exists: false };
            }

            const style = window.getComputedStyle(root);

            return {
                exists: true,
                text: text(root),
                classSignature: classSignature(root),
                rect: rect(root),
                fontFamily: style.fontFamily || '',
                fontSizePx: Number(parsePx(style.fontSize).toFixed(2)),
                fontWeight: style.fontWeight || '',
                letterSpacingPx: Number(parsePx(style.letterSpacing).toFixed(2)),
                color: style.color || '',
                backgroundColor: style.backgroundColor || '',
                backgroundImage: style.backgroundImage === 'none' ? '' : String(style.backgroundImage || '').slice(0, 220),
                borderRadiusPx: Number(parsePx(style.borderTopLeftRadius).toFixed(2)),
                minHeightPx: Number(parsePx(style.minHeight || style.height).toFixed(2)),
                boxShadow: style.boxShadow && style.boxShadow !== 'none'
            };
        }

        function textSurface(element) {
            if (!(element instanceof HTMLElement)) {
                return { exists: false };
            }

            const style = window.getComputedStyle(element);

            return {
                exists: true,
                selector: element.tagName.toLowerCase(),
                text: text(element).slice(0, 120),
                classSignature: classSignature(element),
                fontFamily: style.fontFamily || '',
                fontSizePx: Number(parsePx(style.fontSize).toFixed(2)),
                fontWeight: style.fontWeight || '',
                lineHeightPx: Number(parsePx(style.lineHeight).toFixed(2)),
                letterSpacingPx: Number(parsePx(style.letterSpacing).toFixed(2)),
                textTransform: style.textTransform || '',
                color: style.color || ''
            };
        }

        function normalizeFontFamily(value) {
            return String(value || '')
                .split(',')
                .map((token) => token.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
                .filter(Boolean)[0] || '';
        }

        function collectTypographyInventory() {
            const ignoredSelectors = 'header, nav, footer, .lab-mobile-drawer, .lab-nav__panel, [aria-hidden="true"]';
            const candidates = Array.from(document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a, main button, main label, main span'))
                .filter((element) => element instanceof HTMLElement)
                .filter((element) => isVisible(element))
                .filter((element) => !element.closest(ignoredSelectors))
                .map((element) => {
                    const style = window.getComputedStyle(element);
                    const family = normalizeFontFamily(style.fontFamily || '');
                    return {
                        family,
                        tag: element.tagName.toLowerCase(),
                        classSignature: classSignature(element),
                        text: text(element).slice(0, 80)
                    };
                })
                .filter((entry) => entry.family && entry.text.length > 0)
                .slice(0, 80);
            const counts = new Map();

            for (const entry of candidates) {
                counts.set(entry.family, (counts.get(entry.family) || 0) + 1);
            }

            const families = [...counts.entries()]
                .sort((left, right) => right[1] - left[1])
                .map(([family, count]) => ({ family, count }));

            return {
                totalElements: candidates.length,
                uniqueFontFamilies: families.map((entry) => entry.family),
                familyCounts: families,
                samples: candidates.slice(0, 16)
            };
        }

        function primaryText(element) {
            const clone = element.cloneNode(true);
            clone.querySelectorAll('svg, img, small, span[aria-hidden="true"]').forEach((child) => child.remove());
            return text(clone);
        }

        function topLevelNavTargets(nav) {
            if (!(nav instanceof HTMLElement)) {
                return [];
            }

            return Array.from(nav.querySelectorAll('a[href], button'))
                .filter((element) => {
                    if (element.closest('.lab-nav__panel')) {
                        return false;
                    }

                    const parentItem = element.closest('.lab-nav__item');
                    return isVisible(element) && (!parentItem || parentItem.parentElement === nav);
                })
                .slice(0, 12);
        }

        function navSignature(labels) {
            return labels.map((label) => label.replace(/\s+/g, ' ').trim()).filter(Boolean).join('|');
        }

        function inferHeaderFamily(header) {
            if (header?.classList?.contains('lab-header')) {
                return 'lab-header';
            }

            if (document.querySelector('.site-header')) {
                return 'site-header';
            }

            return header ? 'generic-header' : '';
        }

        function inferHeaderVariant(header, hasMegaNav, utilityCount) {
            if (!(header instanceof HTMLElement)) {
                return '';
            }

            if (header.classList.contains('lab-header--vehicle') && hasMegaNav) {
                return 'lab_vehicle_mega';
            }

            if (hasMegaNav && utilityCount > 0) {
                return 'lab_mega_utility';
            }

            if (hasMegaNav) {
                return 'lab_mega';
            }

            return inferHeaderFamily(header);
        }

        const header = firstVisible(['.lab-header', '.site-header', 'header']);
        const headerBrandRoot = firstVisible(['.lab-brand', '.header-brand']);
        const drawerBrandRoot = firstVisible(['.lab-mobile-drawer.is-open .lab-mobile-drawer__brand', '.lab-mobile-drawer__brand']);
        const mainNav = firstVisible(['nav[aria-label="Main navigation"]', '.lab-header .lab-nav']);
        const headerReserve = header ? firstVisibleWithin(header, ['.lab-reserve', 'a[href*="reserve"]']) : null;
        const heading = firstVisible(['main h1', 'h1']);
        const lead = firstVisible([
            '.hero-lab__lead',
            '.about-hero__lead',
            '.locations-hero__lead',
            '.services-hero__lead',
            '.local-guide-hero__lead',
            '.service-detail-hero__lead',
            '.vehicle-hero__lead',
            '.contact-hero__lead',
            '.reserve-page-intro__copy p',
            'main p'
        ]);
        const bodyText = firstVisible(['main p', 'main li', 'main label']);
        const cta = firstVisible([
            '.hero-lab__actions a',
            '.hero-lab__actions button',
            '.about-hero__actions a',
            '.services-hero__feature-actions a',
            '.locations-hero__actions a',
            '.local-guide-hero__actions a',
            '.service-detail-actions a',
            '.vehicle-hero__actions a',
            '.contact-hero__actions a',
            '.reserve-container button',
            'main a.btn',
            'main button',
            'main a[href]'
        ]);
        const headerUtilityTargets = header
            ? Array.from(header.querySelectorAll('.lab-header__utility-link')).filter(isVisible)
            : [];
        const navLabels = topLevelNavTargets(mainNav).map(primaryText).filter(Boolean);
        const hasMegaNav = Boolean(document.querySelector('.lab-nav__panel'));

        return {
            headerFamily: inferHeaderFamily(header),
            headerVariant: inferHeaderVariant(header, hasMegaNav, headerUtilityTargets.length),
            headerClassSignature: classSignature(header),
            primaryNavLabels: navLabels,
            primaryNavSignature: navSignature(navLabels),
            headerSurface: collectHeaderSurface(header),
            headerLayout: collectHeaderLayout(header),
            headerBrand: brandSurface(headerBrandRoot),
            headerCta: actionSurface(headerReserve),
            drawerBrand: brandSurface(drawerBrandRoot),
            typography: {
                heading: textSurface(heading),
                lead: textSurface(lead),
                body: textSurface(bodyText),
                cta: textSurface(cta)
            },
            typographyInventory: collectTypographyInventory(),
            drawerOpen: Boolean(document.querySelector('.lab-mobile-drawer.is-open')),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };
    });
}

async function auditRouteViewport({ browser, baseUrl, route, viewport, runDir }) {
    const pageDir = path.join(runDir, routeFileStem(route), viewport.name);
    ensureDir(pageDir);

    const context = await browser.newContext({
        viewport: {
            width: viewport.width,
            height: viewport.height
        },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor,
        reducedMotion: 'reduce'
    });
    const page = await context.newPage();

    try {
        await page.goto(publicUrl(baseUrl, route), { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(180);

        const viewportScreenshotPath = path.join(pageDir, 'viewport.png');
        await page.screenshot({
            path: viewportScreenshotPath,
            fullPage: false,
            animations: 'disabled'
        });

        const headerScreenshotPath = await captureIfVisible(
            page.locator('.lab-header, .site-header, header'),
            path.join(pageDir, 'header.png')
        );

        const headerDropdowns = await collectHeaderDropdownStates(page, pageDir);

        let drawerScreenshotPath = '';
        const toggle = page.locator('.lab-mobile-toggle, [aria-controls="lab-mobile-drawer"]').first();
        if (await toggle.count() > 0 && await toggle.isVisible()) {
            await toggle.click();
            await page.waitForTimeout(220);
            drawerScreenshotPath = await captureIfVisible(
                page.locator('.lab-mobile-drawer.is-open .lab-mobile-drawer__panel, .lab-mobile-drawer__panel'),
                path.join(pageDir, 'mobile-drawer.png')
            );
        }

        const metrics = await collectIdentityMetrics(page);

        return {
            route: normalizeRoute(route),
            viewport: viewport.name,
            metrics,
            ...metrics,
            viewportScreenshotPath,
            headerScreenshotPath,
            headerDropdowns,
            headerDropdownScreenshotPath: headerDropdowns.find((entry) => entry.screenshotPath)?.screenshotPath || '',
            drawerScreenshotPath
        };
    } finally {
        await context.close();
    }
}

function buildMarkdownReport(report) {
    const lines = [
        '# Homogeneity Agent Report',
        '',
        `Generated at: ${report.generatedAt}`,
        `Base URL: ${report.baseUrl}`,
        `Mode: ${report.strict ? 'strict' : 'advisory'}`,
        '',
        '## Summary',
        '',
        `- pages checked: ${report.pages.length}`,
        `- findings: ${report.summary.total}`,
        `- high: ${report.summary.high}`,
        `- medium: ${report.summary.medium}`,
        `- low: ${report.summary.low}`,
        ''
    ];

    if (report.findings.length === 0) {
        lines.push('No homogeneity drift detected in the audited scope.');
        lines.push('');
        return `${lines.join('\n')}\n`;
    }

    lines.push('## Findings');
    lines.push('');

    for (const finding of report.findings) {
        lines.push(`### ${finding.route} - ${finding.viewport} - ${finding.area}`);
        lines.push('');
        lines.push(`- severity: ${finding.severity}`);
        lines.push(`- category: ${finding.category}`);
        lines.push(`- issue: ${finding.message}`);
        lines.push(`- evidence: ${finding.evidence}`);
        lines.push(`- recommendation: ${finding.recommendation}`);
        if (finding.screenshotPath) {
            lines.push(`- screenshot: ${finding.screenshotPath}`);
        }
        lines.push('');
    }

    return `${lines.join('\n')}\n`;
}

async function runHomogeneityAgent(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : { ...parseArgs([]), ...options };
    const routes = resolveRoutes(args);
    const viewports = resolveViewports(args);
    const generatedAt = new Date().toISOString();
    const runDir = args.outputDir || path.join(artifactsRoot, timestampSlug(new Date(generatedAt)));

    ensureDir(runDir);

    const { baseUrl, serverHandle } = await resolveBaseUrl(args.baseUrl || '');
    const browser = await chromium.launch({ headless: true });

    try {
        const pages = [];

        for (const route of routes) {
            for (const viewport of viewports) {
                pages.push(await auditRouteViewport({
                    browser,
                    baseUrl,
                    route,
                    viewport,
                    runDir
                }));
            }
        }

        const findings = buildHomogeneityFindings(pages);
        const summary = summarizeHomogeneityFindings(findings);
        const report = {
            generatedAt,
            baseUrl,
            strict: Boolean(args.strict),
            routes,
            viewports: viewports.map((viewport) => viewport.name),
            summary,
            findings,
            pages
        };

        fs.writeFileSync(path.join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
        fs.writeFileSync(path.join(runDir, 'report.md'), buildMarkdownReport(report), 'utf8');

        return {
            runDir,
            report,
            shouldFail: Boolean(args.strict && summary.high > 0)
        };
    } finally {
        await browser.close();

        if (serverHandle?.child) {
            stopProcess(serverHandle.child);
        }
    }
}

async function main() {
    const { runDir, report, shouldFail } = await runHomogeneityAgent({ argv: process.argv.slice(2) });

    console.log(`Homogeneity agent completed: ${runDir}`);
    console.log(`pages=${report.pages.length} findings=${report.summary.total} high=${report.summary.high} medium=${report.summary.medium} low=${report.summary.low}`);

    if (shouldFail) {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Homogeneity agent failed.');
        console.error(error.stack || error.message || String(error));
        process.exit(1);
    });
}

module.exports = {
    auditRouteViewport,
    buildMarkdownReport,
    parseArgs,
    resolveRoutes,
    resolveViewports,
    runHomogeneityAgent
};
