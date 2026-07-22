import { EventBus, EVENTS } from '../core/EventBus';
import { SaveManager } from './SaveManager';
import { FeatureGate } from './FeatureGate';

export class MergeMeterManager {
    private static instance: MergeMeterManager;
    private maxMeter = 100;

    private constructor() {
        EventBus.on(EVENTS.BOX_MERGE_SUCCESS, this.onMerge, this);
    }

    public static getInstance(): MergeMeterManager {
        if (!MergeMeterManager.instance) {
            MergeMeterManager.instance = new MergeMeterManager();
        }
        return MergeMeterManager.instance;
    }

    private onMerge(data: { box1: any, box2: any, newLevel: number, comboCount?: number }) {
        if (!FeatureGate.isUnlocked('goldenTruck')) return;

        const save = SaveManager.getInstance().load();
        const level = data.newLevel || 2;
        const combo = data.comboCount || 1;

        // Formula: fill up based on level and combo
        // Diminishing returns formula
        const points = Math.floor(Math.log2(level) * 3) + 1;
        const addAmount = points * combo;
        
        save.stats.mergeMeter = Math.min(this.maxMeter, (save.stats.mergeMeter || 0) + addAmount);
        SaveManager.getInstance().markDirty();

        EventBus.emit('MERGE_METER_UPDATED', save.stats.mergeMeter);

        if (save.stats.mergeMeter >= this.maxMeter) {
            EventBus.emit('MERGE_METER_FULL');
        }
    }

    public getMeterValue(): number {
        const save = SaveManager.getInstance().load();
        return save.stats.mergeMeter || 0;
    }

    public resetMeter() {
        const save = SaveManager.getInstance().load();
        save.stats.mergeMeter = 0;
        SaveManager.getInstance().markDirty();
        EventBus.emit('MERGE_METER_UPDATED', 0);
    }
}
