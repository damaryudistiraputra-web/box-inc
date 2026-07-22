import { JSDOM } from 'jsdom';

import fs from 'fs';
import path from 'path';

(async () => {
    try {
        const res = await fetch('https://box-inc.vercel.app');
        const html = await res.text();
        
        const dom = new JSDOM(html, {
            url: 'https://box-inc.vercel.app',
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true
        });

        dom.window.console.log = (...args) => console.log('LOG:', ...args);
        dom.window.console.warn = (...args) => console.log('WARN:', ...args);
        dom.window.console.error = (...args) => console.error('ERROR:', ...args);

        dom.window.addEventListener('error', event => {
            console.error('UNHANDLED ERROR:', event.error);
        });

        dom.window.addEventListener('unhandledrejection', event => {
            console.error('UNHANDLED PROMISE REJECTION:', event.reason);
        });

        // Wait a bit for scripts to load and run
        await new Promise(r => setTimeout(r, 5000));
        console.log('Finished testing.');
        process.exit(0);
    } catch (e) {
        console.error('Script failed', e);
    }
})();
