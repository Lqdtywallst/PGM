const fs = require("fs");
const path = require("path");
const { escapeHtml } = require("../shared/html-utils");
const { renderImageDimensionAttributes } = require("../shared/image-dimensions");

const PHONE_E164 = "971586122568";
const PHONE_DISPLAY = "+971586122568";
const siteRoot = path.join(__dirname, "..", "..", "site");
const cardsPath = path.join(__dirname, "..", "data", "fleet-cards.json");
const fleetHtmlPath = path.join(__dirname, "..", "..", "site", "pages", "core", "fleet.html");
const homeHtmlPath = path.join(__dirname, "..", "..", "site", "index.html");
const homeFeaturedCardIds = [
    "lamborghini-huracan-evo-spyder",
    "ferrari-296-gts",
    "lamborghini-urus-sport",
    "rolls-royce-cullinan-black-badge"
];

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

function classNames(...values) {
    return values.filter(Boolean).join(" ");
}

function homeVariantClass(card) {
    const idSuffix = String(card.id || "").split("-")[0];
    return idSuffix ? ` fleet-visual-card--${idSuffix}` : "";
}

function renderCard(card, options = {}) {
    validateCard(card);

    const isHome = options.context === "home";
    const typeAttr = card.types.join(" ");
    const variantAttr = card.variant ? ` data-variant="${escapeHtml(card.variant)}"` : "";
    const articleClass = classNames(
        "fleet-card",
        isHome ? `fleet-card--home fleet-visual-card${homeVariantClass(card)}` : "",
        isHome ? "" : "js-fleet-card"
    );
    const mediaClass = classNames("fleet-card__media", isHome && "fleet-visual-card__media");
    const shadeHtml = isHome ? `                                    <span class="fleet-visual-card__shade" aria-hidden="true"></span>` : "";
    const contentClass = classNames("fleet-card__content", isHome && "fleet-visual-card__body");
    const utilityRowClass = classNames("fleet-card__utility-row", isHome && "fleet-visual-card__utility-row");
    const badgeClass = classNames("fleet-card__badge", isHome && "fleet-visual-card__badge");
    const trustClass = classNames("fleet-card__trust", isHome && "fleet-visual-card__trust");
    const brandClass = classNames("fleet-card__brand", isHome && "fleet-visual-card__label");
    const titleClass = classNames("fleet-card__title", isHome && "fleet-visual-card__title");
    const titleLinkClass = classNames(isHome && "fleet-visual-card__title-link");
    const descriptionClass = classNames("fleet-card__description", isHome && "fleet-visual-card__description");
    const salesLineClass = classNames("fleet-card__sales-line", isHome && "fleet-visual-card__sales-line");
    const specsClass = classNames("fleet-card__specs", isHome && "fleet-visual-card__spec-list");
    const specClass = classNames("fleet-card__spec", isHome && "fleet-visual-card__spec");
    const bookingClass = classNames("fleet-card__booking", isHome && "fleet-visual-card__booking");
    const priceRowClass = classNames("fleet-card__price-row", isHome && "fleet-visual-card__price-box");
    const priceKickerClass = classNames("fleet-card__price-kicker", isHome && "fleet-visual-card__price-kicker");
    const priceValueClass = classNames("fleet-card__price-value", isHome && "fleet-visual-card__price-value");
    const priceNoteClass = classNames("fleet-card__price-note", isHome && "fleet-visual-card__price-note");
    const actionsClass = classNames(isHome && "fleet-visual-card__actions");
    const primaryClass = classNames("fleet-card__primary", isHome && "fleet-visual-card__primary");
    const homeDataAttrs = isHome
        ? ` data-home-fleet-car="${escapeHtml(`${card.brand} ${card.copy.title}`)}" data-home-fleet-price="${escapeHtml(card.pricePerDay)}"`
        : "";
    const specsHtml = card.copy.specs
        .map((spec) => `                                                <span class="${specClass}">${escapeHtml(spec)}</span>`)
        .join("\n");
    const imageDimensions = renderImageDimensionAttributes(siteRoot, card.image.src);

    return [
        `                            <article class="${articleClass}" data-id="${escapeHtml(card.id)}" data-brand="${escapeHtml(card.brandKey)}" data-type="${escapeHtml(typeAttr)}" data-price="${escapeHtml(card.pricePerDay)}" data-detail-href="${escapeHtml(card.href)}" tabindex="0" aria-label="View ${escapeHtml(card.brand)} ${escapeHtml(card.copy.title)} details"${variantAttr}>`,
        `                                <a class="${mediaClass}" href="${escapeHtml(card.href)}"${homeDataAttrs}>`,
        `                                    <img src="${escapeHtml(card.image.src)}" alt="${escapeHtml(card.image.alt)}"${imageDimensions} loading="${escapeHtml(card.image.loading || "lazy")}" decoding="async">`,
        shadeHtml,
        `                                </a>`,
        `                                <div class="${contentClass}">`,
        `                                    <div class="${utilityRowClass}">`,
        `                                        <span class="${badgeClass}">${escapeHtml(card.utility.badge)}</span>`,
        `                                        <span class="${trustClass}">${escapeHtml(card.utility.trust)}</span>`,
        `                                    </div>`,
        `                                    <div class="fleet-card__heading">`,
        `                                        <span class="${brandClass}">${escapeHtml(card.brand)}</span>`,
        `                                        <span class="fleet-card__accent">${escapeHtml(card.heading.accent)}</span>`,
        `                                    </div>`,
        ``,
        `                                    <div class="fleet-card__body-grid">`,
        `                                        <div class="fleet-card__copy">`,
        `                                            <h3 class="${titleClass}"><a${titleLinkClass ? ` class="${titleLinkClass}"` : ""} href="${escapeHtml(card.href)}"${homeDataAttrs}>${escapeHtml(card.copy.title)}</a></h3>`,
        `                                            <p class="${descriptionClass}">${escapeHtml(card.copy.description)}</p>`,
        `                                            <p class="${salesLineClass}">${escapeHtml(card.copy.salesLine)}</p>`,
        `                                            <div class="${specsClass}">`,
        specsHtml,
        `                                            </div>`,
        `                                        </div>`,
        ``,
        `                                        <div class="${bookingClass}">`,
        `                                            <div class="${priceRowClass}">`,
        `                                                <div>`,
        `                                                    <span class="${priceKickerClass}">From per day</span>`,
        `                                                    <strong class="${priceValueClass}">${escapeHtml(formatAed(card.pricePerDay))}</strong>`,
        `                                                </div>`,
        `                                                <span class="${priceNoteClass}">${escapeHtml(card.booking.priceNote)}</span>`,
        `                                            </div>`,
        actionsClass ? `                                            <div class="${actionsClass}">` : "",
        `                                                <a class="${primaryClass}" href="${escapeHtml(card.href)}"${homeDataAttrs}>${escapeHtml(card.booking.primaryLabel || "View details")}</a>`,
        actionsClass ? `                                            </div>` : "",
        `                                        </div>`,
        `                                    </div>`,
        `                                </div>`,
        `                            </article>`
    ].filter(Boolean).join("\n");
}

function renderCards(cards) {
    return cards.map((card) => renderCard(card)).join("\n\n");
}

function renderHomeCards(cards) {
    const cardById = new Map(cards.map((card) => [card.id, card]));
    return homeFeaturedCardIds
        .map((id) => cardById.get(id))
        .filter(Boolean)
        .map((card) => renderCard(card, { context: "home" }))
        .join("\n\n");
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

function replaceHomeCards(html, cardsMarkup, newline) {
    const startMarker = "<!-- HOME_FLEET_CARDS_START -->";
    const endMarker = "<!-- HOME_FLEET_CARDS_END -->";

    if (html.includes(startMarker) && html.includes(endMarker)) {
        return {
            found: true,
            html: html.replace(
                new RegExp(`([ \\t]*${startMarker}[\\s\\S]*?[ \\t]*${endMarker})`, "m"),
                [
                    `                    ${startMarker}`,
                    cardsMarkup,
                    `                    ${endMarker}`
                ].join(newline)
            )
        };
    }

    const pattern = /([ \t]*<div class="fleet-showcase">[\r\n]+)([\s\S]*?)([ \t]*<\/div>[\r\n]+[\r\n]*[ \t]*<\/div>[\r\n]+[ \t]*<\/section>[\r\n]+[ \t]*<div class="guest-reviews-band">)/m;

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
                `                    ${startMarker}`,
                cardsMarkup,
                `                    ${endMarker}`,
                `$3`
            ].join(newline)
        )
    };
}

function syncFleetHtmlFromData() {
    const rawCards = fs.readFileSync(cardsPath, "utf8");
    const cards = JSON.parse(rawCards);
    const html = fs.readFileSync(fleetHtmlPath, "utf8");
    const homeHtml = fs.readFileSync(homeHtmlPath, "utf8");
    const newline = html.includes("\r\n") ? "\r\n" : "\n";
    const homeNewline = homeHtml.includes("\r\n") ? "\r\n" : "\n";
    const cardsMarkup = renderCards(cards).replace(/\n/g, newline);
    const homeCardsMarkup = renderHomeCards(cards).replace(/\n/g, homeNewline);
    const replacement = replaceFleetCards(html, cardsMarkup, newline);
    const homeReplacement = replaceHomeCards(homeHtml, homeCardsMarkup, homeNewline);

    if (!replacement.found) {
        throw new Error("Could not locate the fleet cards block in fleet.html.");
    }

    if (!homeReplacement.found) {
        throw new Error("Could not locate the home featured fleet cards block in index.html.");
    }

    if (replacement.html !== html) {
        fs.writeFileSync(fleetHtmlPath, replacement.html, "utf8");
    }

    if (homeReplacement.html !== homeHtml) {
        fs.writeFileSync(homeHtmlPath, homeReplacement.html, "utf8");
    }

    return {
        count: cards.length,
        fleetHtmlPath,
        homeHtmlPath,
        cardsPath,
        changed: replacement.html !== html || homeReplacement.html !== homeHtml
    };
}

function main() {
    const result = syncFleetHtmlFromData();
    console.log(
        `Rendered ${result.count} fleet cards into ${result.fleetHtmlPath} and ${result.homeHtmlPath}` +
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
    renderHomeCards,
    replaceFleetCards,
    replaceHomeCards,
    syncFleetHtmlFromData
};
