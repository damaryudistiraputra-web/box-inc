import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCommitHash() {
    try {
        return execSync('git rev-parse --short HEAD').toString().trim();
    } catch {
        return 'unknown';
    }
}

function getConfigHash() {
    try {
        const rootDir = path.resolve(__dirname, '..');
        const configPath = path.join(rootDir, 'public', 'config.json');
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf8');
            // Simplified hash generation
            let hash = 0;
            for (let i = 0; i < raw.length; i++) {
                hash = (hash << 5) - hash + raw.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash).toString(16);
        }
    } catch {}
    return 'unknown';
}

function generateManifest() {
    const rootDir = path.resolve(__dirname, '..');
    const pkgPath = path.join(rootDir, 'package.json');
    let version = '1.0.0';
    if (fs.existsSync(pkgPath)) {
        version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '1.0.0';
    }

    const manifest = {
        version: "11.3.0", // Hardcoded for this sprint, or use package.json
        gitCommit: getCommitHash(),
        buildHash: Date.now().toString(36),
        configHash: getConfigHash(),
        economyVersion: 5,
        buildTime: new Date().toISOString()
    };

    const manifestPath = path.join(rootDir, 'public', 'build-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Also save a copy to src so it can be imported synchronously if needed, 
    // but fetching from public/build-manifest.json is better for live updates.
    // For now we just write to public/build-manifest.json
    console.log(`[Manifest] Generated: v${manifest.version} (${manifest.gitCommit})`);
}

generateManifest();
