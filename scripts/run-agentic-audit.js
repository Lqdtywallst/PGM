const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const missionsPath = path.join(repoRoot, 'test-data', 'customer-missions.json');
const artifactsDir = path.join(repoRoot, 'artifacts', 'agentic-audit');
const { PUBLIC_PAGE_FILE_MAP } = require(path.join(repoRoot, 'server', 'public-page-map.js'));

function loadMissions() {
    return JSON.parse(fs.readFileSync(missionsPath, 'utf8'));
}

function parseArgs(argv) {
    const args = { missionId: null };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--mission' && argv[index + 1]) {
            args.missionId = argv[index + 1];
            index += 1;
        }
    }

    return args;
}

function buildMissionPrompt(mission) {
    return [
        `Use Playwright as a ${mission.persona.toLowerCase()}.`,
        '',
        `Mission ID: ${mission.id}`,
        `Mission title: ${mission.title}`,
        `Goal: ${mission.goal}`,
        `Entry route: ${mission.entryRoute}`,
        `Routes in scope: ${mission.routesInScope.join(', ')}`,
        '',
        'Behave like a real customer:',
        ...mission.humanBehaviors.map((behavior) => `- ${behavior}`),
        '',
        'Watch for friction:',
        ...mission.frictionSignals.map((signal) => `- ${signal}`),
        '',
        'At the end report:',
        '1. functional bugs',
        '2. usability friction',
        '3. lost-state or handoff issues',
        '4. missing Playwright coverage'
    ].join('\n');
}

function validateMission(mission) {
    const routeChecks = mission.routesInScope.map((route) => ({
        route,
        exists: Boolean(PUBLIC_PAGE_FILE_MAP[route])
    }));
    const coverageChecks = mission.stableCoverage.map((relativeFile) => ({
        path: relativeFile,
        exists: fs.existsSync(path.join(repoRoot, relativeFile))
    }));

    return {
        ...mission,
        routeChecks,
        coverageChecks,
        prompt: buildMissionPrompt(mission)
    };
}

function ensureArtifactsDir() {
    fs.mkdirSync(artifactsDir, { recursive: true });
}

function formatMarkdownReport(payload) {
    const lines = [
        '# Agentic Audit Brief',
        '',
        `Generated at: ${payload.generatedAt}`,
        '',
        '## Stable Regression First',
        '',
        '```bash',
        'npx playwright test tests/e2e/customer-journeys.spec.js tests/e2e/public-site.spec.js --project=desktop-chromium',
        '```',
        '',
        '## Missions'
    ];

    payload.missions.forEach((mission) => {
        lines.push('');
        lines.push(`### ${mission.title}`);
        lines.push('');
        lines.push(`- ID: \`${mission.id}\``);
        lines.push(`- Persona: ${mission.persona}`);
        lines.push(`- Priority: ${mission.priority}`);
        lines.push(`- Entry route: \`${mission.entryRoute}\``);
        lines.push(`- Devices: ${mission.devices.join(', ')}`);
        lines.push(`- Goal: ${mission.goal}`);
        lines.push(`- Stable coverage: ${mission.stableCoverage.join(', ')}`);
        lines.push('');
        lines.push('Routes in scope:');
        mission.routeChecks.forEach((routeCheck) => {
            lines.push(`- ${routeCheck.route} ${routeCheck.exists ? 'OK' : 'MISSING'}`);
        });
        lines.push('');
        lines.push('Coverage references:');
        mission.coverageChecks.forEach((coverageCheck) => {
            lines.push(`- ${coverageCheck.path} ${coverageCheck.exists ? 'OK' : 'MISSING'}`);
        });
        lines.push('');
        lines.push('Prompt:');
        lines.push('');
        lines.push('```text');
        lines.push(mission.prompt);
        lines.push('```');
    });

    return `${lines.join('\n')}\n`;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const missions = loadMissions();
    const selectedMissions = args.missionId
        ? missions.filter((mission) => mission.id === args.missionId)
        : missions;

    if (selectedMissions.length === 0) {
        console.error(`Unknown mission id: ${args.missionId}`);
        process.exit(1);
    }

    const validatedMissions = selectedMissions.map(validateMission);
    const generatedAt = new Date().toISOString();
    const payload = {
        generatedAt,
        totalMissions: validatedMissions.length,
        missions: validatedMissions
    };

    ensureArtifactsDir();

    const jsonPath = path.join(artifactsDir, 'agentic-audit-pack.json');
    const markdownPath = path.join(artifactsDir, 'agentic-audit-brief.md');

    fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
    fs.writeFileSync(markdownPath, formatMarkdownReport(payload));

    console.log(`Prepared ${validatedMissions.length} agentic mission(s).`);
    console.log(`JSON pack: ${jsonPath}`);
    console.log(`Markdown brief: ${markdownPath}`);
    console.log('Suggested next step: open the Markdown brief and run one mission prompt in Codex with Playwright MCP.');
}

main();
