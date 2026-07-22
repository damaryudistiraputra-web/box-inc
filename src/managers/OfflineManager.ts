import { TimeProvider } from '../utils/TimeProvider';
import type { IGameSave } from '../interfaces/IGameSave';
import { BOX_CONFIG } from '../config/BoxConfig';
import { EventBus, EVENTS } from '../core/EventBus';

export class OfflineManager {
    public static MAX_OFFLINE_SECONDS = 12 * 60 * 60; // 12 hours

    public static processOfflineProgress(saveData: IGameSave): void {
        const now = TimeProvider.now();
        const lastSave = saveData.lastSaveTime;

        if (lastSave === 0) return; // First time playing

        let secondsAway = Math.floor((now - lastSave) / 1000);
        
        if (secondsAway < 60) return; // Don't give offline income if away for less than a minute

        if (secondsAway > this.MAX_OFFLINE_SECONDS) {
            secondsAway = this.MAX_OFFLINE_SECONDS;
        }

        // Calculate income per second from saved grid state and modifiers
        let incomePerSecond = 0n;
        const incomeMultiplier = saveData.modifiers.incomeMultiplier;
        
        // Critical is not applied to offline by design, or we can use average critical
        // average = 1 + (criticalChance * (criticalMultiplier - 1))
        // Since we don't store criticalMultiplier in save (it's constant), we'll skip it or hardcode 2.0
        const criticalAverage = 1 + (saveData.modifiers.criticalChance * (2.0 - 1));

        for (const box of saveData.grid.boxes) {
            const config = BOX_CONFIG[box.level];
            if (config) {
                // Approximate income per second (assuming 1 tick per second)
                const baseIncome = Number(config.baseValue) * incomeMultiplier * criticalAverage;
                incomePerSecond += BigInt(Math.floor(baseIncome));
            }
        }

        if (incomePerSecond > 0n) {
            const totalOfflineIncome = incomePerSecond * BigInt(secondsAway);
            
            // Give money immediately (or wait for UI confirmation if we want)
            EventBus.emit(EVENTS.RESOURCE_ADD, { id: 'money', amount: totalOfflineIncome });
            
            console.log(`[OfflineManager] Away for ${secondsAway}s. Earned: $${totalOfflineIncome}`);
            
            // Emit event so UI can show "Welcome Back" dialog
            EventBus.emit('OFFLINE_INCOME_EARNED', {
                secondsAway,
                amount: totalOfflineIncome
            });
        }
    }
}
