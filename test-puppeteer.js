const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });
  await page.goto('https://shinobi.bulelengkab.go.id/Amk60KFacq87lQMvTCMHu17u00ONuC/embed/admin/isOvCBwVIA80/fullscreen|jquery|hd', { waitUntil: 'networkidle2' });
  await browser.close();
})();
