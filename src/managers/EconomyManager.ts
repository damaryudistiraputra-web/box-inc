import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import type { IIncomeSource } from '../interfaces/IIncomeSource';

import { GameBalance } from '../config/GameBalance';
import { ResourceManager } from './ResourceManager';
import { SaveManager } from './SaveManager';
import { TimeProvider } from '../utils/TimeProvider';
import { HealthStatus } from '../interfaces/IHealth';
import type { IHealthStats } from '../interfaces/IHealth';

export class EconomyManager {
    private static instance: EconomyManager;
    private scene: Phaser.Scene;
    private sources: Set<IIncomeSource> = new Set();
    private tickEvent: Phaser.Time.TimerEvent;
    private lastIncomeTimestamp: number = 0;

    constructor(scene: Phaser.Scene, tickRateMs: number = 1000) {
        EconomyManager.instance = this;
        this.scene = scene;
        
        // Setup global 1-second tick loop
        this.tickEvent = this.scene.time.addEvent({
            delay: tickRateMs,
            callback: this.onTick,
            callbackScope: this,
            loop: true
        });
    }

    public static getInstance(): EconomyManager {
        return EconomyManager.instance;
    }

    public registerSource(source: IIncomeSource): void {
        this.sources.add(source);
    }

    public unregisterSource(source: IIncomeSource): void {
        this.sources.delete(source);
    }

    public applyBoost(multiplier: number, durationSec: number): void {
        const save = SaveManager.getInstance().load();
        const now = TimeProvider.now();
        
        const currentEnd = save.modifiers.boostEndTimeMs || 0;
        
        if (currentEnd > now) {
            save.modifiers.boostEndTimeMs = currentEnd + (durationSec * 1000);
            save.modifiers.activeBoostMultiplier = multiplier;
        } else {
            save.modifiers.boostEndTimeMs = now + (durationSec * 1000);
            save.modifiers.activeBoostMultiplier = multiplier;
        }
        
        SaveManager.getInstance().markDirty();
        EventBus.emit('BOOST_UPDATED');
    }

    public getBoostState(): { active: boolean, multiplier: number, remainingMs: number } {
        const save = SaveManager.getInstance().load();
        const now = TimeProvider.now();
        const end = save.modifiers.boostEndTimeMs || 0;
        
        if (end > now) {
            return {
                active: true,
                multiplier: save.modifiers.activeBoostMultiplier || 1,
                remainingMs: end - now
            };
        }
        return { active: false, multiplier: 1, remainingMs: 0 };
    }

    public getHealthStats(): IHealthStats {
        let status: HealthStatus = HealthStatus.HEALTHY;
        const now = Date.now();
        const drop = this.lastIncomeTimestamp > 0 && (now - this.lastIncomeTimestamp) > 10000;
        
        if (drop) status = HealthStatus.WARNING;
        
        return {
            status,
            incomePerSec: this.getIncomePerSecond().toString(),
            lastIncomeTimestamp: this.lastIncomeTimestamp
        };
    }

    private onTick(): void {
        const aggregatedIncome: Record<string, bigint> = {};

        // Aggregate income from all active sources
        // Calculate base income
        for (const source of this.sources) {
            if (source.isActiveSource()) {
                const income = source.getIncomePerSecond();
                for (const [resourceId, amount] of Object.entries(income)) {
                    if (!aggregatedIncome[resourceId]) {
                        aggregatedIncome[resourceId] = 0n;
                    }
                    aggregatedIncome[resourceId] += amount;
                }
            }
        }

        // Apply global multipliers (e.g. Blueprints)
        const blueprints = Number(ResourceManager.getInstance().getBalance('blueprint'));
        const blueprintBonus = 1 + (blueprints * GameBalance.BLUEPRINT_INCOME_MULTIPLIER);
        
        const boostState = this.getBoostState();
        const activeBoost = boostState.active ? boostState.multiplier : 1;

        // Emit EVENT to add resources for each type collected
        for (const [resourceId, amount] of Object.entries(aggregatedIncome)) {
            if (amount > 0n) {
                const finalAmount = resourceId === 'money' 
                    ? BigInt(Math.floor(Number(amount) * blueprintBonus * activeBoost)) 
                    : amount;
                    
                EventBus.emit(EVENTS.RESOURCE_ADD, { id: resourceId, amount: finalAmount });
            }
        }
    }

    public getIncomePerSecond(): bigint {
        let total = 0n;
        for (const source of this.sources) {
            if (source.isActiveSource()) {
                const income = source.getIncomePerSecond();
                if (income['money']) {
                    total += income['money'];
                }
            }
        }
        const blueprints = Number(ResourceManager.getInstance().getBalance('blueprint'));
        const blueprintBonus = 1 + (blueprints * GameBalance.BLUEPRINT_INCOME_MULTIPLIER);
        
        const boostState = this.getBoostState();
        const activeBoost = boostState.active ? boostState.multiplier : 1;

        return BigInt(Math.floor(Number(total) * blueprintBonus * activeBoost));
    }

    public destroy(): void {
        this.tickEvent.destroy();
        this.sources.clear();
    }
}
