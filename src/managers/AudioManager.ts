import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';

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

        // Actually play sound (assuming they are loaded in PreloadScene)
        // If they are not loaded, Phaser will just warn.
        try {
            // We use 'any' if the cache doesn't have it, we catch it
            if (this.scene.cache.audio.exists(key)) {
                const sound = this.scene.sound.add(key, { volume });
                sound.play();
                
                sound.once('complete', () => {
                    const count = this.concurrency.get(key) || 1;
                    this.concurrency.set(key, count - 1);
                    sound.destroy();
                });
            } else {
                // Fallback / Mock
                // console.log(`[Audio] Playing ${key} (mock)`);
                // Simulate duration
                this.scene.time.delayedCall(300, () => {
                    const count = this.concurrency.get(key) || 1;
                    this.concurrency.set(key, count - 1);
                });
            }
        } catch (e) {
            console.warn(`[Audio] Failed to play ${key}`);
            const count = this.concurrency.get(key) || 1;
            this.concurrency.set(key, count - 1);
        }
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
