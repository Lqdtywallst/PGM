const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const strictMode = process.argv.includes('--strict');

const scanTargets = [
    { root: path.join(projectRoot, 'site'), extensions: new Set(['.html']) },
    { root: path.join(projectRoot, 'site/js'), extensions: new Set(['.js']) },
    { root: path.join(projectRoot, 'app/api/reserve'), extensions: new Set(['.js']) }
];

const explicitFiles = [
    path.join(projectRoot, 'server/apps/backend.js')
];

const ignoredFiles = new Set([
    path.normalize(path.join(projectRoot, 'server/audits/test-server.js')),
    path.normalize(path.join(projectRoot, 'scripts/run-copy-audit.js'))
]);

const rules = [
    {
        id: 'mojibake',
        severity: 'high',
        pattern: /(?:Ã¢|Ãƒ|Ã°Å¸|ï¿½)/,
        message: 'Broken encoding or mojibake appears in customer-facing copy.'
    },
    {
        id: 'technical-customer-copy',
        severity: 'medium',
        pattern: /\b(?:backend URL|PaymentIntent|client_secret|stack trace|server logs?|Stripe not configured|localhost|ERR_CONNECTION_REFUSED)\b/i,
        message: 'Technical implementation language leaks into visible or transactional copy.'
    },
    {
        id: 'placeholder-copy',
        severity: 'medium',
        pattern: /\b(?:N\/A|TODO|Lorem ipsum|coming soon|placeholder)\b/i,
        message: 'Placeholder copy should be replaced with a clear premium message.'
    },
    {
        id: 'generic-cta',
        severity: 'low',
        pattern: /\b(?:click here|submit|learn more|read more)\b/i,
        message: 'Generic CTA copy should be made more specific where visible.'
    },
    {
        id: 'spanish-visible-copy',
        severity: 'medium',
        pattern: /\b(?:reserva|reservas|coche|coches|cliente|servidor|correo|pago|enviado|configurado|procesando|fallido|exitoso)\b/i,
        message: 'Spanish terms appeared in a surface that should remain premium English.'
    }
];

function walk(rootPath, extensions, files = []) {
    if (!fs.existsSync(rootPath)) {
        return files;
    }

    for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
        const absolutePath = path.join(rootPath, entry.name);

        if (entry.isDirectory()) {
            walk(absolutePath, extensions, files);
            continue;
        }

        if (extensions.has(path.extname(entry.name).toLowerCase()) && !ignoredFiles.has(path.normalize(absolutePath))) {
            files.push(absolutePath);
        }
    }

    return files;
}

function stripNonCopyHtml(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');
}

function collectHtmlCopySnippets(content) {
    const snippets = [];
    const cleanHtml = stripNonCopyHtml(content);
    const attributePattern = /\b(?:title|content|alt|aria-label|placeholder)=["']([^"']+)["']/gi;
    const textPattern = />([^<>{}]{3,})</g;
    let match;

    while ((match = attributePattern.exec(cleanHtml)) !== null) {
        snippets.push(match[1]);
    }

    while ((match = textPattern.exec(cleanHtml)) !== null) {
        snippets.push(match[1]);
    }

    return snippets;
}

function collectJsCopySnippets(content) {
    const snippets = [];
    const copyLinePattern = /\b(?:showMessage|setStatus|alert|throw new Error|subject|message|error|textContent|placeholder|aria-label|innerHTML)\b|<(?:h[1-6]|p|span|div|a)\b/i;

    content.split(/\r?\n/).forEach((line) => {
        const trimmedLine = line.trim();
        if (
            !trimmedLine ||
            trimmedLine.startsWith('//') ||
            trimmedLine.startsWith('*') ||
            /\bconsole\.(?:log|warn|error|info)\b/.test(trimmedLine) ||
            /(?:lastPaymentError|::placeholder)/.test(trimmedLine) ||
            /\b(?:if|const|let|var)\b/.test(trimmedLine) && /(?:\.test\(|confirmCardPayment|lastPaymentError|::placeholder)/.test(trimmedLine) ||
            !copyLinePattern.test(trimmedLine)
        ) {
            return;
        }

        const cleanedLine = trimmedLine
            .replace(/^\s*(?:return\s+)?/, '')
            .replace(/\\n/g, ' ')
            .replace(/\$\{[^}]+\}/g, ' ')
            .replace(/[`,;]+$/g, '')
            .replace(/^[`'"]|[`'"]$/g, '')
            .trim();

        if (cleanedLine.length >= 3 && /[a-zA-Z]/.test(cleanedLine)) {
            snippets.push(cleanedLine);
        }
    });

    return snippets;
}

function collectCopySnippets(filePath, content) {
    return path.extname(filePath).toLowerCase() === '.html'
        ? collectHtmlCopySnippets(content)
        : collectJsCopySnippets(content);
}

function normalizeSnippet(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .trim();
}

function auditFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const snippets = collectCopySnippets(filePath, content)
        .map(normalizeSnippet)
        .filter((snippet) => snippet.length >= 3);
    const findings = [];

    snippets.forEach((snippet) => {
        rules.forEach((rule) => {
            if (rule.pattern.test(snippet)) {
                findings.push({
                    file: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
                    rule: rule.id,
                    severity: rule.severity,
                    message: rule.message,
                    snippet: snippet.slice(0, 180)
                });
            }
        });
    });

    return findings;
}

function groupFindings(findings) {
    return findings.reduce((groups, finding) => {
        groups[finding.rule] = groups[finding.rule] || [];
        groups[finding.rule].push(finding);
        return groups;
    }, {});
}

const files = [
    ...scanTargets.flatMap((target) => walk(target.root, target.extensions)),
    ...explicitFiles.filter((filePath) => fs.existsSync(filePath))
];
const findings = files.flatMap(auditFile);
const groupedFindings = groupFindings(findings);

console.log('\nCopy audit\n');
console.log(`Scanned ${files.length} files for premium English copy risks.`);

if (findings.length === 0) {
    console.log('No copy risks found.');
    process.exit(0);
}

Object.entries(groupedFindings).forEach(([rule, ruleFindings]) => {
    console.log(`\n${rule} (${ruleFindings.length})`);
    ruleFindings.slice(0, 12).forEach((finding) => {
        console.log(`- [${finding.severity}] ${finding.file}: ${finding.snippet}`);
    });

    if (ruleFindings.length > 12) {
        console.log(`- ... ${ruleFindings.length - 12} more`);
    }
});

console.log('\nCopy audit found risks. Default mode is advisory; use --strict to fail CI.');

if (strictMode) {
    process.exit(1);
}
