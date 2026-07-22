import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function moveSourcemaps() {
    const rootDir = path.resolve(__dirname, '..');
    const distAssetsDir = path.join(rootDir, 'dist', 'assets');
    const artifactsDir = path.join(rootDir, 'artifacts', 'sourcemaps');

    if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
    }

    if (!fs.existsSync(distAssetsDir)) {
        console.warn(`[MoveSourcemaps] ${distAssetsDir} does not exist. Skipping.`);
        return;
    }

    const files = fs.readdirSync(distAssetsDir);
    let movedCount = 0;

    for (const file of files) {
        if (file.endsWith('.map')) {
            const oldPath = path.join(distAssetsDir, file);
            const newPath = path.join(artifactsDir, file);
            fs.renameSync(oldPath, newPath);
            movedCount++;
        }
    }

    console.log(`[MoveSourcemaps] Moved ${movedCount} sourcemap files from dist/assets to artifacts/sourcemaps`);
}

moveSourcemaps();
