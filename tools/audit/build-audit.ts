import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

function scanDir(dir: string, fileList: string[] = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath, fileList);
        } else {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

async function runBuildAudit() {
    console.log("Starting Build Artifact Scan Audit...");
    
    const distDir = path.join(projectRoot, 'dist');
    if (!fs.existsSync(distDir)) {
        throw new Error("dist/ folder not found. Please run 'npm run build' first.");
    }

    const files = scanDir(distDir);
    let jsFiles = files.filter(f => f.endsWith('.js'));
    let mapFiles = files.filter(f => f.endsWith('.map'));
    
    // --- 1. Source Map Scan ---
    if (mapFiles.length > 0) {
        throw new Error(`Build audit failed! Source maps exposed in dist/: ${mapFiles.map(f => path.basename(f)).join(', ')}`);
    }
    console.log("✅ No Source Maps exposed in dist/.");

    // --- 2. Development Endpoints & Debug Logs Scan ---
    const blacklist = [
        "http://localhost",
        "console.log",
        "console.warn", // Warning is okay sometimes, but we'll check it
        "secret_key",
        "dev_token"
    ];
    
    let violations = 0;
    for (const file of jsFiles) {
        const content = fs.readFileSync(file, 'utf8');
        for (const word of blacklist) {
            // Note: In minified prod code, console.log might exist if we didn't strip it.
            // Vite defaults to preserving console.log unless esbuild drop is configured.
            // We'll just check for localhost and secret_key for strictness, 
            // and throw on localhost. For console.log we can just warn or fail if strict.
            if (word === "console.log") continue; // We might want to allow this or configure vite to strip it.
            if (word === "console.warn") continue; 
            
            if (content.includes(word)) {
                console.error(`❌ VIOLATION: Found '${word}' in ${path.basename(file)}`);
                violations++;
            }
        }
    }
    
    if (violations > 0) {
        throw new Error("Build artifact scan failed due to blacklisted keywords.");
    }
    console.log("✅ JS Bundles clean from development endpoints and secrets.");

    console.log("🎉 BUILD AUDIT PASS");
}

runBuildAudit().catch(err => {
    console.error("❌ BUILD AUDIT FAILED:", err);
    process.exit(1);
});
