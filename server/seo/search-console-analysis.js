const DEFAULT_PUBLIC_ORIGIN = 'https://www.dynastyprestigecarrental.com';

const HEADER_ALIASES = {
    query: ['query', 'queries', 'top queries', 'consulta', 'consultas', 'principales consultas'],
    page: ['page', 'pages', 'top pages', 'pagina', 'pagina principal', 'url', 'landing page'],
    clicks: ['clicks', 'clics'],
    impressions: ['impressions', 'impresiones'],
    ctr: ['ctr', 'porcentaje de clics'],
    position: ['position', 'posicion', 'average position', 'posicion media']
};

const MODEL_TARGETS = [
    {
        label: 'Ferrari 296 GTS',
        targetUrl: '/ferrari-296-gts-rental-dubai.html',
        patterns: [/ferrari.*296/i, /296.*gts/i]
    },
    {
        label: 'Ferrari F8 Spider',
        targetUrl: '/ferrari-f8-spider-rental-dubai.html',
        patterns: [/ferrari.*f8/i, /f8.*spider/i]
    },
    {
        label: 'Lamborghini Huracan EVO Spyder',
        targetUrl: '/lamborghini-huracan-evo-spyder-rental-dubai.html',
        patterns: [/huracan/i, /evo.*spyder/i]
    },
    {
        label: 'Lamborghini Urus SE',
        targetUrl: '/lamborghini-urus-rental-dubai.html',
        patterns: [/urus/i]
    },
    {
        label: 'Mercedes G63 AMG',
        targetUrl: '/mercedes-g63-amg-rental-dubai.html',
        patterns: [/g\s*63/i, /g63/i, /g[\s-]*wagon/i, /g[\s-]*class/i]
    },
    {
        label: 'Rolls-Royce Cullinan Black Badge',
        targetUrl: '/rolls-royce-cullinan-black-badge-rental-dubai.html',
        patterns: [/cullinan/i]
    },
    {
        label: 'Mercedes S680 Maybach',
        targetUrl: '/black-mercedes-s680-maybach-rental-dubai.html',
        patterns: [/s\s*680/i, /s680/i, /maybach/i]
    },
    {
        label: 'Porsche GT3 RS',
        targetUrl: '/blue-porsche-gt3-rs-rental-dubai.html',
        patterns: [/gt3\s*rs/i]
    },
    {
        label: 'Porsche 992 GT3',
        targetUrl: '/porsche-992-gt3-rental-dubai.html',
        patterns: [/992.*gt3/i, /gt3(?!\s*rs)/i]
    },
    {
        label: 'Mercedes SL63 AMG',
        targetUrl: '/mercedes-benz-sl63-amg-rental-dubai.html',
        patterns: [/sl\s*63/i, /sl63/i]
    }
];

const BRAND_TARGETS = [
    { label: 'Lamborghini', targetUrl: '/lamborghini-rental-dubai.html', pattern: /lamborghini/i },
    { label: 'Ferrari', targetUrl: '/ferrari-rental-dubai.html', pattern: /ferrari/i },
    { label: 'Mercedes', targetUrl: '/mercedes-rental-dubai.html', pattern: /mercedes|benz|amg/i },
    { label: 'Porsche', targetUrl: '/porsche-rental-dubai.html', pattern: /porsche/i },
    { label: 'Rolls-Royce', targetUrl: '/rolls-royce-rental-dubai.html', pattern: /rolls|royce/i }
];

const SERVICE_TARGETS = [
    { label: 'Airport concierge', targetUrl: '/airport-concierge-dubai.html', pattern: /airport|dxb|dwc|arrival|concierge/i },
    { label: 'Chauffeur service', targetUrl: '/chauffeur-service-dubai.html', pattern: /chauffeur|driver/i },
    { label: 'Hotel, villa and airport delivery', targetUrl: '/hotel-villa-airport-delivery-dubai.html', pattern: /hotel|villa|delivery|handover|residence/i },
    { label: 'Monthly luxury rental', targetUrl: '/monthly-luxury-car-rental-dubai.html', pattern: /monthly|long.?term|month/i },
    { label: 'Business car rental', targetUrl: '/business-car-rental-dubai.html', pattern: /business|corporate|executive/i },
    { label: 'Wedding and event rental', targetUrl: '/wedding-event-car-rental-dubai.html', pattern: /wedding|event|ceremony/i }
];

const LOCATION_TARGETS = [
    { label: 'Abu Dhabi', targetUrl: '/abu-dhabi-luxury-car-rental.html', pattern: /abu\s*dhabi/i },
    { label: 'Dubai airport', targetUrl: '/dubai-airport-luxury-car-rental.html', pattern: /airport|dxb|dwc/i },
    { label: 'Palm Jumeirah', targetUrl: '/palm-jumeirah-luxury-car-rental.html', pattern: /palm|jumeirah/i },
    { label: 'Dubai Marina', targetUrl: '/dubai-marina-luxury-car-rental.html', pattern: /marina|jbr/i },
    { label: 'Dubai city', targetUrl: '/luxury-car-rental-dubai.html', pattern: /dubai/i }
];

function normalizeHeader(value) {
    return String(value || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function countDelimiterOutsideQuotes(line, delimiter) {
    let count = 0;
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                index += 1;
                continue;
            }

            inQuotes = !inQuotes;
            continue;
        }

        if (char === delimiter && !inQuotes) {
            count += 1;
        }
    }

    return count;
}

function detectDelimiter(text) {
    const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim()) || '';
    const candidates = [',', ';', '\t'];
    const [best] = candidates
        .map((delimiter) => ({
            delimiter,
            count: countDelimiterOutsideQuotes(firstLine, delimiter)
        }))
        .sort((left, right) => right.count - left.count);

    return best && best.count > 0 ? best.delimiter : ',';
}

function parseCsv(text, delimiter = detectDelimiter(text)) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let index = 0; index < String(text || '').length; index += 1) {
        const char = text[index];
        const next = text[index + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                cell += '"';
                index += 1;
                continue;
            }

            inQuotes = !inQuotes;
            continue;
        }

        if (char === delimiter && !inQuotes) {
            row.push(cell);
            cell = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') {
                index += 1;
            }

            row.push(cell);
            if (row.some((value) => String(value).trim())) {
                rows.push(row);
            }
            row = [];
            cell = '';
            continue;
        }

        cell += char;
    }

    row.push(cell);
    if (row.some((value) => String(value).trim())) {
        rows.push(row);
    }

    return rows;
}

function headerIndex(headers, key) {
    const aliases = (HEADER_ALIASES[key] || [key]).map(normalizeHeader);
    return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function parseNumber(value) {
    const normalized = String(value || '')
        .replace(/%/g, '')
        .replace(/\s/g, '')
        .replace(/[^\d.,-]/g, '');

    if (!normalized) {
        return 0;
    }

    const commaIndex = normalized.lastIndexOf(',');
    const dotIndex = normalized.lastIndexOf('.');
    let numeric = normalized;

    if (commaIndex > -1 && dotIndex > -1) {
        numeric = commaIndex > dotIndex
            ? normalized.replace(/\./g, '').replace(',', '.')
            : normalized.replace(/,/g, '');
    } else if (/^-?\d{1,3}(,\d{3})+$/.test(normalized)) {
        numeric = normalized.replace(/,/g, '');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
        numeric = normalized.replace(/\./g, '');
    } else if (commaIndex > -1) {
        numeric = normalized.replace(',', '.');
    }

    const parsed = Number(numeric);

    return Number.isFinite(parsed) ? parsed : 0;
}

function parseCtrPercent(value) {
    const text = String(value || '').trim();
    const parsed = parseNumber(text);

    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return text.includes('%') || parsed > 1 ? parsed : parsed * 100;
}

function normalizeUrlPath(value, publicOrigin = DEFAULT_PUBLIC_ORIGIN) {
    const raw = String(value || '').trim();

    if (!raw) {
        return '';
    }

    try {
        const url = new URL(raw, publicOrigin);
        return url.pathname === '/index.html' ? '/' : url.pathname;
    } catch (error) {
        const path = raw.split(/[?#]/)[0];
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return normalizedPath === '/index.html' ? '/' : normalizedPath;
    }
}

function classifyQuery(query) {
    const normalized = String(query || '').toLowerCase();

    if (/dynasty|prestige\s*goal|dynasty\s*prestige|dynastyprestige/i.test(normalized)) {
        return {
            intent: 'marca propia',
            label: 'Dynasty Prestige',
            targetUrl: '/'
        };
    }

    const model = MODEL_TARGETS.find((item) => item.patterns.some((pattern) => pattern.test(normalized)));
    if (model) {
        return {
            intent: 'modelo',
            label: model.label,
            targetUrl: model.targetUrl
        };
    }

    const brand = BRAND_TARGETS.find((item) => item.pattern.test(normalized));
    if (brand) {
        return {
            intent: 'marca',
            label: brand.label,
            targetUrl: brand.targetUrl
        };
    }

    const service = SERVICE_TARGETS.find((item) => item.pattern.test(normalized));
    if (service) {
        return {
            intent: 'servicio',
            label: service.label,
            targetUrl: service.targetUrl
        };
    }

    if (/supercar|exotic|sports?\s+car|convertible|suv/i.test(normalized)) {
        return {
            intent: 'categoría',
            label: 'Supercar / category',
            targetUrl: '/supercar-rental-dubai.html'
        };
    }

    const specificLocation = LOCATION_TARGETS
        .filter((item) => item.label !== 'Dubai city')
        .find((item) => item.pattern.test(normalized));
    if (specificLocation) {
        return {
            intent: 'ubicación',
            label: specificLocation.label,
            targetUrl: specificLocation.targetUrl
        };
    }

    if (/luxury|rent|rental|hire|car/i.test(normalized)) {
        return {
            intent: 'genérica comercial',
            label: 'Luxury car rental Dubai',
            targetUrl: '/luxury-car-rental-dubai.html'
        };
    }

    const location = LOCATION_TARGETS.find((item) => item.pattern.test(normalized));
    if (location) {
        return {
            intent: 'ubicación',
            label: location.label,
            targetUrl: location.targetUrl
        };
    }

    return {
        intent: 'sin clasificar',
        label: 'Review manually',
        targetUrl: ''
    };
}

function expectedCtrForPosition(position) {
    if (!Number.isFinite(position) || position <= 0) return 0;
    if (position <= 1.5) return 28;
    if (position <= 2.5) return 15;
    if (position <= 3.5) return 11;
    if (position <= 5) return 7;
    if (position <= 7) return 4;
    if (position <= 10) return 2;
    if (position <= 20) return 1;
    return 0.4;
}

function opportunityForRow(row, publicOrigin = DEFAULT_PUBLIC_ORIGIN) {
    const classification = classifyQuery(row.query);
    const currentPath = normalizeUrlPath(row.page, publicOrigin);
    const targetPath = classification.targetUrl;
    const expectedCtr = expectedCtrForPosition(row.position);
    const ctrGap = Math.max(0, expectedCtr - row.ctr);
    const potentialClicks = Math.round((row.impressions * ctrGap) / 100);
    const wrongTarget = Boolean(currentPath && targetPath && currentPath !== targetPath);
    let reason = 'monitorizar';
    let action = 'Mantener medición semanal.';
    let score = Math.max(1, row.impressions * 0.01);

    if (wrongTarget) {
        reason = 'posible canibalización o URL objetivo incorrecta';
        action = `Revisar por qué aparece ${currentPath}; reforzar enlaces internos hacia ${targetPath}.`;
        score += row.impressions * 0.9;
    } else if (row.position > 3 && row.position <= 10 && ctrGap >= 2) {
        reason = 'CTR bajo para una posición ya visible';
        action = 'Probar title/meta más comercial sin cambiar la intención de la página.';
        score += potentialClicks * 4 + row.impressions * 0.2;
    } else if (row.position > 10 && row.position <= 20) {
        reason = 'cerca de primera página';
        action = `Reforzar contenido visible y enlaces internos hacia ${targetPath || 'la URL objetivo'}.`;
        score += row.impressions * 0.55;
    } else if (row.position > 20 && row.impressions >= 50) {
        reason = 'demanda existente con ranking débil';
        action = 'Evaluar si falta una sección, comparativa o landing específica.';
        score += row.impressions * 0.25;
    } else if (row.position <= 3 && row.position > 0 && row.ctr >= expectedCtr * 0.5) {
        reason = 'posición fuerte';
        action = 'Proteger URL, snippet y enlaces internos; no tocar sin motivo.';
        score += row.clicks;
    }

    return {
        ...row,
        ...classification,
        currentPath,
        expectedCtr,
        ctrGap: Number(ctrGap.toFixed(2)),
        potentialClicks,
        wrongTarget,
        reason,
        action,
        score: Number(score.toFixed(2))
    };
}

function normalizeRows(csvRows) {
    if (!csvRows.length) {
        return [];
    }

    const headers = csvRows[0];
    const indexes = {
        query: headerIndex(headers, 'query'),
        page: headerIndex(headers, 'page'),
        clicks: headerIndex(headers, 'clicks'),
        impressions: headerIndex(headers, 'impressions'),
        ctr: headerIndex(headers, 'ctr'),
        position: headerIndex(headers, 'position')
    };

    if (indexes.query === -1) {
        throw new Error('El CSV necesita una columna de consulta: Query, Top queries o Consultas.');
    }

    return csvRows.slice(1)
        .map((row) => ({
            query: String(row[indexes.query] || '').trim(),
            page: indexes.page >= 0 ? String(row[indexes.page] || '').trim() : '',
            clicks: indexes.clicks >= 0 ? parseNumber(row[indexes.clicks]) : 0,
            impressions: indexes.impressions >= 0 ? parseNumber(row[indexes.impressions]) : 0,
            ctr: indexes.ctr >= 0 ? parseCtrPercent(row[indexes.ctr]) : 0,
            position: indexes.position >= 0 ? parseNumber(row[indexes.position]) : 0
        }))
        .filter((row) => row.query);
}

function summarizeOpportunities(opportunities) {
    const totals = opportunities.reduce((acc, row) => {
        acc.clicks += row.clicks;
        acc.impressions += row.impressions;
        acc.weightedPosition += row.position * row.impressions;
        acc.intentCounts[row.intent] = (acc.intentCounts[row.intent] || 0) + 1;
        return acc;
    }, {
        clicks: 0,
        impressions: 0,
        weightedPosition: 0,
        intentCounts: {}
    });

    const cannibalization = Array.from(opportunities.reduce((map, row) => {
        if (!row.currentPath) {
            return map;
        }

        const entry = map.get(row.query) || new Set();
        entry.add(row.currentPath);
        map.set(row.query, entry);
        return map;
    }, new Map()).entries())
        .filter(([, pages]) => pages.size > 1)
        .map(([query, pages]) => ({
            query,
            pages: Array.from(pages)
        }));

    return {
        rows: opportunities.length,
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: totals.impressions ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0,
        averagePosition: totals.impressions ? Number((totals.weightedPosition / totals.impressions).toFixed(2)) : 0,
        intentCounts: totals.intentCounts,
        cannibalization
    };
}

function analyzeSearchConsoleCsv(text, options = {}) {
    const rows = normalizeRows(parseCsv(text));
    const opportunities = rows
        .map((row) => opportunityForRow(row, options.publicOrigin || DEFAULT_PUBLIC_ORIGIN))
        .sort((left, right) => right.score - left.score);

    return {
        generatedAt: new Date().toISOString(),
        sourceRows: rows.length,
        summary: summarizeOpportunities(opportunities),
        opportunities
    };
}

module.exports = {
    analyzeSearchConsoleCsv,
    classifyQuery,
    detectDelimiter,
    normalizeRows,
    normalizeUrlPath,
    parseCsv,
    summarizeOpportunities
};
