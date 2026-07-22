import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

function runSimulator(seed: string): string {
    const reportPath = path.join(projectRoot, 'economy-report.json');
    if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
    }
    
    execSync('npx tsx tools/EconomyReport.ts', {
        cwd: projectRoot,
        env: { ...process.env, SIMULATOR_SEED: seed },
        stdio: 'ignore'
    });
    
    return fs.readFileSync(reportPath, 'utf8');
}

function getHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function runDeterministicAudit() {
    console.log("Starting Deterministic Simulation Audit...");
    
    const SEED = "12345";
    
    console.log(`Running Simulator Pass 1 (Seed: ${SEED})...`);
    const report1 = runSimulator(SEED);
    const hash1 = getHash(report1);
    
    console.log(`Running Simulator Pass 2 (Seed: ${SEED})...`);
    const report2 = runSimulator(SEED);
    const hash2 = getHash(report2);
    
    console.log(`Hash 1: ${hash1}`);
    console.log(`Hash 2: ${hash2}`);
    
    // The timestamp in the report will break determinism unless we strip it.
    // Let's strip the 'timestamp' and 'date' field from the JSON before hashing.
    const r1 = JSON.parse(report1);
    const r2 = JSON.parse(report2);
    delete r1.timestamp; delete r1.date;
    delete r2.timestamp; delete r2.date;
    
    const finalHash1 = getHash(JSON.stringify(r1));
    const finalHash2 = getHash(JSON.stringify(r2));
    
    if (finalHash1 !== finalHash2) {
        throw new Error("Deterministic Audit FAILED! The simulator output varies despite identical seeds.");
    }
    
    console.log("✅ Simulator is 100% Deterministic.");
    console.log("🎉 DETERMINISTIC AUDIT PASS");
}

runDeterministicAudit().catch(err => {
    console.error("❌ DETERMINISTIC AUDIT FAILED:", err);
    process.exit(1);
});
