const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');
const oldPublicOrigin = 'https://prestigegoalmotion.com';
const publicOrigin = 'https://www.dynastyprestigecarrental.com';
const textExtensions = new Set(['.html', '.xml', '.txt', '.js', '.json', '.webmanifest']);

function listTextFiles(rootDir) {
    return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            return listTextFiles(entryPath);
        }

        return entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())
            ? [entryPath]
            : [];
    });
}

function syncFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    const next = original.split(oldPublicOrigin).join(publicOrigin);

    if (next === original) {
        return false;
    }

    fs.writeFileSync(filePath, next, 'utf8');
    return true;
}

function run() {
    const updatedFiles = listTextFiles(siteRoot).filter(syncFile);

    console.log(JSON.stringify({
        publicOrigin,
        replacedOrigin: oldPublicOrigin,
        updatedFiles: updatedFiles.length
    }));
}

if (require.main === module) {
    run();
}

module.exports = {
    publicOrigin,
    oldPublicOrigin,
    syncFile,
    run
};
