import { chromium } from 'playwright';

(async () => {
    try {
        console.log('Launching Playwright to take screenshot...');
        const browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

        console.log('Navigating to http://localhost:4173/ ...');
        await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 15000 });
        
        console.log('Waiting 5 seconds...');
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: 'LANCE_FINAL.png' });
        console.log('Screenshot saved to LANCE_FINAL.png');
        
        await browser.close();
        process.exit(0);
    } catch (e) {
        console.error('Playwright script failed:', e);
        process.exit(1);
    }
})();
