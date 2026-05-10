const { chromium } = require('playwright');

(async () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8085';
  const routes = [
    {path:'/services.html',name:'services',section:'.services-hero',heading:'h1[data-service-title], .services-hero h1',primary:'.services-button--primary',support:'.services-hero__selector,.services-hero__feature'},
    {path:'/locations.html',name:'locations',section:'.locations-hero',heading:'.locations-hero__copy h1',primary:'.locations-button--primary',support:'.locations-hero__summary,.locations-hero__zone-list'},
    {path:'/fleet.html',name:'fleet',section:'.fleet-browser__hero',heading:'.fleet-browser__hero-copy h1',primary:'.fleet-browser__hero-copy',support:'.fleet-browser__hero-media'},
    {path:'/about.html',name:'about',section:'.about-hero',heading:'.about-hero h1',primary:'.about-button--primary',support:'.about-hero__actions'},
    {path:'/contact.html',name:'contact',section:'.contact-hero',heading:'.contact-hero h1',primary:'.contact-button--primary',support:'.contact-hero__intro'}
  ];
  const viewports = [
    {label:'mobile-small',width:360,height:640},
    {label:'mobile-modern',width:390,height:844},
    {label:'tablet-portrait',width:768,height:1024},
    {label:'laptop',width:1366,height:768},
    {label:'desktop-wide',width:1707,height:893}
  ];

  const browser = await chromium.launch();
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: vp, ignoreHTTPSErrors: true });
    console.log(`\n=== ${vp.label} (${vp.width}x${vp.height}) ===`);
    for (const route of routes) {
      await page.goto(`${baseURL}${route.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(350);
      const data = await page.evaluate((route) => {
        function rect(sel) {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height
          };
        }
        const primary = rect(route.primary);
        const support = rect(route.support);
        const heading = rect(route.heading);
        const section = rect(route.section);
        return { primary, support, heading, section };
      }, route);
      console.log(`${route.name.padEnd(8)} section=${data.section ? `${Math.round(data.section.height)}h@${Math.round(data.section.top)}` : 'null'} headingTop=${data.heading?Math.round(data.heading.top):'null'} primaryTop=${data.primary?Math.round(data.primary.top):'null'} primaryBottom=${data.primary?Math.round(data.primary.bottom):'null'} supportTop=${data.support?Math.round(data.support.top):'null'} supportH=${data.support?Math.round(data.support.height):'null'}`);
      if (route.name==='services') {
        const feature = await page.evaluate(() => {
          const b = document.querySelector('.services-hero__feature');
          const sel = document.querySelector('.services-hero__selector');
          const r1=b?b.getBoundingClientRect():null;
          const r2=sel?sel.getBoundingClientRect():null;
          return { feature:r1, selector:r2 };
        });
        if (feature.feature && feature.selector) {
          console.log(`  services overlap=selectorBottom(${Math.round(feature.selector.bottom)}) featureTop(${Math.round(feature.feature.top)}) gap=${Math.round(feature.feature.top - feature.selector.bottom)}`);
        }
      }
      if (route.name==='locations') {
        const alignment = await page.evaluate(() => {
          const summary = document.querySelector('.locations-hero__summary');
          const map = document.querySelector('.locations-map-card');
          const s=summary?summary.getBoundingClientRect():null;
          const m=map?map.getBoundingClientRect():null;
          return {
            summaryTop: s?s.top:null,
            mapTop: m?m.top:null,
            summaryHeight:s?s.height:null,
            mapHeight:m?m.height:null
          };
        });
        if (alignment.summaryTop!==null && alignment.mapTop!==null) {
          console.log(`  locations split topDiff=${Math.round(alignment.summaryTop - alignment.mapTop)} heights s=${Math.round(alignment.summaryHeight)} m=${Math.round(alignment.mapHeight)}`);
        }
      }
      if (route.name==='fleet') {
        const row = await page.evaluate(() => {
          const shell = document.querySelector('.fleet-layout');
          const firstCards = Array.from(document.querySelectorAll('.fleet-card')).slice(0,2).map(e => e.getBoundingClientRect().top);
          const list = document.querySelector('.fleet-results__list');
          return { layoutTop: shell?Math.round(shell.getBoundingClientRect().top):null, listTop:list?Math.round(list.getBoundingClientRect().top):null, firstCards };
        });
        if (row.layoutTop !== null) {
          console.log(`  fleet layoutTop=${row.layoutTop} listTop=${row.listTop} firstRows=${row.firstCards.map(v=>Math.round(v)).join(',')}`);
        }
      }
    }
    await page.close();
  }
  await browser.close();
})();
