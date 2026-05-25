const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../shared/html-utils');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');
const cardsPath = path.join(__dirname, '..', 'data', 'fleet-cards.json');
const vehiclePagesRoot = path.join(siteRoot, 'pages', 'vehicles');
const imageRoot = path.join(siteRoot, 'images', 'fleet');

const startMarker = '<!-- VEHICLE_MOTHER_CONTENT_START -->';
const endMarker = '<!-- VEHICLE_MOTHER_CONTENT_END -->';

const displayNameOverrides = {
    'black-mercedes-s680-maybach': 'Black Mercedes S680 Maybach',
    'blue-porsche-gt3-rs': 'Blue Porsche GT3 RS',
    'bronze-mercedes-g63': 'Bronze Mercedes G63',
    'mercedes-benz-sl63-amg': 'Mercedes-Benz SL63 AMG'
};

function readUtf8(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeUtf8(filePath, value) {
    fs.writeFileSync(filePath, value, 'utf8');
}

function normalizeNewlines(value) {
    return String(value).replace(/\r\n?|\n/g, '\n');
}

function toPublicImagePath(filePath) {
    return `./images/fleet/${path.relative(imageRoot, filePath).replace(/\\/g, '/')}`;
}

function toVehiclePagePath(card) {
    const fileName = String(card.href || '').replace(/^\.\//, '');
    return path.join(vehiclePagesRoot, fileName);
}

function vehicleName(card) {
    if (displayNameOverrides[card.id]) {
        return displayNameOverrides[card.id];
    }

    return `${card.brand} ${card.copy.title}`.replace(/\s+/g, ' ').trim();
}

function formatAed(value) {
    return `${Number(value).toLocaleString('en-US')} AED`;
}

function sentenceCase(value) {
    const input = String(value || '').trim();
    return input ? input.charAt(0).toUpperCase() + input.slice(1) : '';
}

function captionFromFile(filePath, index) {
    const baseName = path.basename(filePath, path.extname(filePath));
    const cleaned = baseName
        .replace(/^\d+[-_\s]*/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

    return cleaned ? sentenceCase(cleaned) : `Image ${index + 1}`;
}

function listVehicleImages(card) {
    const imageSrc = String(card.image?.src || '').replace(/^\.\//, '');
    const imageDir = path.join(siteRoot, path.dirname(imageSrc));

    if (!imageDir.startsWith(imageRoot) || !fs.existsSync(imageDir)) {
        return [];
    }

    return fs.readdirSync(imageDir)
        .filter((entry) => /\.(?:avif|webp|png|jpe?g)$/i.test(entry))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map((entry, index) => {
            const filePath = path.join(imageDir, entry);

            return {
                src: toPublicImagePath(filePath),
                alt: `${vehicleName(card)} ${captionFromFile(filePath, index).toLowerCase()} in Dubai`,
                caption: captionFromFile(filePath, index)
            };
        });
}

function firstUsefulImages(card, minCount = 2) {
    const images = listVehicleImages(card);

    if (images.length >= minCount) {
        return images;
    }

    return [
        {
            src: card.image.src,
            alt: card.image.alt,
            caption: 'Main image'
        }
    ];
}

function compactBestFit(card) {
    return String(card.copy.salesLine || card.copy.description || '')
        .replace(/^Best\s+for\s+/i, '')
        .replace(/\.$/, '')
        .trim();
}

function relatedCars(card, cards) {
    const cardsById = new Map(cards.map((candidate) => [candidate.id, candidate]));
    const explicit = Array.isArray(card.relatedIds)
        ? card.relatedIds
            .map((id) => cardsById.get(id))
            .filter((candidate) => candidate && candidate.id !== card.id)
        : [];
    const byBrand = cards.filter((candidate) => candidate.id !== card.id && candidate.brandKey === card.brandKey);
    const byVariant = cards.filter((candidate) => candidate.id !== card.id && candidate.brandKey !== card.brandKey && candidate.variant === card.variant);
    const fallback = cards.filter((candidate) => candidate.id !== card.id);
    const unique = [];

    [...explicit, ...byBrand, ...byVariant, ...fallback].forEach((candidate) => {
        if (!unique.some((item) => item.id === candidate.id)) {
            unique.push(candidate);
        }
    });

    return unique.slice(0, 3).map((candidate) => ({
        href: candidate.href,
        image: candidate.image,
        title: vehicleName(candidate),
        badge: candidate.utility.badge,
        price: formatAed(candidate.pricePerDay),
        copy: candidate.copy.salesLine
    }));
}

function imageAt(images, index, fallback) {
    return images[index] || images[0] || fallback;
}

function normalizeImageSource(value) {
    return String(value || '').replace(/^\.\//, '');
}

function extractLandingReserveImageSources(html) {
    const normalizedHtml = normalizeNewlines(html);
    const reserveStart = normalizedHtml.indexOf('<section class="vehicle-landing-reserve"');
    const reserveEnd = normalizedHtml.indexOf(startMarker);

    if (reserveStart === -1 || reserveEnd === -1 || reserveEnd <= reserveStart) {
        return [];
    }

    return Array.from(normalizedHtml.slice(reserveStart, reserveEnd).matchAll(/<img\s+[^>]*src="([^"]+)"/g))
        .map((match) => match[1]);
}

function previewImageForVehicle(images, fallback, excludedSources = []) {
    const excluded = new Set(excludedSources.map(normalizeImageSource));
    const candidates = [...images.slice(4), ...images.slice(0, 4), fallback].filter(Boolean);

    return candidates.find((image) => !excluded.has(normalizeImageSource(image.src))) || candidates[0] || fallback;
}

function previewImageOverride(card) {
    const override = card.motherPreviewImage;

    if (!override?.src) {
        return null;
    }

    return {
        src: override.src,
        alt: override.alt || `${vehicleName(card)} detail in Dubai`
    };
}

function renderRelatedVisualItem(item) {
    return [
        `                <a class="vehicle-pdp-related-card" href="${escapeHtml(item.href)}">`,
        '                    <span class="vehicle-pdp-related-card__media">',
        `                        <img src="${escapeHtml(item.image.src)}" alt="${escapeHtml(item.image.alt)}" decoding="async" loading="lazy">`,
        '                    </span>',
        '                    <span class="vehicle-pdp-related-card__body">',
        `                        <span class="vehicle-pdp-related-card__badge">${escapeHtml(item.badge)}</span>`,
        `                        <strong>${escapeHtml(item.title)}</strong>`,
        `                        <small>${escapeHtml(item.copy)}</small>`,
        `                        <em>From ${escapeHtml(item.price)} / day</em>`,
        '                    </span>',
        '                </a>'
    ].join('\n');
}

function renderVehicleMotherContent(card, cards = [], options = {}) {
    const name = vehicleName(card);
    const titleId = `${card.id}-cinema-title`;
    const images = firstUsefulImages(card);
    const posterImage = previewImageOverride(card) || previewImageForVehicle(images, card.image, options.excludePreviewImageSources);
    const related = relatedCars(card, cards);

    return [
        `        <section class="vehicle-section vehicle-pdp-cinema" aria-labelledby="${escapeHtml(titleId)}">`,
        '            <div class="vehicle-pdp-cinema__shell">',
        '                <article class="vehicle-pdp-video-card" aria-label="Premium vehicle photo preview">',
        '                    <figure class="vehicle-pdp-video-card__media">',
        `                        <img src="${escapeHtml(posterImage.src)}" alt="${escapeHtml(posterImage.alt)}" decoding="async" loading="lazy">`,
        '                        <figcaption class="vehicle-pdp-video-card__overlay">',
        '                            <span>Featured detail</span>',
        `                            <strong>${escapeHtml(name)} with the stance, finish and cabin feel guests compare before booking.</strong>`,
        '                        </figcaption>',
        '                    </figure>',
        '                </article>',
        '',
        '                <div class="vehicle-pdp-cinema__copy">',
        '                    <span class="section-kicker">Premium use</span>',
        `                    <h2 id="${escapeHtml(titleId)}">${escapeHtml(card.copy.title)} for a clean Dubai handover.</h2>`,
        `                    <p>${escapeHtml(card.copy.description)} ${escapeHtml(card.copy.salesLine)}</p>`,
        `                    <a class="vehicle-pdp-section-link vehicle-pdp-cinema__link" href="#vehicle-booking">Reserve ${escapeHtml(card.copy.title)}</a>`,
        '                </div>',
        '            </div>',
        '        </section>',
        '',
        '        <section class="vehicle-section vehicle-pdp-related-visual">',
        '            <div class="vehicle-section__heading vehicle-section__heading--with-link">',
        '                <div>',
        '                    <span class="section-kicker">Related cars</span>',
        `                    <h2>Nearby choices if the ${escapeHtml(card.copy.title)} is not the exact fit.</h2>`,
        '                </div>',
        '                <a class="vehicle-pdp-section-link" href="./fleet.html">View full fleet</a>',
        '            </div>',
        '            <div class="vehicle-pdp-related-visual__grid">',
        related.map(renderRelatedVisualItem).join('\n'),
        '            </div>',
        '        </section>'
    ].join('\n');
}

function replaceVehicleMotherContent(html, contentMarkup) {
    const normalizedHtml = normalizeNewlines(html);
    const block = [startMarker, contentMarkup, endMarker].join('\n');

    if (normalizedHtml.includes(startMarker) && normalizedHtml.includes(endMarker)) {
        return normalizedHtml.replace(
            new RegExp(`[ \\t]*${escapeRegExp(startMarker)}[\\s\\S]*?[ \\t]*${escapeRegExp(endMarker)}`),
            block
        );
    }

    const pattern = /(<section class="vehicle-landing-reserve"[\s\S]*?<\/section>\s*<\/div>\s*<\/section>)([\s\S]*?)(\s*<\/main>)/;

    if (!pattern.test(normalizedHtml)) {
        throw new Error('Could not locate the vehicle landing reserve block.');
    }

    return normalizedHtml.replace(pattern, `$1\n\n${block}$3`);
}

function hasSchemaType(node, schemaType) {
    const type = node && node['@type'];

    return Array.isArray(type) ? type.includes(schemaType) : type === schemaType;
}

function withoutFaqSchema(data) {
    if (!data || typeof data !== 'object') {
        return { value: data, changed: false };
    }

    if (hasSchemaType(data, 'FAQPage')) {
        return { value: null, changed: true };
    }

    if (!Array.isArray(data['@graph'])) {
        return { value: data, changed: false };
    }

    const filteredGraph = data['@graph'].filter((node) => !hasSchemaType(node, 'FAQPage'));

    if (filteredGraph.length === data['@graph'].length) {
        return { value: data, changed: false };
    }

    return {
        value: {
            ...data,
            '@graph': filteredGraph
        },
        changed: true
    };
}

function indentJson(value, indent = '    ') {
    return String(value)
        .split('\n')
        .map((line) => `${indent}${line}`)
        .join('\n');
}

function removeFaqStructuredData(html) {
    return normalizeNewlines(html).replace(
        /(<script\s+type=["']application\/ld\+json["']>\s*)([\s\S]*?)(\s*<\/script>)/g,
        (match, openTag, rawJson) => {
            try {
                const parsed = JSON.parse(rawJson.trim());
                const result = withoutFaqSchema(parsed);

                if (!result.changed) {
                    return match;
                }

                if (!result.value) {
                    return '';
                }

                return `${openTag.trimEnd()}\n${indentJson(JSON.stringify(result.value, null, 2))}\n    </script>`;
            } catch (error) {
                return match;
            }
        }
    );
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function syncVehiclePagesFromData() {
    const cards = JSON.parse(readUtf8(cardsPath));
    const touchedFiles = [];

    cards.forEach((card) => {
        const pagePath = toVehiclePagePath(card);

        if (!fs.existsSync(pagePath)) {
            throw new Error(`Missing vehicle page for "${card.id}": ${pagePath}`);
        }

        const html = readUtf8(pagePath);
        const contentMarkup = renderVehicleMotherContent(card, cards, {
            excludePreviewImageSources: extractLandingReserveImageSources(html)
        });
        const nextHtml = removeFaqStructuredData(replaceVehicleMotherContent(html, contentMarkup));

        if (nextHtml !== normalizeNewlines(html)) {
            writeUtf8(pagePath, nextHtml);
            touchedFiles.push(pagePath);
        }
    });

    return {
        count: cards.length,
        touchedFiles,
        cardsPath
    };
}

function main() {
    const result = syncVehiclePagesFromData();
    console.log(JSON.stringify({
        vehiclePages: result.count,
        changedCount: result.touchedFiles.length,
        cardsPath: result.cardsPath
    }, null, 2));
}

if (require.main === module) {
    main();
}

module.exports = {
    compactBestFit,
    extractLandingReserveImageSources,
    listVehicleImages,
    previewImageForVehicle,
    removeFaqStructuredData,
    renderVehicleMotherContent,
    replaceVehicleMotherContent,
    syncVehiclePagesFromData,
    vehicleName
};
