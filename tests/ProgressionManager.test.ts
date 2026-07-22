import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressionManager } from '../src/managers/ProgressionManager';
import { STAGES } from '../src/config/StageConfig';
import { EventBus, EVENTS } from '../src/core/EventBus';
import { SaveManager } from '../src/managers/SaveManager';

describe('ProgressionManager', () => {
    let mockSave: any;

    beforeEach(() => {
        // Reset singleton
        (ProgressionManager as any).instance = undefined;
        // Mock SaveManager with fresh object
        mockSave = {
            stats: {
                totalMerges: 0,
                totalMoneyEarned: "0",
                boxesBought: 0,
                highestBoxLevel: 1,
                shipmentsCompleted: 0,
                mergeScore: 0
            }
        };
        vi.spyOn(SaveManager.getInstance(), 'load').mockReturnValue(mockSave);
        vi.spyOn(SaveManager.getInstance(), 'markDirty').mockImplementation(() => {});
        EventBus.removeAllListeners();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        EventBus.removeAllListeners();
    });

    it('should initialize at Garage Startup (Score 500)', () => {
        const pm = ProgressionManager.getInstance();
        // 1 highest level * 500 = 500
        expect(pm.getScore()).toBe(500);
        expect(pm.getCurrentStage().id).toBe(1);
        expect(pm.getCurrentStage().name).toBe("Garage");
    });

    it('should advance stage when score threshold is met', () => {
        const pm = ProgressionManager.getInstance();
        
        let advancedFired = false;
        EventBus.once(EVENTS.STAGE_ADVANCED, () => {
            advancedFired = true;
        });

        mockSave.stats.highestBoxLevel = 2; // 1000 score

        pm.calculateScore();
        
        expect(pm.getScore()).toBe(1000);
        expect(pm.getCurrentStage().id).toBe(2); // Small Warehouse
        expect(advancedFired).toBe(true);
    });

    it('should increment score on merge', () => {
        const pm = ProgressionManager.getInstance();
        const initialScore = pm.getScore();
        
        EventBus.emit(EVENTS.BOX_MERGE_SUCCESS, { newLevel: 4 });
        
        expect(pm.getScore()).toBe(initialScore + (4 * 3));
    });

    it('should calculate log income correctly', () => {
        const pm = ProgressionManager.getInstance();
        
        mockSave.stats.totalMoneyEarned = "1000000"; // 7 digits
        mockSave.stats.highestBoxLevel = 0; // zero out other scores

        pm.calculateScore();
        
        // 7 digits * 50 = 350
        expect(pm.getScore()).toBe(350);
    });
});
