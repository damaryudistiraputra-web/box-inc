import { EventBus, EVENTS } from '../core/EventBus';

export class HapticsManager {
    private static instance: HapticsManager;
    private hasVibration: boolean = false;

    private constructor() {
        this.hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;
        this.setupListeners();
    }

    public static getInstance(): HapticsManager {
        if (!HapticsManager.instance) {
            HapticsManager.instance = new HapticsManager();
        }
        return HapticsManager.instance;
    }

    private setupListeners(): void {
        // Suppress TS errors for dynamic keys if needed, or use specific EVENTS
        EventBus.on(EVENTS.HAPTIC_LIGHT, () => this.vibrate(10));
        EventBus.on(EVENTS.HAPTIC_MEDIUM, () => this.vibrate(25));
        EventBus.on(EVENTS.HAPTIC_HEAVY, () => this.vibrate(50));
        
        // Wire standard events to haptics
        EventBus.on(EVENTS.BOX_PICKED, () => this.vibrate(10));
        EventBus.on(EVENTS.SHOP_BUY_SUCCESS, () => this.vibrate(15));
        EventBus.on(EVENTS.SHOP_BUY_FAILED, () => this.vibrate([20, 50, 20]));
    }

    private vibrate(pattern: number | number[]): void {
        if (!this.hasVibration) return;
        
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Ignore if blocked by browser policy
        }
    }
}
