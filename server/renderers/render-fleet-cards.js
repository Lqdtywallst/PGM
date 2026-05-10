const fs = require("fs");
const path = require("path");
const { escapeHtml } = require("../shared/html-utils");

const PHONE_E164 = "971586122568";
const PHONE_DISPLAY = "+971586122568";
const cardsPath = path.join(__dirname, "..", "data", "fleet-cards.json");
const fleetHtmlPath = path.join(__dirname, "..", "..", "site", "pages", "core", "fleet.html");

function formatAed(value) {
    return `${Number(value).toLocaleString("en-US")} AED`;
}

function buildWhatsAppHref(message) {
    return `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(message)}`;
}

function requireString(value, message) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(message);
    }
}

function validateCard(card) {
    if (!card || typeof card !== "object") {
        throw new Error("Invalid fleet card entry.");
    }

    requireString(card.id, "Each fleet card needs an id.");
    requireString(card.brandKey, `Card "${card.id}" needs a brandKey.`);
    requireString(card.brand, `Card "${card.id}" needs a brand label.`);
    requireString(card.href, `Card "${card.id}" needs an href.`);
    requireString(card.image?.src, `Card "${card.id}" needs an image src.`);
    requireString(card.image?.alt, `Card "${card.id}" needs an image alt.`);
    requireString(card.utility?.badge, `Card "${card.id}" needs a badge.`);
    requireString(card.utility?.trust, `Card "${card.id}" needs a trust line.`);
    requireString(card.heading?.accent, `Card "${card.id}" needs an accent.`);
    requireString(card.copy?.title, `Card "${card.id}" needs a title.`);
    requireString(card.copy?.description, `Card "${card.id}" needs a description.`);
    requireString(card.copy?.salesLine, `Card "${card.id}" needs a sales line.`);
    requireString(card.booking?.priceNote, `Card "${card.id}" needs a price note.`);
    requireString(card.contact?.whatsappText, `Card "${card.id}" needs a WhatsApp message.`);

    if (!Number.isFinite(card.pricePerDay)) {
        throw new Error(`Card "${card.id}" needs a numeric pricePerDay.`);
    }

    if (!Array.isArray(card.types) || !card.types.length) {
        throw new Error(`Card "${card.id}" needs at least one type.`);
    }

    if (!Array.isArray(card.copy?.specs) || card.copy.specs.length < 1 || card.copy.specs.length > 3) {
        throw new Error(`Card "${card.id}" needs 1 to 3 specs.`);
    }
}

function renderCard(card) {
    validateCard(card);

    const typeAttr = card.types.join(" ");
    const variantAttr = card.variant ? ` data-variant="${escapeHtml(card.variant)}"` : "";
    const specsHtml = card.copy.specs
        .map((spec) => `                                                <span class="fleet-card__spec">${escapeHtml(spec)}</span>`)
        .join("\n");

    return [
        `                            <article class="fleet-card js-fleet-card" data-id="${escapeHtml(card.id)}" data-brand="${escapeHtml(card.brandKey)}" data-type="${escapeHtml(typeAttr)}" data-price="${escapeHtml(card.pricePerDay)}" data-detail-href="${escapeHtml(card.href)}" tabindex="0" aria-label="View ${escapeHtml(card.brand)} ${escapeHtml(card.copy.title)} details"${variantAttr}>`,
        `                                <a class="fleet-card__media" href="${escapeHtml(card.href)}">`,
        `                                    <img src="${escapeHtml(card.image.src)}" alt="${escapeHtml(card.image.alt)}" loading="${escapeHtml(card.image.loading || "lazy")}">`,
        `                                </a>`,
        `                                <div class="fleet-card__content">`,
        `                                    <div class="fleet-card__utility-row">`,
        `                                        <span class="fleet-card__badge">${escapeHtml(card.utility.badge)}</span>`,
        `                                        <span class="fleet-card__trust">${escapeHtml(card.utility.trust)}</span>`,
        `                                    </div>`,
        `                                    <div class="fleet-card__heading">`,
        `                                        <span class="fleet-card__brand">${escapeHtml(card.brand)}</span>`,
        `                                        <span class="fleet-card__accent">${escapeHtml(card.heading.accent)}</span>`,
        `                                    </div>`,
        ``,
        `                                    <div class="fleet-card__body-grid">`,
        `                                        <div class="fleet-card__copy">`,
        `                                            <h3 class="fleet-card__title"><a href="${escapeHtml(card.href)}">${escapeHtml(card.copy.title)}</a></h3>`,
        `                                            <p class="fleet-card__description">${escapeHtml(card.copy.description)}</p>`,
        `                                            <p class="fleet-card__sales-line">${escapeHtml(card.copy.salesLine)}</p>`,
        `                                            <div class="fleet-card__specs">`,
        specsHtml,
        `                                            </div>`,
        `                                        </div>`,
        ``,
        `                                        <div class="fleet-card__booking">`,
        `                                            <div class="fleet-card__price-row">`,
        `                                                <div>`,
        `                                                    <span class="fleet-card__price-kicker">From per day</span>`,
        `                                                    <strong class="fleet-card__price-value">${escapeHtml(formatAed(card.pricePerDay))}</strong>`,
        `                                                </div>`,
        `                                                <span class="fleet-card__price-note">${escapeHtml(card.booking.priceNote)}</span>`,
        `                                            </div>`,
        `                                            <a class="fleet-card__primary" href="${escapeHtml(card.href)}">${escapeHtml(card.booking.primaryLabel || "More information")}</a>`,
        `                                        </div>`,
        `                                    </div>`,
        ``,
        `                                </div>`,
        `                                <div class="fleet-card__contact-row">`,
        `                                    <a class="fleet-card__secondary" href="tel:${escapeHtml(PHONE_DISPLAY)}">Call</a>`,
        `                                    <a class="fleet-card__secondary fleet-card__secondary--wa" href="${escapeHtml(buildWhatsAppHref(card.contact.whatsappText))}" target="_blank" rel="noopener">WhatsApp</a>`,
        `                                </div>`,
        `                            </article>`
    ].join("\n");
}

function renderCards(cards) {
    return cards.map(renderCard).join("\n\n");
}

function replaceFleetCards(html, cardsMarkup, newline) {
    const startMarker = "<!-- FLEET_CARDS_START -->";
    const endMarker = "<!-- FLEET_CARDS_END -->";

    if (html.includes(startMarker) && html.includes(endMarker)) {
        return {
            found: true,
            html: html.replace(
                new RegExp(`([ \\t]*${startMarker}[\\s\\S]*?[ \\t]*${endMarker})`, "m"),
                [
                    `                            ${startMarker}`,
                    cardsMarkup,
                    `                            ${endMarker}`
                ].join(newline)
            )
        };
    }

    const pattern = /([ \t]*<div class="fleet-results__list js-fleet-grid">[\r\n]+)([\s\S]*?)([ \t]*<\/div>[\r\n]+[ \t]*<div class="fleet-browser__empty js-fleet-empty")/m;

    if (!pattern.test(html)) {
        return {
            found: false,
            html
        };
    }

    return {
        found: true,
        html: html.replace(
            pattern,
            [
                `$1`,
                `                            ${startMarker}`,
                cardsMarkup,
                `                            ${endMarker}`,
                `$3`
            ].join(newline)
        )
    };
}

function syncFleetHtmlFromData() {
    const rawCards = fs.readFileSync(cardsPath, "utf8");
    const cards = JSON.parse(rawCards);
    const html = fs.readFileSync(fleetHtmlPath, "utf8");
    const newline = html.includes("\r\n") ? "\r\n" : "\n";
    const cardsMarkup = renderCards(cards).replace(/\n/g, newline);
    const replacement = replaceFleetCards(html, cardsMarkup, newline);

    if (!replacement.found) {
        throw new Error("Could not locate the fleet cards block in fleet.html.");
    }

    if (replacement.html !== html) {
        fs.writeFileSync(fleetHtmlPath, replacement.html, "utf8");
    }

    return {
        count: cards.length,
        fleetHtmlPath,
        cardsPath,
        changed: replacement.html !== html
    };
}

function main() {
    const result = syncFleetHtmlFromData();
    console.log(
        `Rendered ${result.count} fleet cards into ${result.fleetHtmlPath}` +
        (result.changed ? "" : " (already up to date)")
    );
}

if (require.main === module) {
    main();
}

module.exports = {
    formatAed,
    validateCard,
    renderCard,
    renderCards,
    replaceFleetCards,
    syncFleetHtmlFromData
};
