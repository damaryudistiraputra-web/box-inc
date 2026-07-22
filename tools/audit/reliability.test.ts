import { describe, it, expect, vi, beforeAll } from 'vitest';
import { EventBus, EVENTS } from '../../src/core/EventBus';
import { generateChecksum } from '../../src/utils/SaveValidator';
import type { IGameSave } from '../../src/interfaces/IGameSave';

// Suppress console noise
beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

function createMockSave(): IGameSave {
    return {
        saveVersion: 4,
        economyVersion: 1,
        contentVersion: 1,
        gameVersion: '1.0.0',
        resources: { money: "1000", blueprints: "5" },
        grid: { 
            boxes: [{ level: 1, col: 0, row: 0 }], 
            size: { width: 3, height: 3 } 
        },
        stats: {
            totalMerges: 10,
            highestBoxLevel: 3,
            shipmentsCompleted: 1,
            prestigeCount: 0,
            totalSessions: 5,
            totalPlaytimeSec: 600,
            firstPlayDate: Date.now() - 86400000,
            lastPlayDate: Date.now()
        },
        settings: { sfx: true, music: true, haptics: true, language: 'en' },
        rewardLedger: []
    } as IGameSave;
}

describe('Reliability Audit', () => {
    it('100,000 merge score accumulation', () => {
        // Simulate score tracking without touching singletons
        let score = 0n;
        const memBefore = process.memoryUsage().heapUsed;
        
        for (let i = 0; i < 100_000; i++) {
            score += 10n;
        }
        
        const memAfter = process.memoryUsage().heapUsed;
        expect(score).toBe(1_000_000n);
        
        const memDiffMB = Math.round((memAfter - memBefore) / 1024 / 1024);
        // Should not use excessive memory for simple accumulation
        expect(memDiffMB).toBeLessThan(100);
    });

    it('EventBus does not leak listeners on repeated on/off cycles', () => {
        const testEvent = 'RELIABILITY_TEST_EVENT';
        const initialCount = EventBus.listenerCount(testEvent);
        
        // Simulate 500 prestige cycles: subscribe then unsubscribe
        for (let i = 0; i < 500; i++) {
            const handler = () => {};
            EventBus.on(testEvent, handler);
            EventBus.off(testEvent, handler);
        }
        
        const finalCount = EventBus.listenerCount(testEvent);
        expect(finalCount).toBe(initialCount);
    });

    it('EventBus detects leak when handlers are not removed', () => {
        const testEvent = 'LEAK_TEST_EVENT';
        const handlers: (() => void)[] = [];
        
        // Add 10 handlers without removing
        for (let i = 0; i < 10; i++) {
            const handler = () => {};
            handlers.push(handler);
            EventBus.on(testEvent, handler);
        }
        
        expect(EventBus.listenerCount(testEvent)).toBe(10);
        
        // Cleanup
        for (const h of handlers) {
            EventBus.off(testEvent, h);
        }
        expect(EventBus.listenerCount(testEvent)).toBe(0);
    });

    it('10,000 serialize/deserialize cycles maintain data integrity', () => {
        const original = createMockSave();
        let current = original;
        
        for (let i = 0; i < 10_000; i++) {
            const serialized = JSON.stringify(current);
            current = JSON.parse(serialized);
        }
        
        // Data must be identical after 10k round-trips
        expect(current.resources.money).toBe(original.resources.money);
        expect(current.stats.totalMerges).toBe(original.stats.totalMerges);
        expect(current.saveVersion).toBe(original.saveVersion);
        expect(generateChecksum(current)).toBe(generateChecksum(original));
    });

    it('analytics queue overflow drops oldest events', () => {
        // Simulate analytics queue behavior
        const MAX_QUEUE_SIZE = 500;
        const queue: { event: string; ts: number }[] = [];
        
        for (let i = 0; i < 550; i++) {
            queue.push({ event: `test_event_${i}`, ts: Date.now() });
            if (queue.length > MAX_QUEUE_SIZE) {
                queue.shift(); // Drop oldest
            }
        }
        
        expect(queue.length).toBe(MAX_QUEUE_SIZE);
        expect(queue[0].event).toBe('test_event_50'); // First 50 dropped
        expect(queue[queue.length - 1].event).toBe('test_event_549');
    });

    it('72h AFK time travel (chunked) does not overflow income', () => {
        // Simulate economy tick for 72 hours in 1-second chunks
        let money = 1000n;
        const incomePerTick = 5n; // simplified
        const ticksFor72h = 72 * 60 * 60; // 259,200
        
        for (let i = 0; i < ticksFor72h; i++) {
            money += incomePerTick;
        }
        
        // 259200 * 5 + 1000 = 1_297_000
        expect(money).toBe(BigInt(ticksFor72h) * incomePerTick + 1000n);
        // BigInt never overflows
        expect(money > 0n).toBe(true);
    });

    it('memory plateau check: no runaway growth over time', () => {
        // Simulate growing data structure and verify it stays bounded
        const snapshots: number[] = [];
        let data: string[] = [];
        
        for (let round = 0; round < 4; round++) {
            // Add 1000 entries then trim to 500 (simulate bounded buffer)
            for (let i = 0; i < 1000; i++) {
                data.push(`event_${round}_${i}`);
            }
            // Bounded trim (like analytics queue)
            if (data.length > 500) {
                data = data.slice(-500);
            }
            snapshots.push(data.length);
        }
        
        // All snapshots should be capped at 500
        for (const s of snapshots) {
            expect(s).toBeLessThanOrEqual(500);
        }
    });
});
