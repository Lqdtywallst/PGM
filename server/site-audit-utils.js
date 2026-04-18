const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { URL } = require('url');

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode || 0,
                    headers: res.headers,
                    body
                });
            });
        });

        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy(new Error(`Timeout requesting ${url}`));
        });
    });
}

function stopProcess(child) {
    if (!child || child.exitCode !== null) {
        return;
    }

    if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
        child.kill('SIGTERM');
    }
}

async function startStaticServer({ projectRoot, port, baseUrl, label = 'Static server' }) {
    const child = spawn(process.execPath, [path.join(projectRoot, 'server/server-http.js')], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PORT: String(port)
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let logs = '';
    child.stdout.on('data', (chunk) => {
        logs += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
        logs += chunk.toString();
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (child.exitCode !== null) {
            throw new Error(`${label} exited early.\n${logs}`);
        }

        try {
            const response = await fetchUrl(`${baseUrl}/`);
            if (response.statusCode === 200) {
                return { child, logs: () => logs };
            }
        } catch (error) {
            await sleep(250);
        }
    }

    stopProcess(child);
    throw new Error(`${label} did not start in time.\n${logs}`);
}

function parseSitemapPaths(xml) {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => {
        const parsed = new URL(match[1].trim());
        return parsed.pathname || '/';
    });
}

function siteFileForPath(siteRoot, urlPath) {
    const pathname = String(urlPath).split(/[?#]/)[0] || '/';
    if (pathname === '/') {
        return path.join(siteRoot, 'index.html');
    }

    return path.join(siteRoot, pathname.replace(/^\//, ''));
}

function extractTagValue(html, pattern) {
    const match = html.match(pattern);
    return match ? match[1].trim() : '';
}

function countMatches(html, pattern) {
    return (html.match(pattern) || []).length;
}

module.exports = {
    countMatches,
    extractTagValue,
    fetchUrl,
    parseSitemapPaths,
    siteFileForPath,
    startStaticServer,
    stopProcess
};
