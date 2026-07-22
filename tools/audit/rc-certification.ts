import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

async function runCertification() {
    console.log("====================================");
    console.log("          RC CERTIFICATION");
    console.log("====================================");

    const steps = [
        { group: 'BUILD', name: 'BUILD', cmd: 'npm run build' },
        { group: 'QUALITY', name: 'TYPECHECK', cmd: 'npx tsc --noEmit' },
        { group: 'QUALITY', name: 'UNIT TESTS', cmd: 'npx vitest run tests/ --passWithNoTests' }, 
        { group: 'ECONOMY', name: 'ECONOMY SIM', cmd: 'npx tsx tools/EconomyReport.ts' },
        { group: 'SECURITY', name: 'SECURITY', cmd: 'npx vitest run tools/audit/security.test.ts' },
        { group: 'RELIABILITY', name: 'RELIABILITY', cmd: 'npx vitest run tools/audit/reliability.test.ts' },
        { group: 'PERFORMANCE', name: 'PERFORMANCE', cmd: 'npx tsx tools/audit/performance-test.ts' },
        { group: 'DETERMINISM', name: 'DETERMINISTIC', cmd: 'npx tsx tools/audit/deterministic-test.ts' },
        { group: 'BUILD INTEGRITY', name: 'BUILD SCAN', cmd: 'npx tsx tools/audit/build-audit.ts' }
    ];

    const results: any[] = [];
    let currentGroup = '';

    for (const step of steps) {
        if (step.group !== currentGroup) {
            currentGroup = step.group;
            console.log(`\n${currentGroup}`);
        }
        process.stdout.write(`  ${step.name.padEnd(20)} `);
        
        try {
            execSync(step.cmd, { cwd: projectRoot, stdio: 'ignore' });
            console.log('PASS');
            results.push({ ...step, status: 'PASS' });
        } catch (e) {
            console.log('FAIL');
            results.push({ ...step, status: 'FAIL' });
            
            // Show what failed by re-running with stdio
            console.log("\n--- Failure Detail ---");
            try {
                execSync(step.cmd, { cwd: projectRoot, stdio: 'inherit' });
            } catch(e2) {}
            
            console.log("\n------------------------------------");
            console.log("OVERALL                FAILED");
            console.log(`Reason                 ${step.group}`);
            console.log(`                       ${step.name} failed`);
            console.log("====================================");
            process.exit(1);
        }
    }

    console.log("\n------------------------------------");
    console.log("OVERALL                RC1 CERTIFIED");
    
    // Attempt to grab build hash
    try {
        const hash = execSync('git rev-parse --short HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
        console.log(`Commit                 ${hash}`);
    } catch(e) {}
    
    console.log("====================================");
}

runCertification();
