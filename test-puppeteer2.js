const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('response', response => {
    if (response.status() === 404) {
       console.log('404 URL:', response.url());
    }
  });
  await page.goto('https://shinobi.bulelengkab.go.id/Amk60KFacq87lQMvTCMHu17u00ONuC/embed/admin/isOvCBwVIA80/fullscreen|jquery|hd', { waitUntil: 'networkidle2' });
  await browser.close();
})();
