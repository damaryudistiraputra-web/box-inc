import { chromium } from 'playwright';

(async () => {
    try {
        console.log('Launching Playwright to take screenshot...');
        const browser = await chromium.launch();
        const page = await browser.newPage();

        page.on('console', msg => console.log(`BROWSER LOG [${msg.type()}]:`, msg.text()));
        page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));

        console.log('Navigating to https://box-inc-1k4b.vercel.app/ ...');
        await page.goto('https://box-inc-1k4b.vercel.app/', { waitUntil: 'networkidle', timeout: 15000 });
        
        console.log('Waiting 2 seconds...');
        await new Promise(r => setTimeout(r, 2000));
        
        await page.screenshot({ path: 'LANCE_FINAL.png' });
        console.log('Screenshot saved to LANCE_FINAL.png');
        
        await browser.close();
        process.exit(0);
    } catch (e) {
        console.error('Playwright script failed:', e);
        process.exit(1);
    }
})();
