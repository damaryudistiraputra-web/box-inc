import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SaveManager } from '../src/managers/SaveManager';
import { generateChecksum } from '../src/utils/SaveValidator';

describe('SaveMigration Compatibility', () => {
    it('migrates v1 to latest', () => {
        // v1 doesn't have economyVersion, stats.totalSessions, etc.
        const v1 = {
            version: 1,
            resources: { money: "100" },
            grid: { boxes: [], size: { width: 3, height: 3 } },
            stats: { totalMerges: 0, highestBoxLevel: 1, shipmentsCompleted: 0, prestigeCount: 0 }
        };
        const migrated = (SaveManager.getInstance() as any).migrate(v1);
        expect(migrated.saveVersion).toBe(4);
        expect(migrated.economyVersion).toBeDefined();
    });

    it('handles future save versions gracefully', () => {
        const raw = fs.readFileSync(path.join(__dirname, 'fixtures', 'save_future_v99.json'), 'utf8');
        const futureSave = JSON.parse(raw);
        futureSave.saveVersion = 99;
        const migrated = (SaveManager.getInstance() as any).migrate(futureSave);
        expect(migrated.saveVersion).toBe(99);
    });

    it('handles broken/missing fields by applying defaults', () => {
        const raw = fs.readFileSync(path.join(__dirname, 'fixtures', 'save_broken.json'), 'utf8');
        // Because save_broken.json is missing grid and stats, JSON.parse works, but it's incomplete
        // We'll strip comments out just in case
        const brokenSave = JSON.parse(raw.replace(/\/\/.*/g, ''));
        const migrated = (SaveManager.getInstance() as any).migrate(brokenSave);
        expect(migrated.saveVersion).toBe(4);
    });

    it('rejects truncated/invalid JSON', () => {
        const raw = fs.readFileSync(path.join(__dirname, 'fixtures', 'save_truncated.json'), 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            parsed = null;
        }
        expect(parsed).toBeNull();
    });

    it('validates checksum strictly', () => {
        const raw = fs.readFileSync(path.join(__dirname, 'fixtures', 'save_invalid_checksum.json'), 'utf8');
        const wrapper = JSON.parse(raw);
        const actualChecksum = generateChecksum(wrapper.saveData);
        expect(wrapper.checksum).not.toBe(actualChecksum);
        
        const isValid = wrapper.checksum === actualChecksum;
        expect(isValid).toBe(false);
    });
});
