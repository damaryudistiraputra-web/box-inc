import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { zzfx } from '../utils/ZzFX';

export class AudioManager {
    private scene: Phaser.Scene;
    
    // Concurrency limits
    private concurrency: Map<string, number> = new Map();
    private maxConcurrency: Record<string, number> = {
        'sfx_coin': 3,
        'sfx_pop': 5,
        'sfx_merge': 2
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupListeners();
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.BOX_PICKED, () => this.playSound('sfx_pop'));
        EventBus.on(EVENTS.BOX_DROPPED, () => this.playSound('sfx_pop'));
        EventBus.on(EVENTS.BOX_LEVEL_UP, () => this.playSound('sfx_merge'));
        EventBus.on(EVENTS.SHOP_BUY_SUCCESS, () => this.playSound('sfx_buy'));
        EventBus.on(EVENTS.SHOP_BUY_FAILED, () => this.playSound('sfx_error'));
        // Listen to coin income for coin sound
        EventBus.on(EVENTS.BOX_INCOME, () => this.playSound('sfx_coin', 0.2));
    }

    private playSound(key: string, volume: number = 1.0): void {
        const limit = this.maxConcurrency[key] || 10; // default max 10
        const currentCount = this.concurrency.get(key) || 0;

        if (currentCount >= limit) {
            // Skip playing to prevent audio tearing/clipping
            return;
        }

        // Increase concurrency counter
        this.concurrency.set(key, currentCount + 1);

        try {
            // ZzFX procedural sounds
            switch (key) {
                case 'sfx_pop':
                    zzfx(1, 0.05, 300, 0.01, 0.01, 0.01, 0, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
                    break;
                case 'sfx_drop':
                    zzfx(0.8, 0.05, 200, 0.01, 0.01, 0.01, 0, 1.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
                    break;
                case 'sfx_merge':
                    zzfx(1, 0.05, 600, 0.02, 0.1, 0.1, 1, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0);
                    break;
                case 'sfx_buy':
                    zzfx(1, 0.05, 400, 0.01, 0.05, 0.05, 0, 1.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
                    break;
                case 'sfx_coin':
                    zzfx(0.3 * volume, 0.01, 1200, 0.01, 0.01, 0.01, 0, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
                    break;
                case 'sfx_error':
                    zzfx(1, 0.1, 150, 0.01, 0.1, 0.1, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
                    break;
                default:
                    zzfx(1, 0.05, 200, 0, 0.1, 0.1);
                    break;
            }
        } catch (e) {
            console.warn(`[Audio] Failed to play ${key}`, e);
        }

        // Release concurrency after approx duration (100ms)
        this.scene.time.delayedCall(100, () => {
            const count = this.concurrency.get(key) || 1;
            this.concurrency.set(key, count - 1);
        });
    }

    public destroy(): void {
        // EventBus.off is theoretically needed here if we destroy the scene
        EventBus.off(EVENTS.BOX_PICKED);
        EventBus.off(EVENTS.BOX_DROPPED);
        EventBus.off(EVENTS.BOX_LEVEL_UP);
        EventBus.off(EVENTS.SHOP_BUY_SUCCESS);
        EventBus.off(EVENTS.SHOP_BUY_FAILED);
        EventBus.off(EVENTS.BOX_INCOME);
    }
}
