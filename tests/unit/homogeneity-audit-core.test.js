const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildHomogeneityFindings,
    compareBrandSurfaces,
    compareHeaderSystems,
    compareTypographySurfaces,
    normalizeAssetPath,
    summarizeHomogeneityFindings
} = require('../../server/homogeneity-audit-core');

const homeBrand = {
    exists: true,
    title: 'Dynasty Prestige',
    subtitle: 'Dubai Luxury Car Rental',
    logoSrc: 'https://prestigegoalmotion.com/images/dp-crest-cropped.png',
    titleFontFamily: 'Manrope, sans-serif',
    titleFontSizePx: 14,
    titleLetterSpacingPx: 1.8,
    logoRect: { width: 52, height: 52 }
};

const homeTypography = {
    heading: { exists: true, fontFamily: 'El Messiri, serif' },
    lead: { exists: true, fontFamily: 'Manrope, sans-serif' },
    body: { exists: true, fontFamily: 'Manrope, sans-serif' },
    cta: { exists: true, fontFamily: 'Manrope, sans-serif' }
};

test('normalizeAssetPath compares public logo assets without host noise', () => {
    assert.equal(
        normalizeAssetPath('https://prestigegoalmotion.com/images/dp-crest-cropped.png?v=1'),
        '/images/dp-crest-cropped.png'
    );
});

test('compareBrandSurfaces flags logo asset drift inside the same brand identity', () => {
    const mismatches = compareBrandSurfaces(homeBrand, {
        ...homeBrand,
        logoSrc: '/icons/icon-192.png'
    });

    assert.equal(mismatches.length, 1);
    assert.equal(mismatches[0].field, 'logoSrc');
    assert.equal(mismatches[0].severity, 'medium');
});

test('compareHeaderSystems flags header family and nav signature drift', () => {
    const mismatches = compareHeaderSystems(
        {
            headerFamily: 'lab-header',
            headerVariant: 'lab_mega_utility',
            primaryNavSignature: 'Home|Fleet|Services|Contact'
        },
        {
            headerFamily: 'site-header',
            headerVariant: 'site_header',
            primaryNavSignature: 'Home|Fleet|Contact'
        }
    );

    assert.deepEqual(mismatches.map((entry) => entry.field), [
        'headerFamily',
        'headerVariant',
        'primaryNavSignature'
    ]);
});

test('compareTypographySurfaces flags text font family drift', () => {
    const mismatches = compareTypographySurfaces(homeTypography, {
        heading: { exists: true, fontFamily: 'Cormorant Garamond, serif' },
        lead: { exists: true, fontFamily: 'Montserrat, sans-serif' },
        body: { exists: true, fontFamily: 'Inter, sans-serif' },
        cta: { exists: true, fontFamily: 'Manrope, sans-serif' }
    });

    assert.deepEqual(mismatches.map((entry) => entry.field), [
        'headingFontFamily',
        'leadFontFamily',
        'bodyFontFamily'
    ]);
    assert.equal(mismatches[0].severity, 'high');
});

test('buildHomogeneityFindings catches mobile drawer brand drift against page header', () => {
    const findings = buildHomogeneityFindings([
        {
            route: '/',
            viewport: 'mobile-modern',
            headerFamily: 'lab-header',
            headerVariant: 'lab_mega',
            primaryNavSignature: '',
            headerBrand: homeBrand,
            typography: homeTypography,
            typographyInventory: {
                uniqueFontFamilies: ['el messiri', 'manrope']
            },
            drawerBrand: {
                ...homeBrand,
                logoSrc: '/icons/icon-192.png'
            },
            drawerScreenshotPath: '/tmp/drawer.png'
        }
    ]);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].category, 'drawer_brand_drift');
    assert.match(findings[0].evidence, /logoSrc/);
});

test('buildHomogeneityFindings catches typography drift against home', () => {
    const findings = buildHomogeneityFindings([
        {
            route: '/',
            viewport: 'desktop-wide',
            headerFamily: 'lab-header',
            headerVariant: 'lab_mega_utility',
            primaryNavSignature: 'Home|Fleet',
            headerBrand: homeBrand,
            typography: homeTypography,
            typographyInventory: {
                uniqueFontFamilies: ['el messiri', 'manrope']
            }
        },
        {
            route: '/fleet.html',
            viewport: 'desktop-wide',
            headerFamily: 'lab-header',
            headerVariant: 'lab_mega_utility',
            primaryNavSignature: 'Home|Fleet',
            headerBrand: homeBrand,
            typography: {
                heading: { exists: true, fontFamily: 'Cormorant Garamond, serif' },
                lead: { exists: true, fontFamily: 'Montserrat, sans-serif' },
                body: { exists: true, fontFamily: 'Inter, sans-serif' },
                cta: { exists: true, fontFamily: 'Montserrat, sans-serif' }
            },
            typographyInventory: {
                uniqueFontFamilies: ['cormorant garamond', 'montserrat', 'inter']
            }
        }
    ]);

    assert.ok(findings.some((finding) => finding.category === 'typography_system_drift'));
    assert.ok(findings.some((finding) => finding.category === 'typography_sprawl'));
});

test('summarizeHomogeneityFindings groups severity counts', () => {
    const summary = summarizeHomogeneityFindings([
        { severity: 'high', category: 'header_identity_drift' },
        { severity: 'medium', category: 'drawer_brand_drift' },
        { severity: 'medium', category: 'drawer_brand_drift' }
    ]);

    assert.equal(summary.total, 3);
    assert.equal(summary.high, 1);
    assert.equal(summary.medium, 2);
    assert.equal(summary.byCategory.drawer_brand_drift, 2);
});
