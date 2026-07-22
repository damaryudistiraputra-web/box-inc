import { EventBus, EVENTS } from '../core/EventBus';
import { SaveManager } from './SaveManager';
import { FeatureGate } from './FeatureGate';
import { BoxPool } from './BoxPool';
import { RewardManager } from './RewardManager';
import { RewardSource } from '../interfaces/IReward';
import { MathUtils } from '../utils/MathUtils';
import { SHIPMENT_DIRECTOR_SEQUENCE, SHIPMENT_TEMPLATES } from '../config/ShipmentConfig';

export interface ShipmentRequirement {
    level: number;
    count: number;
}

export interface ActiveShipment {
    requirements: ShipmentRequirement[];
    rewardCash: string;
    tier: string; // 'Easy', 'Normal', 'Hard', 'Epic'
    icon: string;
    scoreVal: number;
}

export class ShipmentManager {
    private activeShipment: ActiveShipment | null = null;
    private boxPool: BoxPool;

    constructor(boxPool: BoxPool) {
        this.boxPool = boxPool;
        
        // Restore from save if exists
        const save = SaveManager.getInstance().load();
        if (save.activeShipment) {
            this.activeShipment = save.activeShipment as ActiveShipment;
        }

        // Try to generate a shipment if we don't have one and feature is unlocked
        this.checkAndGenerateShipment();

        // Listen for stage advance to unlock shipment if we just reached it
        EventBus.on(EVENTS.STAGE_ADVANCED, () => {
            this.checkAndGenerateShipment();
        });
    }

    public getActiveShipment(): ActiveShipment | null {
        return this.activeShipment;
    }

    private checkAndGenerateShipment() {
        if (!FeatureGate.isUnlocked('shipment')) return;
        if (this.activeShipment) return;

        this.generateNewShipment();
    }

    private generateNewShipment() {
        const save = SaveManager.getInstance().load();
        const highestBox = save.stats.highestBoxLevel;

        // Director pacing
        const totalShipments = save.stats.shipmentsCompleted || 0;
        const seqIndex = totalShipments % SHIPMENT_DIRECTOR_SEQUENCE.length;
        const targetTier = SHIPMENT_DIRECTOR_SEQUENCE[seqIndex];

        // Pick random template from tier
        const templates = SHIPMENT_TEMPLATES[targetTier];
        const template = templates[MathUtils.randomInt(0, templates.length - 1)];

        const requirements: ShipmentRequirement[] = [];
        
        for (const req of template.requirements) {
            // Level shouldn't go below 1
            const targetLvl = Math.max(1, highestBox + req.levelOffset);
            
            // Check if already in reqs
            const existing = requirements.find(r => r.level === targetLvl);
            if (existing) {
                existing.count += req.count;
            } else {
                requirements.push({ level: targetLvl, count: req.count });
            }
        }

        // Calculate Reward
        let totalValue = 0n;
        for (const req of requirements) {
            const baseValue = 2n ** BigInt(req.level - 1);
            totalValue += baseValue * BigInt(req.count);
        }

        const rewardCash = (totalValue * template.rewardMult * 100n).toString();

        this.activeShipment = {
            requirements,
            rewardCash,
            tier: template.tier,
            icon: template.icon,
            scoreVal: template.score
        };

        const currentSave = SaveManager.getInstance().load();
        currentSave.activeShipment = this.activeShipment;
        SaveManager.getInstance().markDirty();

        EventBus.emit('SHIPMENT_GENERATED', this.activeShipment);
    }

    public canClaim(): boolean {
        if (!this.activeShipment) return false;

        // Tally current grid boxes
        const counts = new Map<number, number>();
        this.boxPool.getAllBoxes().forEach(box => {
            if (box.active) {
                const lvl = box.getLevel();
                counts.set(lvl, (counts.get(lvl) || 0) + 1);
            }
        });

        // Check if we meet requirements
        for (const req of this.activeShipment.requirements) {
            const hasCount = counts.get(req.level) || 0;
            if (hasCount < req.count) {
                return false;
            }
        }

        return true;
    }

    public claimShipment(): boolean {
        if (!this.canClaim()) return false;
        if (!this.activeShipment) return false;

        RewardManager.getInstance().grant({
            id: MathUtils.generateUUID(),
            source: RewardSource.SHIPMENT,
            bundle: { 
                money: Number(this.activeShipment.rewardCash),
                score: this.activeShipment.scoreVal 
            },
            timestamp: Date.now()
        });

        EventBus.emit(EVENTS.SHIPMENT_COMPLETED, this.activeShipment);

        // Clear and generate next
        this.activeShipment = null;
        
        const save = SaveManager.getInstance().load();
        delete save.activeShipment;
        SaveManager.getInstance().markDirty();

        // Delay next shipment generation (20 seconds cooldown)
        setTimeout(() => {
            this.generateNewShipment();
        }, 20000);

        return true;
    }

    public completeShipmentWithoutReward(): boolean {
        if (!this.activeShipment) return false;
        
        EventBus.emit(EVENTS.SHIPMENT_COMPLETED, this.activeShipment);

        this.activeShipment = null;
        
        const save = SaveManager.getInstance().load();
        delete save.activeShipment;
        SaveManager.getInstance().markDirty();

        setTimeout(() => {
            this.generateNewShipment();
        }, 20000);

        return true;
    }
}
