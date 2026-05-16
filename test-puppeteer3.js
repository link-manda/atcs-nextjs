const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  await page.goto('https://shinobi.bulelengkab.go.id/Amk60KFacq87lQMvTCMHu17u00ONuC/embed/admin/isOvCBwVIA80/fullscreen|jquery|hd', { waitUntil: 'networkidle2' });
  
  const videoSrc = await page.evaluate(() => {
    const video = document.querySelector('video');
    return video ? video.src : 'No video element';
  });
  console.log('Video src:', videoSrc);
  
  await browser.close();
})();
