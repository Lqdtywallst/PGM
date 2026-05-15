const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(repoRoot, 'site');
const cssRoot = path.join(siteRoot, 'css');
const pagesRoot = path.join(siteRoot, 'pages');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'typography-contract-audit');

const FORBIDDEN_FONT_FAMILIES = [
  'Cormorant',
  'Cormorant Garamond',
  'Inter',
  'Montserrat',
  'Roboto'
];

function walkFiles(root, predicate, output = []) {
  if (!fs.existsSync(root)) {
    return output;
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, output);
      continue;
    }

    if (entry.isFile() && predicate(fullPath)) {
      output.push(fullPath);
    }
  }

  return output;
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || 'high',
    category: finding.category,
    file: relativePath(finding.file),
    line: finding.line || 1,
    message: finding.message,
    evidence: finding.evidence || ''
  });
}

function auditHtmlFontLoading(htmlFiles, findings) {
  for (const filePath of htmlFiles) {
    const text = readText(filePath);
    const lower = text.toLowerCase();

    if (!lower.includes('dp-fonts.css')) {
      addFinding(findings, {
        category: 'font_loading_contract',
        file: filePath,
        line: 1,
        message: 'Public pages should include css/dp-fonts.css before brand/page styles so typography is stable before first paint.'
      });
    }
  }
}

function auditRemoteFontUrls(files, findings) {
  const remoteFontRegex = /https:\/\/fonts\.(?:googleapis|gstatic)\.com[^\s"'`)<>]*/gi;

  for (const filePath of files) {
    const text = readText(filePath);
    for (const match of text.matchAll(remoteFontRegex)) {
      addFinding(findings, {
        category: 'font_loading_contract',
        file: filePath,
        line: lineNumberForIndex(text, match.index || 0),
        message: 'Public pages and styles must not load Google Fonts directly; use the local /css/dp-fonts.css contract to avoid font swap drift.',
        evidence: match[0]
      });
    }
  }
}

function auditForbiddenFamilies(files, findings) {
  const forbiddenRegex = /\b(?:Cormorant(?:\s+Garamond)?|Inter|Montserrat|Roboto)\b/gi;
  const typographyContextRegex = /(?:font-family\s*:\s*[^;]+;|(?:^|[{\s;])font\s*:\s*[^;]+;|<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>|@import[^;]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^;]*;)/gi;

  for (const filePath of files) {
    const text = readText(filePath);
    for (const context of text.matchAll(typographyContextRegex)) {
      const declaration = context[0] || '';
      for (const match of declaration.matchAll(forbiddenRegex)) {
        addFinding(findings, {
          category: 'font_family_contract',
          file: filePath,
          line: lineNumberForIndex(text, context.index || 0),
          message: 'Public UI typography must use the approved brand roles: display = El Messiri, body/nav/forms/CTA = Manrope.',
          evidence: declaration.trim()
        });
      }
    }
  }
}

function auditTokenFiles(findings) {
  const tokenPath = path.join(cssRoot, 'brand-tokens.css');
  const fontsPath = path.join(cssRoot, 'dp-fonts.css');

  if (!fs.existsSync(tokenPath)) {
    addFinding(findings, {
      category: 'font_token_contract',
      file: tokenPath,
      message: 'Missing site/css/brand-tokens.css; typography tokens need one source of truth.'
    });
    return;
  }

  const tokenText = readText(tokenPath);
  for (const token of ['--dp-font-sans', '--dp-font-display']) {
    if (!tokenText.includes(token)) {
      addFinding(findings, {
        category: 'font_token_contract',
        file: tokenPath,
        message: `Missing typography token ${token}.`
      });
    }
  }

  if (!fs.existsSync(fontsPath)) {
    addFinding(findings, {
      category: 'font_loading_contract',
      file: fontsPath,
      message: 'Missing site/css/dp-fonts.css; local font loading is required to avoid visible typography swaps.'
    });
    return;
  }

  const fontsText = readText(fontsPath);
  for (const required of ['font-family: "Manrope"', 'font-family: "El Messiri"', 'font-display: block']) {
    if (!fontsText.includes(required)) {
      addFinding(findings, {
        category: 'font_loading_contract',
        file: fontsPath,
        message: `Local font contract is incomplete; expected ${required}.`
      });
    }
  }
}

function writeReport(report) {
  fs.mkdirSync(artifactsRoot, { recursive: true });
  const reportPath = path.join(artifactsRoot, 'latest.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function main() {
  const htmlFiles = [
    ...walkFiles(pagesRoot, (filePath) => filePath.endsWith('.html')),
    ...walkFiles(siteRoot, (filePath) => path.dirname(filePath) === siteRoot && filePath.endsWith('.html'))
  ].sort();

  const styleAndHtmlFiles = [
    ...htmlFiles,
    ...walkFiles(cssRoot, (filePath) => filePath.endsWith('.css'))
  ].sort();

  const findings = [];
  auditTokenFiles(findings);
  auditHtmlFontLoading(htmlFiles, findings);
  auditRemoteFontUrls(styleAndHtmlFiles, findings);
  auditForbiddenFamilies(styleAndHtmlFiles, findings);

  const report = {
    status: findings.length > 0 ? 'bad' : 'good',
    summary: {
      htmlFiles: htmlFiles.length,
      checkedFiles: styleAndHtmlFiles.length,
      findings: findings.length
    },
    contract: {
      displayFont: 'El Messiri',
      sansFont: 'Manrope',
      requiredLoader: 'site/css/dp-fonts.css',
      forbiddenFamilies: FORBIDDEN_FONT_FAMILIES
    },
    findings
  };

  const reportPath = writeReport(report);
  console.log(`Typography contract audit completed: ${relativePath(reportPath)}`);

  if (findings.length > 0) {
    console.error('Typography contract audit failed.');
    for (const finding of findings.slice(0, 20)) {
      console.error(`- [${finding.severity}] ${finding.file}:${finding.line} ${finding.message}`);
    }
    if (findings.length > 20) {
      console.error(`- ... ${findings.length - 20} more findings`);
    }
    process.exitCode = 1;
  }
}

main();
