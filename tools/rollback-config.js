import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function rollbackConfig() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node rollback-config.js <versionId>');
        process.exit(1);
    }
    
    const targetVersion = args[0].padStart(3, '0');
    
    const rootDir = path.resolve(__dirname, '..');
    const historyDir = path.join(rootDir, 'tools', 'config-history');
    const targetPath = path.join(historyDir, `${targetVersion}.json`);
    
    if (!fs.existsSync(targetPath)) {
        console.error(`Version ${targetVersion} not found in history`);
        process.exit(1);
    }

    const historyEntry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    
    // Overwrite public/config.json
    const publicPath = path.join(rootDir, 'public', 'config.json');
    fs.writeFileSync(publicPath, JSON.stringify(historyEntry.payload, null, 2));

    console.log(`[Config] Rolled back to v${targetVersion} successfully.`);
    console.log(`[Config] Original reason: ${historyEntry.reason}`);
}

rollbackConfig();
