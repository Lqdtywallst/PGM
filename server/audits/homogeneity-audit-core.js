const DEFAULT_BRAND_POLICY = Object.freeze({
    maxLogoSizeDeltaRatio: 0.28,
    maxLogoSizeDeltaPx: 14,
    maxTitleFontSizeDeltaRatio: 0.22,
    maxTitleFontSizeDeltaPx: 3,
    maxLetterSpacingDeltaPx: 1.2,
    maxTextFontFamiliesPerPage: 2
});

const DEFAULT_HEADER_POLICY = Object.freeze({
    approvedHeaderReferenceRoutes: Object.freeze(['/', '/services.html']),
    maxHeaderHeightDeltaPx: 24,
    maxHeaderHeightDeltaRatio: 0.24,
    maxMobileHeaderHeightDeltaPx: 18,
    minDesktopClusterGapPx: 24,
    minDesktopNavReserveGapPx: 14,
    minMobileBrandToggleGapPx: 12,
    maxClusterGapDeltaPx: 18,
    maxClusterGapDeltaRatio: 0.45,
    maxVerticalCenterSpreadPx: 10,
    maxHorizontalOverflowPx: 2,
    maxSurfaceLuminanceDelta: 0.34,
    minHeaderSurfaceAlpha: 0.42,
    maxNavigationHeaderHeightShiftPx: 4,
    maxNavigationLogoSizeShiftPx: 3,
    maxNavigationClusterGapShiftPx: 8,
    highNavigationClusterGapShiftPx: 56,
    maxDropdownSurfaceLuminanceDelta: 0.28,
    maxDropdownTopOffsetDeltaPx: 22,
    maxDropdownWidthDeltaRatio: 0.24,
    maxDropdownHeightDeltaRatio: 0.24,
    maxDropdownCardHeightDeltaRatio: 0.24,
    maxDropdownBorderRadiusDeltaPx: 8,
    minDropdownTextContrastRatio: 4.5
});

function normalizeRoute(route = '') {
    const pathname = String(route || '/').split(/[?#]/)[0] || '/';
    return pathname === '/index.html' ? '/' : pathname;
}

function normalizeText(value = '') {
    return String(value || '')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function normalizeAssetPath(value = '') {
    const rawValue = String(value || '').trim();

    if (!rawValue) {
        return '';
    }

    try {
        const parsed = new URL(rawValue, 'https://prestigegoalmotion.com');
        return parsed.pathname.replace(/\/+/g, '/').toLowerCase();
    } catch (error) {
        return rawValue.split(/[?#]/)[0].replace(/\/+/g, '/').toLowerCase();
    }
}

function normalizeFontToken(value = '') {
    return String(value || '')
        .split(',')
        .map((token) => token.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
        .filter(Boolean)[0] || '';
}

function numberOrNull(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatEvidenceValue(value) {
    if (value === null || value === undefined || value === '') {
        return 'n/a';
    }

    if (typeof value === 'number') {
        return Number(value.toFixed(2));
    }

    return String(value);
}

function relativeDelta(left, right) {
    const first = Number(left);
    const second = Number(right);

    if (!Number.isFinite(first) || !Number.isFinite(second) || Math.max(Math.abs(first), Math.abs(second)) === 0) {
        return 0;
    }

    return Math.abs(first - second) / Math.max(Math.abs(first), Math.abs(second));
}

function pushMismatch(mismatches, { field, severity = 'medium', message, reference, actual }) {
    mismatches.push({
        field,
        severity,
        message,
        reference,
        actual
    });
}

function compareBrandSurfaces(reference = {}, actual = {}, options = {}) {
    const policy = { ...DEFAULT_BRAND_POLICY, ...(options.policy || {}) };
    const mismatches = [];

    if (!reference.exists || !actual.exists) {
        pushMismatch(mismatches, {
            field: 'exists',
            severity: 'high',
            message: 'Brand surface is missing on one side of the comparison.',
            reference: Boolean(reference.exists),
            actual: Boolean(actual.exists)
        });
        return mismatches;
    }

    const referenceTitle = normalizeText(reference.title);
    const actualTitle = normalizeText(actual.title);
    if (referenceTitle && actualTitle && referenceTitle !== actualTitle) {
        pushMismatch(mismatches, {
            field: 'title',
            severity: 'high',
            message: 'Brand title text differs.',
            reference: reference.title,
            actual: actual.title
        });
    }

    const referenceSubtitle = normalizeText(reference.subtitle);
    const actualSubtitle = normalizeText(actual.subtitle);
    if (referenceSubtitle && actualSubtitle && referenceSubtitle !== actualSubtitle) {
        pushMismatch(mismatches, {
            field: 'subtitle',
            severity: 'medium',
            message: 'Brand subtitle text differs.',
            reference: reference.subtitle,
            actual: actual.subtitle
        });
    }

    const referenceLogo = normalizeAssetPath(reference.logoSrc);
    const actualLogo = normalizeAssetPath(actual.logoSrc);
    if (referenceLogo && actualLogo && referenceLogo !== actualLogo) {
        pushMismatch(mismatches, {
            field: 'logoSrc',
            severity: 'medium',
            message: 'Brand logo asset differs.',
            reference: referenceLogo,
            actual: actualLogo
        });
    }

    const referenceFont = normalizeFontToken(reference.titleFontFamily);
    const actualFont = normalizeFontToken(actual.titleFontFamily);
    if (referenceFont && actualFont && referenceFont !== actualFont) {
        pushMismatch(mismatches, {
            field: 'titleFontFamily',
            severity: 'medium',
            message: 'Brand title font family differs.',
            reference: referenceFont,
            actual: actualFont
        });
    }

    const titleFontDeltaRatio = relativeDelta(reference.titleFontSizePx, actual.titleFontSizePx);
    const titleFontDeltaPx = Math.abs(Number(reference.titleFontSizePx || 0) - Number(actual.titleFontSizePx || 0));
    if (
        titleFontDeltaRatio > policy.maxTitleFontSizeDeltaRatio &&
        titleFontDeltaPx > policy.maxTitleFontSizeDeltaPx
    ) {
        pushMismatch(mismatches, {
            field: 'titleFontSizePx',
            severity: 'low',
            message: 'Brand title size differs enough to feel like another component.',
            reference: reference.titleFontSizePx,
            actual: actual.titleFontSizePx
        });
    }

    const referenceLogoWidth = numberOrNull(reference.logoRect?.width);
    const actualLogoWidth = numberOrNull(actual.logoRect?.width);
    const logoDeltaRatio = relativeDelta(referenceLogoWidth, actualLogoWidth);
    const logoDeltaPx = Math.abs(Number(referenceLogoWidth || 0) - Number(actualLogoWidth || 0));
    if (
        logoDeltaRatio > policy.maxLogoSizeDeltaRatio &&
        logoDeltaPx > policy.maxLogoSizeDeltaPx
    ) {
        pushMismatch(mismatches, {
            field: 'logoWidthPx',
            severity: 'low',
            message: 'Brand logo size differs enough to weaken identity rhythm.',
            reference: referenceLogoWidth,
            actual: actualLogoWidth
        });
    }

    const referenceLetterSpacing = numberOrNull(reference.titleLetterSpacingPx);
    const actualLetterSpacing = numberOrNull(actual.titleLetterSpacingPx);
    if (
        referenceLetterSpacing !== null &&
        actualLetterSpacing !== null &&
        Math.abs(referenceLetterSpacing - actualLetterSpacing) > policy.maxLetterSpacingDeltaPx
    ) {
        pushMismatch(mismatches, {
            field: 'titleLetterSpacingPx',
            severity: 'low',
            message: 'Brand title letter spacing differs.',
            reference: referenceLetterSpacing,
            actual: actualLetterSpacing
        });
    }

    return mismatches;
}

function compareHeaderSystems(reference = {}, actual = {}) {
    const mismatches = [];

    if (reference.headerFamily && actual.headerFamily && reference.headerFamily !== actual.headerFamily) {
        pushMismatch(mismatches, {
            field: 'headerFamily',
            severity: 'high',
            message: 'Header family differs.',
            reference: reference.headerFamily,
            actual: actual.headerFamily
        });
    }

    if (reference.headerVariant && actual.headerVariant && reference.headerVariant !== actual.headerVariant) {
        pushMismatch(mismatches, {
            field: 'headerVariant',
            severity: 'high',
            message: 'Header variant differs.',
            reference: reference.headerVariant,
            actual: actual.headerVariant
        });
    }

    if (
        reference.primaryNavSignature &&
        actual.primaryNavSignature &&
        normalizeText(reference.primaryNavSignature) !== normalizeText(actual.primaryNavSignature)
    ) {
        pushMismatch(mismatches, {
            field: 'primaryNavSignature',
            severity: 'medium',
            message: 'Primary navigation labels differ.',
            reference: reference.primaryNavSignature,
            actual: actual.primaryNavSignature
        });
    }

    return mismatches;
}

function compareHeaderLayout(reference = {}, actual = {}, options = {}) {
    const policy = { ...DEFAULT_HEADER_POLICY, ...(options.policy || {}) };
    const mismatches = [];

    if (!reference.exists || !actual.exists) {
        pushMismatch(mismatches, {
            field: 'exists',
            severity: 'high',
            message: 'Header layout metrics are missing on one side of the comparison.',
            reference: Boolean(reference.exists),
            actual: Boolean(actual.exists)
        });
        return mismatches;
    }

    if (reference.mode && actual.mode && reference.mode !== actual.mode) {
        pushMismatch(mismatches, {
            field: 'mode',
            severity: 'high',
            message: 'Header switches between desktop/mobile structural modes for the same viewport.',
            reference: reference.mode,
            actual: actual.mode
        });
    }

    if (
        reference.orderSignature &&
        actual.orderSignature &&
        reference.mode === 'desktop' &&
        actual.mode === 'desktop' &&
        reference.orderSignature !== actual.orderSignature
    ) {
        pushMismatch(mismatches, {
            field: 'orderSignature',
            severity: 'high',
            message: 'Header component order differs from the approved reference.',
            reference: reference.orderSignature,
            actual: actual.orderSignature
        });
    }

    const actualOverflow = numberOrNull(actual.horizontalOverflowPx);
    if (actualOverflow !== null && actualOverflow > policy.maxHorizontalOverflowPx) {
        pushMismatch(mismatches, {
            field: 'horizontalOverflowPx',
            severity: 'high',
            message: 'Header content overflows horizontally.',
            reference: `<=${policy.maxHorizontalOverflowPx}`,
            actual: actualOverflow
        });
    }

    const referenceHeight = numberOrNull(reference.headerHeightPx);
    const actualHeight = numberOrNull(actual.headerHeightPx);
    const heightDeltaPx = Math.abs(Number(referenceHeight || 0) - Number(actualHeight || 0));
    const heightDeltaRatio = relativeDelta(referenceHeight, actualHeight);
    const heightLimit = actual.mode === 'mobile'
        ? policy.maxMobileHeaderHeightDeltaPx
        : policy.maxHeaderHeightDeltaPx;

    if (
        referenceHeight !== null &&
        actualHeight !== null &&
        heightDeltaPx > heightLimit &&
        heightDeltaRatio > policy.maxHeaderHeightDeltaRatio
    ) {
        pushMismatch(mismatches, {
            field: 'headerHeightPx',
            severity: actual.mode === 'mobile' ? 'medium' : 'high',
            message: 'Header height drifts enough to feel like a different component.',
            reference: referenceHeight,
            actual: actualHeight
        });
    }

    const centerSpread = numberOrNull(actual.verticalCenterSpreadPx);
    if (centerSpread !== null && centerSpread > policy.maxVerticalCenterSpreadPx) {
        pushMismatch(mismatches, {
            field: 'verticalCenterSpreadPx',
            severity: 'medium',
            message: 'Header items are not vertically aligned on the same optical line.',
            reference: `<=${policy.maxVerticalCenterSpreadPx}`,
            actual: centerSpread
        });
    }

    if (actual.mode === 'mobile' || reference.mode === 'mobile') {
        const mobileGap = numberOrNull(actual.brandToToggleGapPx);
        const referenceGap = numberOrNull(reference.brandToToggleGapPx);

        if (
            mobileGap !== null &&
            referenceGap !== null &&
            referenceGap >= policy.minMobileBrandToggleGapPx &&
            mobileGap < policy.minMobileBrandToggleGapPx
        ) {
            pushMismatch(mismatches, {
                field: 'brandToToggleGapPx',
                severity: 'medium',
                message: 'Mobile header brand and menu toggle are too cramped.',
                reference: referenceGap,
                actual: mobileGap
            });
        }

        return mismatches;
    }

    const desktopGapFields = [
        ['brandToUtilityGapPx', policy.minDesktopClusterGapPx, 'Brand to quick-contact spacing is too tight.'],
        ['utilityToNavGapPx', policy.minDesktopClusterGapPx, 'Quick-contact to navigation spacing is too tight.'],
        ['navToReserveGapPx', policy.minDesktopNavReserveGapPx, 'Navigation to Reserve spacing is too tight.']
    ];

    for (const [field, minimum, message] of desktopGapFields) {
        const referenceGap = numberOrNull(reference[field]);
        const actualGap = numberOrNull(actual[field]);

        if (referenceGap === null || actualGap === null) {
            continue;
        }

        if (referenceGap >= minimum && actualGap < minimum) {
            pushMismatch(mismatches, {
                field,
                severity: actualGap < minimum * 0.72 ? 'high' : 'medium',
                message,
                reference: referenceGap,
                actual: actualGap
            });
            continue;
        }

        if (
            actualGap < referenceGap &&
            Math.abs(referenceGap - actualGap) > policy.maxClusterGapDeltaPx &&
            relativeDelta(referenceGap, actualGap) > policy.maxClusterGapDeltaRatio
        ) {
            pushMismatch(mismatches, {
                field,
                severity: 'low',
                message: 'Header spacing rhythm differs from the approved reference.',
                reference: referenceGap,
                actual: actualGap
            });
        }
    }

    return mismatches;
}

function isDarkHeaderTone(value = '') {
    return ['dark', 'dark-gradient', 'transparent-dark'].includes(String(value || '').toLowerCase());
}

function compareHeaderSurface(reference = {}, actual = {}, options = {}) {
    const policy = { ...DEFAULT_HEADER_POLICY, ...(options.policy || {}) };
    const mismatches = [];

    if (!reference.exists || !actual.exists) {
        pushMismatch(mismatches, {
            field: 'exists',
            severity: 'high',
            message: 'Header surface metrics are missing on one side of the comparison.',
            reference: Boolean(reference.exists),
            actual: Boolean(actual.exists)
        });
        return mismatches;
    }

    const referenceTone = String(reference.surfaceTone || '').toLowerCase();
    const actualTone = String(actual.surfaceTone || '').toLowerCase();
    const referenceIsDark = isDarkHeaderTone(referenceTone);
    const actualIsDark = isDarkHeaderTone(actualTone);

    if (referenceIsDark && actualTone === 'light') {
        pushMismatch(mismatches, {
            field: 'surfaceTone',
            severity: 'high',
            message: 'Header background is light while the approved references use a dark premium surface.',
            reference: reference.surfaceTone,
            actual: actual.surfaceTone
        });
    } else if (referenceTone && actualTone && referenceTone !== actualTone && !(referenceIsDark && actualIsDark)) {
        pushMismatch(mismatches, {
            field: 'surfaceTone',
            severity: 'medium',
            message: 'Header background tone differs from the approved reference.',
            reference: reference.surfaceTone,
            actual: actual.surfaceTone
        });
    }

    const referenceLuminance = numberOrNull(reference.backgroundLuminance);
    const actualLuminance = numberOrNull(actual.backgroundLuminance);
    if (
        referenceIsDark &&
        referenceLuminance !== null &&
        actualLuminance !== null &&
        actualLuminance - referenceLuminance > policy.maxSurfaceLuminanceDelta
    ) {
        pushMismatch(mismatches, {
            field: 'backgroundLuminance',
            severity: 'high',
            message: 'Header surface is visibly brighter than the approved dark header system.',
            reference: referenceLuminance,
            actual: actualLuminance
        });
    }

    const actualMinAlpha = numberOrNull(actual.backgroundMinAlpha ?? actual.backgroundAlpha);
    if (referenceIsDark && actualMinAlpha !== null && actualMinAlpha < policy.minHeaderSurfaceAlpha) {
        pushMismatch(mismatches, {
            field: 'backgroundMinAlpha',
            severity: 'high',
            message: 'Header surface fades too transparent, reducing contrast over the page below.',
            reference: `>=${policy.minHeaderSurfaceAlpha}`,
            actual: actualMinAlpha
        });
    }

    if (Boolean(reference.hasGradient) !== Boolean(actual.hasGradient)) {
        pushMismatch(mismatches, {
            field: 'hasGradient',
            severity: 'medium',
            message: 'Header background treatment changes between solid and gradient surfaces.',
            reference: Boolean(reference.hasGradient),
            actual: Boolean(actual.hasGradient)
        });
    } else if (reference.hasGradient && !actual.hasGradient && referenceIsDark && actual.surfaceTone !== 'dark') {
        pushMismatch(mismatches, {
            field: 'hasGradient',
            severity: 'medium',
            message: 'Header lost the dark gradient surface used by the approved reference.',
            reference: true,
            actual: Boolean(actual.hasGradient)
        });
    }

    if (Boolean(reference.boxShadow) !== Boolean(actual.boxShadow)) {
        pushMismatch(mismatches, {
            field: 'boxShadow',
            severity: 'medium',
            message: 'Header shadow treatment differs from the approved reference.',
            reference: Boolean(reference.boxShadow),
            actual: Boolean(actual.boxShadow)
        });
    }

    if (
        reference.position &&
        actual.position &&
        reference.position !== actual.position &&
        !['sticky', 'fixed'].includes(actual.position)
    ) {
        pushMismatch(mismatches, {
            field: 'position',
            severity: 'low',
            message: 'Header positioning differs from the approved reference.',
            reference: reference.position,
            actual: actual.position
        });
    }

    return mismatches;
}

function compareHeaderNavigationMotion(referencePage = {}, actualPage = {}, options = {}) {
    const policy = { ...DEFAULT_HEADER_POLICY, ...(options.policy || {}) };
    const reference = referencePage.headerLayout || {};
    const actual = actualPage.headerLayout || {};
    const mismatches = [];

    if (!reference.exists || !actual.exists) {
        pushMismatch(mismatches, {
            field: 'exists',
            severity: 'high',
            message: 'Header motion metrics are missing on one side of the comparison.',
            reference: Boolean(reference.exists),
            actual: Boolean(actual.exists)
        });
        return mismatches;
    }

    if (reference.mode !== actual.mode) {
        pushMismatch(mismatches, {
            field: 'mode',
            severity: 'high',
            message: 'Header changes structural mode between route clicks.',
            reference: reference.mode,
            actual: actual.mode
        });
        return mismatches;
    }

    const heightDelta = Math.abs(Number(reference.headerHeightPx || 0) - Number(actual.headerHeightPx || 0));
    if (heightDelta > policy.maxNavigationHeaderHeightShiftPx) {
        pushMismatch(mismatches, {
            field: 'headerHeightPx',
            severity: heightDelta > policy.maxNavigationHeaderHeightShiftPx * 2 ? 'high' : 'medium',
            message: 'Header height changes enough to be visible when navigating from the header.',
            reference: reference.headerHeightPx,
            actual: actual.headerHeightPx
        });
    }

    const referenceLogoWidth = numberOrNull(referencePage.headerBrand?.logoRect?.width);
    const actualLogoWidth = numberOrNull(actualPage.headerBrand?.logoRect?.width);
    const logoDelta = Math.abs(Number(referenceLogoWidth || 0) - Number(actualLogoWidth || 0));
    if (referenceLogoWidth !== null && actualLogoWidth !== null && logoDelta > policy.maxNavigationLogoSizeShiftPx) {
        pushMismatch(mismatches, {
            field: 'logoWidthPx',
            severity: logoDelta > policy.maxNavigationLogoSizeShiftPx * 1.8 ? 'high' : 'medium',
            message: 'Brand logo size changes enough to make the header jump between tabs.',
            reference: referenceLogoWidth,
            actual: actualLogoWidth
        });
    }

    const gapFields = [
        ['brandToUtilityGapPx', 'Brand-to-contact spacing changes between header tabs.'],
        ['utilityToNavGapPx', 'Contact-to-navigation spacing changes between header tabs.'],
        ['navToReserveGapPx', 'Navigation-to-reserve spacing changes between header tabs.']
    ];

    for (const [field, message] of gapFields) {
        const referenceGap = numberOrNull(reference[field]);
        const actualGap = numberOrNull(actual[field]);

        if (referenceGap === null || actualGap === null) {
            continue;
        }

        const gapDelta = Math.abs(referenceGap - actualGap);
        if (gapDelta > policy.maxNavigationClusterGapShiftPx) {
            pushMismatch(mismatches, {
                field,
                severity: gapDelta > policy.highNavigationClusterGapShiftPx ? 'high' : 'medium',
                message,
                reference: referenceGap,
                actual: actualGap
            });
        }
    }

    return mismatches;
}

function compareHeaderCtaSurface(reference = {}, actual = {}, options = {}) {
    const policy = { ...DEFAULT_HEADER_POLICY, ...(options.policy || {}) };
    const mismatches = [];

    if (!reference.exists && !actual.exists) {
        return mismatches;
    }

    if (!reference.exists || !actual.exists) {
        pushMismatch(mismatches, {
            field: 'exists',
            severity: 'high',
            message: 'Header primary CTA is missing on one side of the comparison.',
            reference: Boolean(reference.exists),
            actual: Boolean(actual.exists)
        });
        return mismatches;
    }

    const referenceText = normalizeText(reference.text);
    const actualText = normalizeText(actual.text);
    if (referenceText && actualText && referenceText !== actualText) {
        pushMismatch(mismatches, {
            field: 'text',
            severity: 'medium',
            message: 'Header primary CTA label differs.',
            reference: reference.text,
            actual: actual.text
        });
    }

    const referenceBackground = normalizeText(`${reference.backgroundColor || ''} ${reference.backgroundImage || ''}`);
    const actualBackground = normalizeText(`${actual.backgroundColor || ''} ${actual.backgroundImage || ''}`);
    if (referenceBackground && actualBackground && referenceBackground !== actualBackground) {
        pushMismatch(mismatches, {
            field: 'background',
            severity: 'high',
            message: 'Header primary CTA background treatment differs from the approved reference.',
            reference: reference.backgroundImage || reference.backgroundColor,
            actual: actual.backgroundImage || actual.backgroundColor
        });
    }

    const referenceColor = normalizeText(reference.color);
    const actualColor = normalizeText(actual.color);
    if (referenceColor && actualColor && referenceColor !== actualColor) {
        pushMismatch(mismatches, {
            field: 'color',
            severity: 'medium',
            message: 'Header primary CTA text color differs.',
            reference: reference.color,
            actual: actual.color
        });
    }

    const referenceHeight = numberOrNull(reference.rect?.height || reference.minHeightPx);
    const actualHeight = numberOrNull(actual.rect?.height || actual.minHeightPx);
    if (
        referenceHeight !== null &&
        actualHeight !== null &&
        Math.abs(referenceHeight - actualHeight) > policy.maxNavigationHeaderHeightShiftPx
    ) {
        pushMismatch(mismatches, {
            field: 'heightPx',
            severity: 'medium',
            message: 'Header primary CTA height differs enough to affect header rhythm.',
            reference: referenceHeight,
            actual: actualHeight
        });
    }

    const referenceRadius = numberOrNull(reference.borderRadiusPx);
    const actualRadius = numberOrNull(actual.borderRadiusPx);
    if (
        referenceRadius !== null &&
        actualRadius !== null &&
        Math.abs(referenceRadius - actualRadius) > policy.maxDropdownBorderRadiusDeltaPx
    ) {
        pushMismatch(mismatches, {
            field: 'borderRadiusPx',
            severity: 'low',
            message: 'Header primary CTA corner radius differs.',
            reference: referenceRadius,
            actual: actualRadius
        });
    }

    return mismatches;
}

function dropdownKey(dropdown = {}) {
    return normalizeText(dropdown.label || dropdown.triggerLabel || dropdown.panelId || '');
}

function dropdownsByKey(dropdowns = []) {
    return (Array.isArray(dropdowns) ? dropdowns : []).reduce((map, dropdown) => {
        const key = dropdownKey(dropdown);
        if (key && dropdown.exists !== false && !map.has(key)) {
            map.set(key, dropdown);
        }
        return map;
    }, new Map());
}

function compareHeaderDropdownSystems(referencePage = {}, actualPage = {}, options = {}) {
    const policy = { ...DEFAULT_HEADER_POLICY, ...(options.policy || {}) };
    const mismatches = [];
    const referenceDropdowns = dropdownsByKey(referencePage.headerDropdowns);
    const actualDropdowns = dropdownsByKey(actualPage.headerDropdowns);

    if (referenceDropdowns.size === 0 && actualDropdowns.size === 0) {
        return mismatches;
    }

    if (referenceDropdowns.size > 0 && actualDropdowns.size === 0) {
        pushMismatch(mismatches, {
            field: 'dropdowns',
            severity: 'high',
            message: 'Header dropdown states are missing on the actual page.',
            reference: [...referenceDropdowns.keys()].join('|'),
            actual: ''
        });
        return mismatches;
    }

    for (const [key, reference] of referenceDropdowns.entries()) {
        const actual = actualDropdowns.get(key);

        if (!actual) {
            pushMismatch(mismatches, {
                field: `${key}.exists`,
                severity: 'high',
                message: 'A header dropdown from the approved reference is missing on this page.',
                reference: key,
                actual: ''
            });
            continue;
        }

        const referenceTone = String(reference.surfaceTone || '').toLowerCase();
        const actualTone = String(actual.surfaceTone || '').toLowerCase();
        const referenceIsDark = isDarkHeaderTone(referenceTone);
        const actualIsDark = isDarkHeaderTone(actualTone);

        if (referenceIsDark && actualTone === 'light') {
            pushMismatch(mismatches, {
                field: `${key}.surfaceTone`,
                severity: 'high',
                message: 'Dropdown background switched from the approved dark premium treatment to a light panel.',
                reference: reference.surfaceTone,
                actual: actual.surfaceTone
            });
        } else if (referenceTone && actualTone && referenceTone !== actualTone && !(referenceIsDark && actualIsDark)) {
            pushMismatch(mismatches, {
                field: `${key}.surfaceTone`,
                severity: 'medium',
                message: 'Dropdown background tone differs from the approved header dropdown.',
                reference: reference.surfaceTone,
                actual: actual.surfaceTone
            });
        }

        const referenceLuminance = numberOrNull(reference.backgroundLuminance);
        const actualLuminance = numberOrNull(actual.backgroundLuminance);
        if (
            referenceLuminance !== null &&
            actualLuminance !== null &&
            Math.abs(referenceLuminance - actualLuminance) > policy.maxDropdownSurfaceLuminanceDelta
        ) {
            pushMismatch(mismatches, {
                field: `${key}.backgroundLuminance`,
                severity: referenceIsDark && actualLuminance > referenceLuminance ? 'high' : 'medium',
                message: 'Dropdown surface brightness differs enough to read as a different component.',
                reference: referenceLuminance,
                actual: actualLuminance
            });
        }

        const actualContrast = numberOrNull(actual.minTextContrastRatio);
        if (actualContrast !== null && actualContrast < policy.minDropdownTextContrastRatio) {
            pushMismatch(mismatches, {
                field: `${key}.minTextContrastRatio`,
                severity: actualContrast < 3 ? 'high' : 'medium',
                message: 'Dropdown text contrast is too weak against its panel background.',
                reference: `>=${policy.minDropdownTextContrastRatio}`,
                actual: actualContrast
            });
        }

        const referenceTopOffset = numberOrNull(reference.topOffsetFromHeaderPx);
        const actualTopOffset = numberOrNull(actual.topOffsetFromHeaderPx);
        if (
            referenceTopOffset !== null &&
            actualTopOffset !== null &&
            Math.abs(referenceTopOffset - actualTopOffset) > policy.maxDropdownTopOffsetDeltaPx
        ) {
            pushMismatch(mismatches, {
                field: `${key}.topOffsetFromHeaderPx`,
                severity: 'medium',
                message: 'Dropdown vertical placement differs from the approved header rhythm.',
                reference: referenceTopOffset,
                actual: actualTopOffset
            });
        }

        const referenceWidth = numberOrNull(reference.panelRect?.width);
        const actualWidth = numberOrNull(actual.panelRect?.width);
        if (
            referenceWidth !== null &&
            actualWidth !== null &&
            relativeDelta(referenceWidth, actualWidth) > policy.maxDropdownWidthDeltaRatio
        ) {
            pushMismatch(mismatches, {
                field: `${key}.panelWidthPx`,
                severity: 'medium',
                message: 'Dropdown width differs from the approved header component.',
                reference: referenceWidth,
                actual: actualWidth
            });
        }

        const referenceHeight = numberOrNull(reference.panelRect?.height);
        const actualHeight = numberOrNull(actual.panelRect?.height);
        if (
            referenceHeight !== null &&
            actualHeight !== null &&
            relativeDelta(referenceHeight, actualHeight) > policy.maxDropdownHeightDeltaRatio
        ) {
            pushMismatch(mismatches, {
                field: `${key}.panelHeightPx`,
                severity: 'high',
                message: 'Dropdown height differs from the approved header component, usually because item padding or row rhythm drifted.',
                reference: referenceHeight,
                actual: actualHeight
            });
        }

        const referenceCardHeight = numberOrNull(reference.firstCardRect?.height);
        const actualCardHeight = numberOrNull(actual.firstCardRect?.height);
        if (
            referenceCardHeight !== null &&
            actualCardHeight !== null &&
            relativeDelta(referenceCardHeight, actualCardHeight) > policy.maxDropdownCardHeightDeltaRatio
        ) {
            pushMismatch(mismatches, {
                field: `${key}.cardHeightPx`,
                severity: 'high',
                message: 'Dropdown item height differs from the approved header component.',
                reference: referenceCardHeight,
                actual: actualCardHeight
            });
        }

        const referenceRadius = numberOrNull(reference.borderRadiusPx);
        const actualRadius = numberOrNull(actual.borderRadiusPx);
        if (
            referenceRadius !== null &&
            actualRadius !== null &&
            Math.abs(referenceRadius - actualRadius) > policy.maxDropdownBorderRadiusDeltaPx
        ) {
            pushMismatch(mismatches, {
                field: `${key}.borderRadiusPx`,
                severity: 'low',
                message: 'Dropdown corner radius differs from the approved component.',
                reference: referenceRadius,
                actual: actualRadius
            });
        }

        if (reference.cardCount !== undefined && actual.cardCount !== undefined && reference.cardCount !== actual.cardCount) {
            pushMismatch(mismatches, {
                field: `${key}.cardCount`,
                severity: 'medium',
                message: 'Dropdown item count differs from the approved navigation surface.',
                reference: reference.cardCount,
                actual: actual.cardCount
            });
        }
    }

    return mismatches;
}

function compareTypographySurfaces(reference = {}, actual = {}) {
    const mismatches = [];
    const surfaces = [
        ['heading', 'Heading font family differs.'],
        ['lead', 'Lead text font family differs.'],
        ['body', 'Body text font family differs.'],
        ['cta', 'CTA font family differs.']
    ];

    for (const [surface, message] of surfaces) {
        const referenceSurface = reference?.[surface] || {};
        const actualSurface = actual?.[surface] || {};
        const referenceFont = normalizeFontToken(referenceSurface.fontFamily);
        const actualFont = normalizeFontToken(actualSurface.fontFamily);

        if (!referenceSurface.exists || !actualSurface.exists || !referenceFont || !actualFont) {
            continue;
        }

        if (referenceFont !== actualFont) {
            pushMismatch(mismatches, {
                field: `${surface}FontFamily`,
                severity: ['heading', 'body'].includes(surface) ? 'high' : 'medium',
                message,
                reference: referenceFont,
                actual: actualFont
            });
        }
    }

    return mismatches;
}

function collectTypographySprawlMismatches(page = {}, options = {}) {
    const policy = { ...DEFAULT_BRAND_POLICY, ...(options.policy || {}) };
    const inventory = page.typographyInventory || {};
    const uniqueFonts = Array.isArray(inventory.uniqueFontFamilies)
        ? inventory.uniqueFontFamilies.map(normalizeFontToken).filter(Boolean)
        : [];

    if (uniqueFonts.length <= Number(policy.maxTextFontFamiliesPerPage || 2)) {
        return [];
    }

    return [{
        field: 'textFontFamilies',
        severity: uniqueFonts.length > 3 ? 'high' : 'medium',
        message: 'Visible text uses too many font families on one route.',
        reference: `<=${policy.maxTextFontFamiliesPerPage}`,
        actual: uniqueFonts.join('|')
    }];
}

function createFinding({ route, viewport, area, severity, category, message, evidence, recommendation, screenshotPath = '' }) {
    return {
        route: normalizeRoute(route),
        viewport,
        area,
        severity,
        category,
        message,
        evidence,
        recommendation,
        screenshotPath
    };
}

function highestSeverity(mismatches = []) {
    if (mismatches.some((entry) => entry.severity === 'high')) {
        return 'high';
    }

    if (mismatches.some((entry) => entry.severity === 'medium')) {
        return 'medium';
    }

    return 'low';
}

function formatMismatchEvidence(mismatches = []) {
    return mismatches
        .map((entry) => `${entry.field}: ${formatEvidenceValue(entry.reference)} -> ${formatEvidenceValue(entry.actual)}`)
        .join('; ');
}

function severityScore(mismatches = []) {
    return mismatches.reduce((score, mismatch) => {
        if (mismatch.severity === 'high') {
            return score + 100;
        }

        if (mismatch.severity === 'medium') {
            return score + 10;
        }

        return score + 1;
    }, 0);
}

function bestReferenceComparison(referencePages = [], actualPage = {}, compare) {
    const comparisons = referencePages
        .filter((referencePage) => referencePage && referencePage.route !== actualPage.route)
        .map((referencePage) => ({
            referenceRoute: referencePage.route,
            mismatches: compare(referencePage, actualPage)
        }))
        .sort((left, right) => severityScore(left.mismatches) - severityScore(right.mismatches));

    return comparisons[0] || { referenceRoute: '', mismatches: [] };
}

function buildHomogeneityFindings(pages = [], options = {}) {
    const findings = [];
    const policy = { ...DEFAULT_HEADER_POLICY, ...(options.policy || {}) };
    const headerReferenceRoutes = options.headerReferenceRoutes || policy.approvedHeaderReferenceRoutes || ['/'];
    const normalizedPages = pages.map((page) => ({
        ...page,
        route: normalizeRoute(page.route)
    }));
    const pagesByViewport = new Map();

    for (const page of normalizedPages) {
        const group = pagesByViewport.get(page.viewport) || [];
        group.push(page);
        pagesByViewport.set(page.viewport, group);
    }

    for (const [viewport, group] of pagesByViewport.entries()) {
        const home = group.find((page) => page.route === '/') || group[0];

        if (!home) {
            continue;
        }

        const headerReferences = headerReferenceRoutes
            .map((route) => group.find((page) => page.route === normalizeRoute(route)))
            .filter(Boolean);
        const approvedHeaderReferences = headerReferences.length > 0 ? headerReferences : [home];

        for (const page of group) {
            if (page.route !== home.route) {
                const headerMismatches = compareHeaderSystems(home, page);
                const headerBrandMismatches = compareBrandSurfaces(home.headerBrand, page.headerBrand, options);
                const combinedHeader = [...headerMismatches, ...headerBrandMismatches];

                if (combinedHeader.length > 0) {
                    findings.push(createFinding({
                        route: page.route,
                        viewport,
                        area: 'header',
                        severity: highestSeverity(combinedHeader),
                        category: 'header_identity_drift',
                        message: 'This page header drifts from the home header identity.',
                        evidence: formatMismatchEvidence(combinedHeader),
                        recommendation: 'Review whether this route should use the same brand mark, type scale and nav signature as home.',
                        screenshotPath: page.headerScreenshotPath || page.viewportScreenshotPath || ''
                    }));
                }

                if (!headerReferenceRoutes.map(normalizeRoute).includes(page.route)) {
                    const layoutComparison = bestReferenceComparison(
                        approvedHeaderReferences,
                        page,
                        (referencePage, actualPage) => compareHeaderLayout(
                            referencePage.headerLayout,
                            actualPage.headerLayout,
                            { policy }
                        )
                    );

                    if (layoutComparison.mismatches.length > 0) {
                        findings.push(createFinding({
                            route: page.route,
                            viewport,
                            area: 'header',
                            severity: highestSeverity(layoutComparison.mismatches),
                            category: 'header_layout_drift',
                            message: 'This page header layout drifts from the approved home/services header rhythm.',
                            evidence: `reference ${layoutComparison.referenceRoute}: ${formatMismatchEvidence(layoutComparison.mismatches)}`,
                            recommendation: 'Keep the brand, contact icons, navigation and Reserve CTA aligned with the approved header spacing and order.',
                            screenshotPath: page.headerScreenshotPath || page.viewportScreenshotPath || ''
                        }));
                    }

                    const surfaceComparison = bestReferenceComparison(
                        approvedHeaderReferences,
                        page,
                        (referencePage, actualPage) => compareHeaderSurface(
                            referencePage.headerSurface,
                            actualPage.headerSurface,
                            { policy }
                        )
                    );

                    if (surfaceComparison.mismatches.length > 0) {
                        findings.push(createFinding({
                            route: page.route,
                            viewport,
                            area: 'header',
                            severity: highestSeverity(surfaceComparison.mismatches),
                            category: 'header_surface_drift',
                            message: 'This page header surface does not match the approved dark premium header treatment.',
                            evidence: `reference ${surfaceComparison.referenceRoute}: ${formatMismatchEvidence(surfaceComparison.mismatches)}`,
                            recommendation: 'Use the same dark/gradient header surface as home or services; avoid white headers and low-contrast brand/navigation text.',
                            screenshotPath: page.headerScreenshotPath || page.viewportScreenshotPath || ''
                        }));
                    }

                    const motionComparison = bestReferenceComparison(
                        approvedHeaderReferences,
                        page,
                        (referencePage, actualPage) => compareHeaderNavigationMotion(
                            referencePage,
                            actualPage,
                            { policy }
                        )
                    );

                    if (motionComparison.mismatches.length > 0) {
                        findings.push(createFinding({
                            route: page.route,
                            viewport,
                            area: 'header',
                            severity: highestSeverity(motionComparison.mismatches),
                            category: 'header_navigation_shift',
                            message: 'Clicking into this route would visibly move the header compared with the approved home/services header.',
                            evidence: `reference ${motionComparison.referenceRoute}: ${formatMismatchEvidence(motionComparison.mismatches)}`,
                            recommendation: 'Keep header height, logo scale and brand/contact/nav spacing stable across route clicks so the navigation feels fixed in place.',
                            screenshotPath: page.headerScreenshotPath || page.viewportScreenshotPath || ''
                        }));
                    }

                    const ctaComparison = bestReferenceComparison(
                        approvedHeaderReferences,
                        page,
                        (referencePage, actualPage) => compareHeaderCtaSurface(
                            referencePage.headerCta,
                            actualPage.headerCta,
                            { policy }
                        )
                    );

                    if (ctaComparison.mismatches.length > 0) {
                        findings.push(createFinding({
                            route: page.route,
                            viewport,
                            area: 'header_cta',
                            severity: highestSeverity(ctaComparison.mismatches),
                            category: 'header_cta_drift',
                            message: 'The header Reserve CTA drifts from the approved home/services treatment.',
                            evidence: `reference ${ctaComparison.referenceRoute}: ${formatMismatchEvidence(ctaComparison.mismatches)}`,
                            recommendation: 'Keep the same primary Reserve button treatment across public headers unless a different state is intentionally documented.',
                            screenshotPath: page.headerScreenshotPath || page.viewportScreenshotPath || ''
                        }));
                    }

                    const dropdownComparison = bestReferenceComparison(
                        approvedHeaderReferences,
                        page,
                        (referencePage, actualPage) => compareHeaderDropdownSystems(
                            referencePage,
                            actualPage,
                            { policy }
                        )
                    );

                    if (dropdownComparison.mismatches.length > 0) {
                        findings.push(createFinding({
                            route: page.route,
                            viewport,
                            area: 'header_dropdown',
                            severity: highestSeverity(dropdownComparison.mismatches),
                            category: 'header_dropdown_drift',
                            message: 'An opened header dropdown drifts from the approved home/services dropdown system.',
                            evidence: `reference ${dropdownComparison.referenceRoute}: ${formatMismatchEvidence(dropdownComparison.mismatches)}`,
                            recommendation: 'Keep mega-menu panels visually identical across routes: same dark premium surface, contrast, spacing, radius and item structure.',
                            screenshotPath: page.headerDropdownScreenshotPath || page.headerScreenshotPath || page.viewportScreenshotPath || ''
                        }));
                    }
                }

                const typographyMismatches = compareTypographySurfaces(home.typography, page.typography);

                if (typographyMismatches.length > 0) {
                    findings.push(createFinding({
                        route: page.route,
                        viewport,
                        area: 'typography',
                        severity: highestSeverity(typographyMismatches),
                        category: 'typography_system_drift',
                        message: 'This page uses different text font families than the home reference.',
                        evidence: formatMismatchEvidence(typographyMismatches),
                        recommendation: 'Review whether headings, body text and CTAs should use the same display/sans families as the main site.',
                        screenshotPath: page.viewportScreenshotPath || ''
                    }));
                }
            }

            const sprawlMismatches = collectTypographySprawlMismatches(page, options);

            if (sprawlMismatches.length > 0) {
                findings.push(createFinding({
                    route: page.route,
                    viewport,
                    area: 'typography',
                    severity: highestSeverity(sprawlMismatches),
                    category: 'typography_sprawl',
                    message: 'This page mixes too many visible text font families.',
                    evidence: formatMismatchEvidence(sprawlMismatches),
                    recommendation: 'Prefer one display family plus one sans family unless a third family is intentionally documented.',
                    screenshotPath: page.viewportScreenshotPath || ''
                }));
            }

            if (page.drawerBrand?.exists) {
                const drawerVsHeader = compareBrandSurfaces(page.headerBrand, page.drawerBrand, options);

                if (drawerVsHeader.length > 0) {
                    findings.push(createFinding({
                        route: page.route,
                        viewport,
                        area: 'mobile_drawer',
                        severity: highestSeverity(drawerVsHeader),
                        category: 'drawer_brand_drift',
                        message: 'The mobile drawer brand does not match the page header brand.',
                        evidence: formatMismatchEvidence(drawerVsHeader),
                        recommendation: 'Usually keep the drawer logo/title/subtitle visually aligned with the main header unless the difference is intentional.',
                        screenshotPath: page.drawerScreenshotPath || page.viewportScreenshotPath || ''
                    }));
                }

                if (page.route !== home.route && home.drawerBrand?.exists) {
                    const drawerVsHomeDrawer = compareBrandSurfaces(home.drawerBrand, page.drawerBrand, options);

                    if (drawerVsHomeDrawer.length > 0) {
                        findings.push(createFinding({
                            route: page.route,
                            viewport,
                            area: 'mobile_drawer',
                            severity: highestSeverity(drawerVsHomeDrawer),
                            category: 'drawer_system_drift',
                            message: 'The mobile drawer brand drifts from the home drawer reference.',
                            evidence: formatMismatchEvidence(drawerVsHomeDrawer),
                            recommendation: 'Keep drawer identity surfaces homogeneous across routes so navigation feels like one product.',
                            screenshotPath: page.drawerScreenshotPath || page.viewportScreenshotPath || ''
                        }));
                    }
                }
            }
        }
    }

    return findings;
}

function summarizeHomogeneityFindings(findings = []) {
    return {
        total: findings.length,
        high: findings.filter((finding) => finding.severity === 'high').length,
        medium: findings.filter((finding) => finding.severity === 'medium').length,
        low: findings.filter((finding) => finding.severity === 'low').length,
        byCategory: findings.reduce((counts, finding) => ({
            ...counts,
            [finding.category]: (counts[finding.category] || 0) + 1
        }), {})
    };
}

module.exports = {
    DEFAULT_BRAND_POLICY,
    DEFAULT_HEADER_POLICY,
    buildHomogeneityFindings,
    compareBrandSurfaces,
    compareHeaderCtaSurface,
    compareHeaderDropdownSystems,
    compareHeaderLayout,
    compareHeaderNavigationMotion,
    compareHeaderSurface,
    compareHeaderSystems,
    compareTypographySurfaces,
    normalizeAssetPath,
    normalizeFontToken,
    normalizeRoute,
    normalizeText,
    summarizeHomogeneityFindings
};
