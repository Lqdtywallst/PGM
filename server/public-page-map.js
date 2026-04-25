const path = require('path');

const PUBLIC_PAGE_FILE_MAP = Object.freeze({
    '/': 'index.html',
    '/about.html': 'about.html',
    '/contact.html': 'contact.html',
    '/fleet.html': 'fleet.html',
    '/locations.html': 'locations.html',
    '/reservation-lookup.html': 'reservation-lookup.html',
    '/services.html': 'services.html',
    '/luxury-car-rental-dubai.html': 'pages/guides/luxury-car-rental-dubai.html',
    '/abu-dhabi-luxury-car-rental.html': 'pages/guides/abu-dhabi-luxury-car-rental.html',
    '/dubai-airport-luxury-car-rental.html': 'pages/guides/dubai-airport-luxury-car-rental.html',
    '/palm-jumeirah-luxury-car-rental.html': 'pages/guides/palm-jumeirah-luxury-car-rental.html',
    '/dubai-marina-luxury-car-rental.html': 'pages/guides/dubai-marina-luxury-car-rental.html',
    '/supercar-rental-dubai.html': 'pages/guides/supercar-rental-dubai.html',
    '/airport-concierge-dubai.html': 'pages/services/airport-concierge-dubai.html',
    '/chauffeur-service-dubai.html': 'pages/services/chauffeur-service-dubai.html',
    '/hotel-villa-airport-delivery-dubai.html': 'pages/services/hotel-villa-airport-delivery-dubai.html',
    '/wedding-event-car-rental-dubai.html': 'pages/services/wedding-event-car-rental-dubai.html',
    '/business-car-rental-dubai.html': 'pages/services/business-car-rental-dubai.html',
    '/monthly-luxury-car-rental-dubai.html': 'pages/services/monthly-luxury-car-rental-dubai.html',
    '/lamborghini-rental-dubai.html': 'pages/brands/lamborghini-rental-dubai.html',
    '/ferrari-rental-dubai.html': 'pages/brands/ferrari-rental-dubai.html',
    '/mercedes-rental-dubai.html': 'pages/brands/mercedes-rental-dubai.html',
    '/porsche-rental-dubai.html': 'pages/brands/porsche-rental-dubai.html',
    '/rolls-royce-rental-dubai.html': 'pages/brands/rolls-royce-rental-dubai.html',
    '/lamborghini-huracan-evo-spyder-rental-dubai.html': 'pages/vehicles/lamborghini-huracan-evo-spyder-rental-dubai.html',
    '/lamborghini-urus-rental-dubai.html': 'pages/vehicles/lamborghini-urus-rental-dubai.html',
    '/ferrari-296-gts-rental-dubai.html': 'pages/vehicles/ferrari-296-gts-rental-dubai.html',
    '/mercedes-g63-amg-rental-dubai.html': 'pages/vehicles/mercedes-g63-amg-rental-dubai.html',
    '/porsche-992-gt3-rental-dubai.html': 'pages/vehicles/porsche-992-gt3-rental-dubai.html',
    '/rolls-royce-cullinan-black-badge-rental-dubai.html': 'pages/vehicles/rolls-royce-cullinan-black-badge-rental-dubai.html',
    '/terms-and-conditions.html': 'pages/legal/terms-and-conditions.html',
    '/terms-and-conditions-uae.html': 'pages/legal/terms-and-conditions-uae.html',
    '/app/reserve/page.html': 'app/reserve/page.html'
});

const FILE_PUBLIC_PATH_MAP = Object.freeze(
    Object.fromEntries(
        Object.entries(PUBLIC_PAGE_FILE_MAP).map(([publicPath, filePath]) => [normalizeFilePath(filePath), publicPath])
    )
);

function normalizePublicPath(urlPath) {
    const pathname = String(urlPath || '/').split(/[?#]/)[0] || '/';
    return pathname === '/index.html' ? '/' : pathname;
}

function normalizeFilePath(filePath) {
    return String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function siteFileForPublicPath(siteRoot, urlPath) {
    const publicPath = normalizePublicPath(urlPath);
    const relativePath = PUBLIC_PAGE_FILE_MAP[publicPath] || publicPath.replace(/^\//, '');
    return path.join(siteRoot, relativePath);
}

function publicPathForSiteFile(siteRoot, filePath) {
    const relativePath = normalizeFilePath(path.relative(siteRoot, filePath));
    return FILE_PUBLIC_PATH_MAP[relativePath] || (relativePath === 'index.html' ? '/' : `/${relativePath}`);
}

module.exports = {
    PUBLIC_PAGE_FILE_MAP,
    publicPathForSiteFile,
    siteFileForPublicPath
};
