import { chromium } from 'playwright';

(async () => {
    try {
        console.log('Launching Playwright to check markers...');
        const browser = await chromium.launch();
        const page = await browser.newPage();

        page.on('console', msg => console.log(`BROWSER LOG [${msg.type()}]:`, msg.text()));
        page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));

        console.log('Navigating to http://localhost:4174 ...');
        // 'commit' will resolve as soon as network response is received, won't wait for DOM/Load which could be blocked
        await page.goto('http://localhost:4174', { waitUntil: 'commit' });
        
        console.log('Waiting 5 seconds to collect logs...');
        await new Promise(r => setTimeout(r, 5000));
        
        await browser.close();
        process.exit(0);
    } catch (e) {
        console.error('Playwright script failed:', e);
        process.exit(1);
    }
})();
