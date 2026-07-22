import { AnalyticsManager } from './AnalyticsManager';
import { RewardManager } from './RewardManager';
import { SaveManager } from './SaveManager';
import { EconomyManager } from './EconomyManager';
import { HealthStatus } from '../interfaces/IHealth';
import { TimeProvider } from '../utils/TimeProvider';

export class WatchdogManager {
    private static instance: WatchdogManager;
    private lastHeartbeatMs: number = TimeProvider.now();
    private timerId?: any;

    private constructor() {
        // Poll every 30 seconds
        this.timerId = setInterval(() => this.checkHealth(), 30000);
    }

    public static getInstance(): WatchdogManager {
        if (!WatchdogManager.instance) {
            WatchdogManager.instance = new WatchdogManager();
        }
        return WatchdogManager.instance;
    }

    public stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = undefined;
        }
    }

    public getLastHeartbeat(): number {
        return this.lastHeartbeatMs;
    }

    private checkHealth() {
        try {
            this.lastHeartbeatMs = TimeProvider.now();
            const health = {
                analytics: AnalyticsManager.getInstance().getHealthStats(),
                reward: RewardManager.getInstance().getHealthStats(),
                save: SaveManager.getInstance().getHealthStats(),
                economy: EconomyManager.getInstance()?.getHealthStats() || null
            };

            // Log if something is failing hard
            const isCritical = Object.values(health).some((h: any) => h && h.status === HealthStatus.CRITICAL);
            const isWarning = Object.values(health).some((h: any) => h && h.status === HealthStatus.WARNING);
            
            if (isCritical) {
                console.error('[Watchdog] Critical subsystem failure detected!', health);
                try {
                    // @ts-ignore
                    AnalyticsManager.getInstance().logEvent('watchdog_critical', health);
                } catch(e) {}
            } else if (isWarning) {
                console.warn('[Watchdog] Warning in subsystem health', health);
            }
        } catch (e) {
            console.error('[Watchdog] Exception during health check', e);
        }
    }
}
