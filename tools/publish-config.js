import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCommitHash() {
    try {
        return execSync('git rev-parse --short HEAD').toString().trim();
    } catch {
        return 'unknown';
    }
}

function getNextVersionId(historyDir: string): string {
    const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));
    let max = 0;
    for (const f of files) {
        const match = f.match(/^(\d+)\.json$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > max) max = num;
        }
    }
    return String(max + 1).padStart(3, '0');
}

function publishConfig() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node publish-config.js <path-to-draft.json> "<reason>" [author]');
        process.exit(1);
    }
    
    const draftPath = args[0];
    const reason = args[1];
    const author = args[2] || 'system';
    
    if (!fs.existsSync(draftPath)) {
        console.error(`Draft not found at ${draftPath}`);
        process.exit(1);
    }

    const draftConfig = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
    
    const rootDir = path.resolve(__dirname, '..');
    const historyDir = path.join(rootDir, 'tools', 'config-history');
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

    const newId = getNextVersionId(historyDir);
    
    // Add metadata wrapper
    const historyEntry = {
        versionId: newId,
        created: new Date().toISOString(),
        author: author,
        reason: reason,
        gitCommit: getCommitHash(),
        payload: draftConfig
    };

    // Save to history
    const historyPath = path.join(historyDir, `${newId}.json`);
    fs.writeFileSync(historyPath, JSON.stringify(historyEntry, null, 2));

    // Overwrite public/config.json with payload only
    const publicPath = path.join(rootDir, 'public', 'config.json');
    fs.writeFileSync(publicPath, JSON.stringify(draftConfig, null, 2));

    console.log(`[Config] Published v${newId} successfully.`);
    console.log(`[Config] Reason: ${reason}`);
}

publishConfig();
