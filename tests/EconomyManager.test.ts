import { describe, it, expect, beforeEach } from 'vitest';
import { EconomyManager } from '../src/managers/EconomyManager';
import type { IIncomeSource } from '../src/interfaces/IIncomeSource';
import { Modifiers } from '../src/managers/ModifierManager';
import { EventBus, EVENTS } from '../src/core/EventBus';
import Phaser from 'phaser';

describe('EconomyManager', () => {
    
    beforeEach(() => {
        Object.assign(Modifiers, {
            incomeMultiplier: 1.0,
            discountMultiplier: 1.0,
            startingLevel: 1,
            criticalChance: 0.05,
            criticalMultiplier: 2.0
        });
    });

    it('should aggregate income from sources on tick', () => {
        const mockScene = {
            time: {
                addEvent: () => ({ destroy: () => {} })
            }
        } as unknown as Phaser.Scene;

        const economy = new EconomyManager(mockScene);
        
        const mockSource1: IIncomeSource = {
            getId: () => '1',
            getIncomePerSecond: () => ({ money: 10n }),
            isActiveSource: () => true
        };
        
        const mockSource2: IIncomeSource = {
            getId: () => '2',
            getIncomePerSecond: () => ({ money: 20n }),
            isActiveSource: () => true
        };
        
        economy.registerSource(mockSource1);
        economy.registerSource(mockSource2);
        
        let totalReceived = 0n;
        EventBus.on(EVENTS.RESOURCE_ADD, (data: { id: string, amount: bigint }) => {
            if (data.id === 'money') {
                totalReceived += data.amount;
            }
        });
        
        // Manually trigger onTick (private method, so we cast to any)
        (economy as any).onTick();
        
        expect(totalReceived).toBe(30n);
    });

    it('should ignore inactive sources', () => {
        const mockScene = {
            time: {
                addEvent: () => ({ destroy: () => {} })
            }
        } as unknown as Phaser.Scene;

        const economy = new EconomyManager(mockScene);
        
        const mockSource1: IIncomeSource = {
            getId: () => '1',
            getIncomePerSecond: () => ({ money: 10n }),
            isActiveSource: () => false // Inactive
        };
        
        economy.registerSource(mockSource1);
        
        let totalReceived = 0n;
        EventBus.on(EVENTS.RESOURCE_ADD, (data: { id: string, amount: bigint }) => {
            if (data.id === 'money') {
                totalReceived += data.amount;
            }
        });
        
        (economy as any).onTick();
        
        expect(totalReceived).toBe(0n);
    });
});
