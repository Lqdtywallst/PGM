const path = require('path');

const STYLE_OVERRIDES_HREF = '/css/admin-style-overrides.css?v=20260510-brand-tokens1';
const STYLE_OVERRIDES_RELATIVE_PATH = path.join('css', 'admin-style-overrides.css');

const FONT_STACKS = new Set([
    "'Manrope', system-ui, sans-serif",
    "'Inter', system-ui, sans-serif",
    "'Montserrat', system-ui, sans-serif",
    "'El Messiri', 'Cormorant Garamond', serif",
    "'Cormorant Garamond', Georgia, serif",
    "Georgia, 'Times New Roman', serif"
]);

const DEFAULT_STYLE_EDITOR_STATE = {
    global: {
        fontSans: "'Manrope', system-ui, sans-serif",
        fontDisplay: "'El Messiri', 'Cormorant Garamond', serif",
        accentColor: '#d8b45f',
        headerBackground: '#08090c',
        buttonBackground: '#d8b45f',
        buttonTextColor: '#17120d',
        buttonRadiusPx: 999,
        cardRadiusPx: 8
    },
    brandPages: {
        heroHeightWideRem: 26.5,
        heroHeightLaptopRem: 22.4,
        heroHeightMobileRem: 25,
        heroGapRem: 1,
        heroTitleDesktopRem: 3.05,
        heroTitleMobileRem: 3.2,
        heroLeadSizeRem: 0.9,
        bookingMinWidthPx: 300,
        bookingPaddingRem: 1.25,
        bookingPriceSizeRem: 2.75,
        borderRadiusPx: 8,
        buttonBackground: '#15191f',
        buttonTextColor: '#ffffff',
        overlayDarkness: 0.9,
        showHeroCta: true,
        showBookingSecondary: false
    }
};

function clampNumber(value, fallback, min, max) {
    const parsed = Number.parseFloat(String(value ?? ''));

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(Math.max(parsed, min), max);
}

function normalizeBoolean(value, fallback) {
    if (value === true || value === false) {
        return value;
    }

    if (value === 'true') {
        return true;
    }

    if (value === 'false') {
        return false;
    }

    return fallback;
}

function normalizeColor(value, fallback) {
    const normalized = String(value ?? '').trim();

    if (/^#[0-9a-f]{6}$/i.test(normalized)) {
        return normalized.toLowerCase();
    }

    if (/^#[0-9a-f]{3}$/i.test(normalized)) {
        return `#${normalized.slice(1).split('').map((digit) => `${digit}${digit}`).join('')}`.toLowerCase();
    }

    return fallback;
}

function normalizeFontStack(value, fallback) {
    const normalized = String(value ?? '').trim();
    return FONT_STACKS.has(normalized) ? normalized : fallback;
}

function normalizeStyleEditorState(payload = {}) {
    const defaults = DEFAULT_STYLE_EDITOR_STATE;
    const global = payload.global || {};
    const brandPages = payload.brandPages || {};

    return {
        global: {
            fontSans: normalizeFontStack(global.fontSans, defaults.global.fontSans),
            fontDisplay: normalizeFontStack(global.fontDisplay, defaults.global.fontDisplay),
            accentColor: normalizeColor(global.accentColor, defaults.global.accentColor),
            headerBackground: normalizeColor(global.headerBackground, defaults.global.headerBackground),
            buttonBackground: normalizeColor(global.buttonBackground, defaults.global.buttonBackground),
            buttonTextColor: normalizeColor(global.buttonTextColor, defaults.global.buttonTextColor),
            buttonRadiusPx: clampNumber(global.buttonRadiusPx, defaults.global.buttonRadiusPx, 0, 999),
            cardRadiusPx: clampNumber(global.cardRadiusPx, defaults.global.cardRadiusPx, 0, 42)
        },
        brandPages: {
            heroHeightWideRem: clampNumber(brandPages.heroHeightWideRem, defaults.brandPages.heroHeightWideRem, 18, 44),
            heroHeightLaptopRem: clampNumber(brandPages.heroHeightLaptopRem, defaults.brandPages.heroHeightLaptopRem, 16, 38),
            heroHeightMobileRem: clampNumber(brandPages.heroHeightMobileRem, defaults.brandPages.heroHeightMobileRem, 18, 38),
            heroGapRem: clampNumber(brandPages.heroGapRem, defaults.brandPages.heroGapRem, 0.4, 3),
            heroTitleDesktopRem: clampNumber(brandPages.heroTitleDesktopRem, defaults.brandPages.heroTitleDesktopRem, 1.7, 5),
            heroTitleMobileRem: clampNumber(brandPages.heroTitleMobileRem, defaults.brandPages.heroTitleMobileRem, 1.8, 4.4),
            heroLeadSizeRem: clampNumber(brandPages.heroLeadSizeRem, defaults.brandPages.heroLeadSizeRem, 0.72, 1.35),
            bookingMinWidthPx: clampNumber(brandPages.bookingMinWidthPx, defaults.brandPages.bookingMinWidthPx, 260, 460),
            bookingPaddingRem: clampNumber(brandPages.bookingPaddingRem, defaults.brandPages.bookingPaddingRem, 0.8, 2.4),
            bookingPriceSizeRem: clampNumber(brandPages.bookingPriceSizeRem, defaults.brandPages.bookingPriceSizeRem, 1.8, 4.4),
            borderRadiusPx: clampNumber(brandPages.borderRadiusPx, defaults.brandPages.borderRadiusPx, 0, 40),
            buttonBackground: normalizeColor(brandPages.buttonBackground, defaults.brandPages.buttonBackground),
            buttonTextColor: normalizeColor(brandPages.buttonTextColor, defaults.brandPages.buttonTextColor),
            overlayDarkness: clampNumber(brandPages.overlayDarkness, defaults.brandPages.overlayDarkness, 0.35, 0.95),
            showHeroCta: normalizeBoolean(brandPages.showHeroCta, defaults.brandPages.showHeroCta),
            showBookingSecondary: normalizeBoolean(brandPages.showBookingSecondary, defaults.brandPages.showBookingSecondary)
        }
    };
}

function toPx(value) {
    return `${Number(value).toFixed(2).replace(/\.?0+$/, '')}px`;
}

function toRem(value) {
    return `${Number(value).toFixed(2).replace(/\.?0+$/, '')}rem`;
}

function hexToRgb(color) {
    const hex = normalizeColor(color, '#000000').slice(1);
    return {
        red: Number.parseInt(hex.slice(0, 2), 16),
        green: Number.parseInt(hex.slice(2, 4), 16),
        blue: Number.parseInt(hex.slice(4, 6), 16)
    };
}

function rgba(color, alpha) {
    const rgb = hexToRgb(color);
    return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`;
}

function renderStyleOverridesCss(payload = {}) {
    const state = normalizeStyleEditorState(payload);
    const global = state.global;
    const brandPages = state.brandPages;
    const overlayRgb = hexToRgb('#060708');
    const overlaySoft = Math.max(0.08, brandPages.overlayDarkness - 0.78).toFixed(2);
    const overlayMid = Math.max(0.22, brandPages.overlayDarkness - 0.42).toFixed(2);
    const overlaySide = Math.max(0.16, brandPages.overlayDarkness - 0.2).toFixed(2);

    return `/* Generated by the PGM admin Style editor. Do not edit manually. */
@import url("./brand-tokens.css");
:root {
    --lab-font-sans: ${global.fontSans};
    --lab-font-display: ${global.fontDisplay};
    --lab-accent: ${global.accentColor};
    --lab-accent-soft: ${rgba(global.accentColor, 0.72)};
    --editor-accent-color: ${global.accentColor};
    --editor-header-background: ${global.headerBackground};
    --editor-button-background: ${global.buttonBackground};
    --editor-button-text: ${global.buttonTextColor};
    --editor-button-radius: ${toPx(global.buttonRadiusPx)};
    --editor-card-radius: ${toPx(global.cardRadiusPx)};
    --editor-brand-hero-height-wide: ${toRem(brandPages.heroHeightWideRem)};
    --editor-brand-hero-height-laptop: ${toRem(brandPages.heroHeightLaptopRem)};
    --editor-brand-hero-height-mobile: ${toRem(brandPages.heroHeightMobileRem)};
    --editor-brand-hero-gap: ${toRem(brandPages.heroGapRem)};
    --editor-brand-hero-title-desktop: ${toRem(brandPages.heroTitleDesktopRem)};
    --editor-brand-hero-title-mobile: ${toRem(brandPages.heroTitleMobileRem)};
    --editor-brand-hero-lead-size: ${toRem(brandPages.heroLeadSizeRem)};
    --editor-brand-booking-min-width: ${toPx(brandPages.bookingMinWidthPx)};
    --editor-brand-booking-padding: ${toRem(brandPages.bookingPaddingRem)};
    --editor-brand-booking-price-size: ${toRem(brandPages.bookingPriceSizeRem)};
    --editor-brand-radius: ${toPx(brandPages.borderRadiusPx)};
    --editor-brand-button-background: ${brandPages.buttonBackground};
    --editor-brand-button-text: ${brandPages.buttonTextColor};
    --editor-brand-overlay-soft: rgba(${overlayRgb.red}, ${overlayRgb.green}, ${overlayRgb.blue}, ${overlaySoft});
    --editor-brand-overlay-mid: rgba(${overlayRgb.red}, ${overlayRgb.green}, ${overlayRgb.blue}, ${overlayMid});
    --editor-brand-overlay-strong: rgba(${overlayRgb.red}, ${overlayRgb.green}, ${overlayRgb.blue}, ${brandPages.overlayDarkness.toFixed(2)});
    --editor-brand-overlay-side: rgba(${overlayRgb.red}, ${overlayRgb.green}, ${overlayRgb.blue}, ${overlaySide});
}

body {
    font-family: var(--lab-font-sans);
}

.hero-lab__title,
.hero-lab__launcher h2,
.section-heading,
.section-title,
.lab-section-title,
.fleet-preview-card h3,
.vehicle-section__heading h2 {
    font-family: var(--lab-font-display);
}

.lab-header,
.home-page .lab-header,
.home-page .lab-header.is-scrolled,
.fleet-page .lab-header,
.services-page .lab-header,
.contact-page .lab-header,
.reservation-lookup-page .lab-header,
.vehicle-page .lab-header,
.reserve-page .lab-header,
.vehicle-page--mother-base header.site-header {
    background: var(--editor-header-background) !important;
    border-bottom: 0 !important;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(14px) saturate(135%);
    -webkit-backdrop-filter: blur(14px) saturate(135%);
}

.lab-header::after,
.home-page .lab-header::after,
.home-page .lab-header.is-scrolled::after,
.fleet-page .lab-header::after,
.services-page .lab-header::after,
.contact-page .lab-header::after,
.reservation-lookup-page .lab-header::after,
.vehicle-page .lab-header::after,
.reserve-page .lab-header::after {
    opacity: 1 !important;
    background: linear-gradient(90deg, rgba(241, 226, 189, 0), rgba(241, 226, 189, 0.12), rgba(241, 226, 189, 0)) !important;
}

.vehicle-page .lab-nav__panel,
.reserve-page .lab-nav__panel,
.contact-page .lab-nav__panel,
.reservation-lookup-page .lab-nav__panel {
    background:
        linear-gradient(180deg, var(--lab-cool-panel-start, rgba(18, 29, 44, 0.48)) 0%, var(--lab-cool-panel-end, rgba(8, 15, 25, 0.58)) 100%),
        radial-gradient(circle at 18% -10%, var(--lab-cool-glass-top, rgba(245, 250, 255, 0.24)), rgba(255, 255, 255, 0) 34%),
        radial-gradient(circle at 100% 12%, var(--lab-cool-glass-mid, rgba(165, 190, 220, 0.14)), rgba(255, 255, 255, 0) 30%),
        radial-gradient(circle at 15% 112%, var(--lab-cool-glass-bottom, rgba(56, 87, 123, 0.14)), rgba(255, 255, 255, 0) 42%) !important;
    box-shadow:
        0 26px 64px var(--lab-cool-lens-shadow),
        0 12px 26px rgba(23, 43, 69, 0.16),
        inset 0 1px 0 rgba(255, 255, 255, 0.22),
        inset 0 -1px 0 rgba(156, 182, 212, 0.08) !important;
}

.lab-nav a.lab-nav__card,
.contact-page .lab-nav a.lab-nav__card,
.reservation-lookup-page .lab-nav a.lab-nav__card,
.vehicle-page .lab-nav a.lab-nav__card,
.reserve-page .lab-nav a.lab-nav__card {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.9rem;
    width: 100%;
    min-height: 2.8rem;
    padding: 0.72rem 0.84rem;
    color: var(--lab-text, #f5f1e8);
    font-size: inherit;
}

@media (min-width: 861px) {
    .lab-header__inner,
    .contact-page .lab-header__inner,
    .reservation-lookup-page .lab-header__inner,
    .vehicle-page .lab-header__inner,
    .reserve-page .lab-header__inner {
        justify-content: space-between !important;
    }

    .lab-header__utility,
    .contact-page .lab-header__utility,
    .reservation-lookup-page .lab-header__utility,
    .vehicle-page .lab-header__utility,
    .reserve-page .lab-header__utility {
        margin-left: auto !important;
    }
}

@media (min-width: 1541px) {
    .lab-brand__crest,
    .contact-page .lab-brand__crest,
    .reservation-lookup-page .lab-brand__crest,
    .vehicle-page .lab-brand__crest,
    .reserve-page .lab-brand__crest {
        flex: 0 0 62px;
        width: 62px;
        border-radius: 18px;
    }
}

@media (min-width: 861px) and (max-width: 1540px) {
    .lab-header__inner,
    .contact-page .lab-header__inner,
    .reservation-lookup-page .lab-header__inner,
    .vehicle-page .lab-header__inner,
    .reserve-page .lab-header__inner {
        gap: 1.25rem !important;
    }

    .lab-header__nav,
    .contact-page .lab-header__nav,
    .reservation-lookup-page .lab-header__nav,
    .vehicle-page .lab-header__nav,
    .reserve-page .lab-header__nav {
        gap: 0.75rem !important;
    }

    .lab-header__utility-link,
    .contact-page .lab-header__utility-link,
    .reservation-lookup-page .lab-header__utility-link,
    .vehicle-page .lab-header__utility-link,
    .reserve-page .lab-header__utility-link {
        width: 38px !important;
        height: 38px !important;
        min-height: 38px !important;
        padding: 0 !important;
    }

    .lab-brand__crest,
    .contact-page .lab-brand__crest,
    .reservation-lookup-page .lab-brand__crest,
    .vehicle-page .lab-brand__crest,
    .reserve-page .lab-brand__crest {
        flex: 0 0 48px;
        width: 48px;
        border-radius: 14px;
    }
}

@media (max-width: 860px) {
    .lab-brand__crest,
    .contact-page .lab-brand__crest,
    .reservation-lookup-page .lab-brand__crest,
    .vehicle-page .lab-brand__crest,
    .reserve-page .lab-brand__crest {
        flex: 0 0 50px;
        width: 50px;
        border-radius: 8px;
    }
}

.lab-reserve,
.hero-lab__cta--primary,
.btn-primary,
.vehicle-booking__submit,
.model-card .model-actions .btn-primary {
    border: 0;
    border-radius: var(--editor-button-radius);
    background: var(--editor-button-background);
    color: var(--editor-button-text);
}

.lab-reserve:hover,
.hero-lab__cta--primary:hover,
.btn-primary:hover,
.vehicle-booking__submit:hover,
.model-card .model-actions .btn-primary:hover {
    background: color-mix(in srgb, var(--editor-button-background) 88%, #ffffff 12%);
    color: var(--editor-button-text);
}

.lab-header__utility-link,
.lab-nav__card-media,
.vehicle-booking__kicker,
.section-kicker {
    color: var(--editor-accent-color);
}

.lab-nav__panel,
.lab-nav__card,
.fleet-card,
.service-card,
.location-card,
.guide-card,
.vehicle-metric,
.vehicle-booking,
.vehicle-hero__media {
    border-radius: var(--editor-card-radius);
}

body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero {
    grid-template-columns: minmax(0, 1.38fr) minmax(var(--editor-brand-booking-min-width), 0.74fr);
    gap: var(--editor-brand-hero-gap);
}

body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__media,
body.vehicle-page--mother-base.vehicle-page--lamborghini-brand .vehicle-hero__media {
    min-height: var(--editor-brand-hero-height-wide);
    border-radius: var(--editor-brand-radius);
}

body.vehicle-page--mother-base .vehicle-hero__shade {
    background:
        linear-gradient(180deg, var(--editor-brand-overlay-soft) 0%, var(--editor-brand-overlay-mid) 48%, var(--editor-brand-overlay-strong) 100%),
        linear-gradient(90deg, var(--editor-brand-overlay-side) 0%, var(--editor-brand-overlay-soft) 48%, var(--editor-brand-overlay-mid) 100%);
}

body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__copy h1,
body.vehicle-page--mother-base.vehicle-page--lamborghini-brand .vehicle-hero__copy h1 {
    max-width: 13ch;
    font-size: clamp(calc(var(--editor-brand-hero-title-desktop) * 0.68), 3.45vw, var(--editor-brand-hero-title-desktop));
}

body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__lead,
body.vehicle-page--mother-base.vehicle-page--lamborghini-brand .vehicle-hero__lead {
    font-size: var(--editor-brand-hero-lead-size);
}

body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-booking {
    padding: var(--editor-brand-booking-padding);
    border-radius: var(--editor-brand-radius);
}

body.vehicle-page--mother-base .vehicle-booking__price {
    font-size: clamp(calc(var(--editor-brand-booking-price-size) * 0.78), 4vw, var(--editor-brand-booking-price-size));
}

body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__actions .btn-primary,
body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-booking__submit {
    border-radius: var(--editor-brand-radius);
    background: var(--editor-brand-button-background);
    color: var(--editor-brand-button-text);
    border-color: color-mix(in srgb, var(--editor-brand-button-background) 82%, #ffffff 18%);
}

${brandPages.showHeroCta ? '' : `body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__actions {
    display: none !important;
}
`}
${brandPages.showBookingSecondary ? `body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-booking__secondary {
    display: inline-flex !important;
}
` : `body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-booking__secondary {
    display: none !important;
}
`}
@media (max-width: 1120px) {
    body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero {
        grid-template-columns: 1fr;
    }

    body.vehicle-page--mother-base .vehicle-booking {
        position: relative;
        top: auto;
    }
}

@media (min-width: 761px) and (max-width: 1440px) {
    body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__media,
    body.vehicle-page--mother-base.vehicle-page--lamborghini-brand .vehicle-hero__media {
        min-height: var(--editor-brand-hero-height-laptop);
    }

    body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__copy h1,
    body.vehicle-page--mother-base.vehicle-page--lamborghini-brand .vehicle-hero__copy h1 {
        font-size: clamp(calc(var(--editor-brand-hero-title-desktop) * 0.58), 3vw, calc(var(--editor-brand-hero-title-desktop) * 0.92));
    }
}

@media (max-width: 760px) {
    body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero {
        gap: max(0.9rem, var(--editor-brand-hero-gap));
    }

    body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__media,
    body.vehicle-page--mother-base.vehicle-page--lamborghini-brand .vehicle-hero__media {
        min-height: var(--editor-brand-hero-height-mobile);
        border-radius: min(var(--editor-brand-radius), 18px);
    }

    body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-hero__copy h1,
    body.vehicle-page--mother-base.vehicle-page--lamborghini-brand .vehicle-hero__copy h1 {
        max-width: none;
        font-size: clamp(calc(var(--editor-brand-hero-title-mobile) * 0.72), 10vw, var(--editor-brand-hero-title-mobile));
    }

    body.vehicle-page--mother-base .vehicle-main--brand-landing .vehicle-booking {
        padding: min(var(--editor-brand-booking-padding), 1.35rem);
        border-radius: min(var(--editor-brand-radius), 18px);
    }

    body.vehicle-page--mother-base .vehicle-booking__price {
        font-size: clamp(calc(var(--editor-brand-booking-price-size) * 0.7), 10vw, var(--editor-brand-booking-price-size));
    }
}
`;
}

function removeStyleOverridesLink(html) {
    const newline = html.includes('\r\n') ? '\r\n' : '\n';

    return html
        .split(/\r\n|\r|\n/)
        .filter((line) => !/admin-style-overrides\.css/i.test(line))
        .join(newline);
}

function applyStyleOverridesLink(html) {
    const cleanedHtml = removeStyleOverridesLink(html);
    const newline = cleanedHtml.includes('\r\n') ? '\r\n' : '\n';
    const link = `    <link rel="stylesheet" href="${STYLE_OVERRIDES_HREF}">`;
    const lines = cleanedHtml.split(/\r\n|\r|\n/);
    const lastStylesheetIndex = lines.reduce((lastIndex, line, index) => {
        const isStylesheet = /<link\b/i.test(line) &&
            /rel=["']stylesheet["']/i.test(line) &&
            /href=["'][^"']+["']/i.test(line);

        return isStylesheet ? index : lastIndex;
    }, -1);

    if (lastStylesheetIndex >= 0) {
        lines.splice(lastStylesheetIndex + 1, 0, link);
        return lines.join(newline);
    }

    if (/<\/head>/i.test(cleanedHtml)) {
        return cleanedHtml.replace(/<\/head>/i, `${link}${newline}</head>`);
    }

    return `${cleanedHtml}${newline}${link}`;
}

module.exports = {
    DEFAULT_STYLE_EDITOR_STATE,
    STYLE_OVERRIDES_HREF,
    STYLE_OVERRIDES_RELATIVE_PATH,
    applyStyleOverridesLink,
    normalizeStyleEditorState,
    renderStyleOverridesCss
};
