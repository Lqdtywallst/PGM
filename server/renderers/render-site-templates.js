const { syncFleetHtmlFromData } = require('./render-fleet-cards');
const { syncGlobalFooterHtml } = require('./render-global-footer');
const { syncGlobalHeaderHtml } = require('./render-global-header');
const { syncLocationsHtmlFromData } = require('./render-locations-page');
const { syncServicesHtmlFromData } = require('./render-services-page');
const { syncVehiclePagesFromData } = require('./render-vehicle-pages');

const defaultTemplateRunners = [
    {
        name: 'global-header',
        run: syncGlobalHeaderHtml,
        changedCount: (result) => result.touchedFiles.length
    },
    {
        name: 'global-footer',
        run: syncGlobalFooterHtml,
        changedCount: (result) => result.touchedFiles.length
    },
    {
        name: 'fleet-cards',
        run: syncFleetHtmlFromData,
        changedCount: (result) => (result.changed ? 1 : 0)
    },
    {
        name: 'vehicle-pages',
        run: syncVehiclePagesFromData,
        changedCount: (result) => result.touchedFiles.length
    },
    {
        name: 'services-page',
        run: syncServicesHtmlFromData,
        changedCount: (result) => (result.changed ? 1 : 0)
    },
    {
        name: 'locations-page',
        run: syncLocationsHtmlFromData,
        changedCount: (result) => (result.changed ? 1 : 0)
    }
];

function syncSiteTemplates(runners = defaultTemplateRunners) {
    const steps = runners.map((runner) => {
        const result = runner.run();
        const changedCount = Number(runner.changedCount(result) || 0);

        return {
            name: runner.name,
            changedCount,
            changed: changedCount > 0,
            result
        };
    });

    return {
        generatedAt: new Date().toISOString(),
        changedCount: steps.reduce((total, step) => total + step.changedCount, 0),
        steps
    };
}

function formatSummary(report) {
    return {
        generatedAt: report.generatedAt,
        changedCount: report.changedCount,
        steps: report.steps.map((step) => ({
            name: step.name,
            changed: step.changed,
            changedCount: step.changedCount
        }))
    };
}

function main() {
    const report = syncSiteTemplates();
    console.log(JSON.stringify(formatSummary(report), null, 2));
}

if (require.main === module) {
    main();
}

module.exports = {
    defaultTemplateRunners,
    formatSummary,
    syncSiteTemplates
};
