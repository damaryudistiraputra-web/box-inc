import puppeteer from 'puppeteer';

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
        page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));
        page.on('requestfailed', request => {
            console.error('BROWSER REQUEST FAILED:', request.url(), request.failure()?.errorText);
        });

        console.log('Navigating to local preview server...');
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
        
        console.log('Waiting 5 seconds to capture runtime events...');
        await new Promise(r => setTimeout(r, 5000));
        
        await browser.close();
        console.log('Finished testing.');
        process.exit(0);
    } catch (e) {
        console.error('Puppeteer script failed:', e);
        process.exit(1);
    }
})();
