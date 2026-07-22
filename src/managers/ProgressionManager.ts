import { EventBus, EVENTS } from '../core/EventBus';
import { SaveManager } from './SaveManager';
import { STAGES } from '../config/StageConfig';
import type { StageInfo } from '../config/StageConfig';
import { LocalizationManager } from './LocalizationManager';

export class ProgressionManager {
    private static instance: ProgressionManager;
    private currentScore: number = 0;
    private currentStageId: number = 1;

    private constructor() {
        // Initialize from save
        this.calculateScore();
        this.updateStage();

        // Listen to events that affect score
        EventBus.on(EVENTS.BOX_MERGE_SUCCESS, (data: { box1: any, box2: any, newLevel: number, comboCount?: number }) => {
            this.handleMerge(data?.newLevel || 2, data?.comboCount || 1);
        });
        
        EventBus.on(EVENTS.SHIPMENT_COMPLETED, () => {
            this.handleShipment();
        });
        
        EventBus.on(EVENTS.RESOURCE_ADD, (data: { id: string, amount: bigint }) => {
            if (data.id === 'money') {
                // We don't recalculate on every tick to save performance,
                // but we might want to if lifetime money goes up significantly.
                // For now, we rely on merge and shipment to push the stage check,
                // but we will do a fast log check if needed.
            }
        });
    }

    public static getInstance(): ProgressionManager {
        if (!ProgressionManager.instance) {
            ProgressionManager.instance = new ProgressionManager();
        }
        return ProgressionManager.instance;
    }

    public getScore(): number {
        return this.currentScore;
    }

    public getCurrentStage(): StageInfo {
        const stage = STAGES.find(s => s.id === this.currentStageId) || STAGES[0];
        return { ...stage, name: LocalizationManager.t(`stage.${stage.id}`) };
    }

    public getNextStage(): StageInfo | null {
        const stage = STAGES.find(s => s.id === this.currentStageId + 1) || null;
        if (stage) return { ...stage, name: LocalizationManager.t(`stage.${stage.id}`) };
        return null;
    }

    public calculateScore(): void {
        const save = SaveManager.getInstance().load();
        const stats = save.stats;
        
        const highestBoxScore = stats.highestBoxLevel * 500;
        const shipmentScore = stats.shipmentsCompleted * 1200;
        const mergeScore = stats.mergeScore || 0;
        
        // Lifetime income - log scale
        let incomeScore = 0;
        try {
            const moneyBig = BigInt(stats.totalMoneyEarned);
            if (moneyBig > 0n) {
                // roughly Math.log10(Number) but safe for bigints
                const moneyStr = moneyBig.toString();
                // 1 digit = ~0 log10. 10 digits = ~9 log10. 
                // Let's say 50 points per digit.
                incomeScore = moneyStr.length * 50; 
            }
        } catch (e) {
            // ignore
        }

        this.currentScore = highestBoxScore + shipmentScore + mergeScore + incomeScore;
        EventBus.emit(EVENTS.PROGRESSION_SCORE_UPDATED, this.currentScore);
        
        this.updateStage();
    }

    private handleMerge(newLevel: number, comboCount: number): void {
        const save = SaveManager.getInstance().load();
        save.stats.totalMerges += 1;
        // Apply combo multiplier to merge score
        save.stats.mergeScore = (save.stats.mergeScore || 0) + (newLevel * 3 * comboCount);
        SaveManager.getInstance().markDirty();
        this.calculateScore();
    }

    private handleShipment(): void {
        const save = SaveManager.getInstance().load();
        save.stats.shipmentsCompleted += 1;
        SaveManager.getInstance().markDirty();
        this.calculateScore();
    }

    private updateStage(): void {
        let newStageId = 1;
        
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (this.currentScore >= STAGES[i].threshold) {
                newStageId = STAGES[i].id;
                break;
            }
        }

        if (newStageId > this.currentStageId) {
            const oldStageId = this.currentStageId;
            this.currentStageId = newStageId;
            
            EventBus.emit(EVENTS.STAGE_ADVANCED, {
                stage: this.getCurrentStage(),
                previousStageId: oldStageId
            });
            console.log(`[Progression] Stage Advanced to ${this.getCurrentStage().name}!`);
        }
    }
}
