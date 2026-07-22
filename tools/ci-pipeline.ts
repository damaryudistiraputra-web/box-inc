import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function runStep(name: string, command: string) {
    console.log(`\n=== [CI] Running: ${name} ===`);
    try {
        execSync(command, { stdio: 'inherit', cwd: rootDir });
        console.log(`✅ ${name} PASS`);
    } catch (e) {
        console.error(`❌ ${name} FAILED`);
        process.exit(1);
    }
}

console.log('🚀 Starting Economy Regression CI Pipeline');

runStep('Typecheck', 'npx tsc --noEmit');
runStep('Unit Test (Save Migration)', 'npx vitest run');
runStep('Simulator & Guardrails', 'npx tsx tools/EconomyReport.ts');
runStep('Timeline & Dashboard Gen', 'npx tsx tools/generate-timeline.ts');
runStep('Release Report', 'npx tsx tools/generate-release-report.ts');

console.log('\n🎉 ALL CI STEPS PASSED 🎉');
