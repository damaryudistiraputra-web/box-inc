import { chromium } from 'playwright';

(async () => {
    try {
        console.log('Launching Playwright...');
        const browser = await chromium.launch();
        const page = await browser.newPage();

        page.on('console', msg => console.log(`BROWSER LOG [${msg.type()}]:`, msg.text()));
        page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));

        console.log('Navigating to http://localhost:4173 ...');
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
        
        console.log('Waiting 5 seconds...');
        await new Promise(r => setTimeout(r, 5000));
        
        await browser.close();
        console.log('Playwright test finished.');
        process.exit(0);
    } catch (e) {
        console.error('Playwright script failed:', e);
        process.exit(1);
    }
})();
