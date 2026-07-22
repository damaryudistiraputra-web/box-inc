import type { IGameSave } from '../interfaces/IGameSave';
import { TimeProvider } from '../utils/TimeProvider';
import { EventBus, EVENTS } from '../core/EventBus';
import { SaveValidator, generateChecksum, generateStringChecksum } from '../utils/SaveValidator';
import type { ISaveWrapper } from '../utils/SaveValidator';
import { PlatformManager } from '../platform/PlatformManager';
import { MathUtils } from '../utils/MathUtils';
import { HealthStatus } from '../interfaces/IHealth';
import type { IHealthStats } from '../interfaces/IHealth';

export class SaveManager {
    private static SAVE_KEY_A = 'boxinc_save_a';
    private static SAVE_KEY_B = 'boxinc_save_b';
    private static SAVE_KEY_ACTIVE = 'boxinc_active_slot';
    private static CURRENT_SAVE_VERSION = 4;
    private static GAME_VERSION = '0.9.0';
    private static ECONOMY_VERSION = 1;
    private static CONTENT_VERSION = 1;

    // Singleton instance
    private static instance: SaveManager;
    
    private isDirty: boolean = false;
    private cachedSave: IGameSave | null = null;
    private validator: SaveValidator;

    private constructor() {
        this.validator = new SaveValidator();
        
        // Save on unload
        window.addEventListener('beforeunload', () => {
            if (this.isDirty) {
                // We must ask GameScene to build save data one last time synchronously
                EventBus.emit(EVENTS.REQUEST_SAVE_DATA);
                this.forceSave();
            }
        });
        
        EventBus.on(EVENTS.GAME_STATE_UPDATED, (partialData: Partial<IGameSave>) => {
            this.updateCache(partialData);
        });
    }

    public static getInstance(): SaveManager {
        if (!SaveManager.instance) {
            SaveManager.instance = new SaveManager();
        }
        return SaveManager.instance;
    }

    public markDirty(): void {
        this.isDirty = true;
    }

    public load(): IGameSave {
        if (this.cachedSave) {
            return this.cachedSave;
        }

        const slotA = this.loadInternal(SaveManager.SAVE_KEY_A);
        const slotB = this.loadInternal(SaveManager.SAVE_KEY_B);

        if (!slotA && !slotB) {
            console.error('[SaveManager] Both slots invalid. Starting fresh.');
            this.cachedSave = this.createEmptySave();
            
            // Generate UUID on first save creation
            import('../managers/AnalyticsManager').then(({ AnalyticsManager }) => {
                // @ts-ignore
                AnalyticsManager.getInstance().logEvent('save_recovery_failed', { reason: 'both_corrupt' });
            });
            
            return this.cachedSave;
        }

        if (slotA && slotB) {
            this.cachedSave = slotA.lastSaveTime >= slotB.lastSaveTime ? slotA : slotB;
            console.log(`[SaveManager] Loaded newer slot ${slotA.lastSaveTime >= slotB.lastSaveTime ? 'A' : 'B'}`);
        } else if (slotA) {
            this.cachedSave = slotA;
            console.log('[SaveManager] Loaded slot A');
        } else if (slotB) {
            this.cachedSave = slotB;
            console.log('[SaveManager] Loaded slot B');
        }

        // Generate deviceId if missing
        if (!this.cachedSave!.deviceId) {
            this.cachedSave!.deviceId = 'id_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }

        return this.cachedSave!;
    }

    private loadInternal(key: string): IGameSave | null {
        const data = PlatformManager.getStorage().getItem(key);
        if (!data) return null;

        try {
            const wrapper = JSON.parse(data) as ISaveWrapper;
            
            // Check wrapper schema
            if (!wrapper.checksum || !wrapper.payload) return null;
            
            // Validate checksum
            const expectedChecksum = generateChecksum(wrapper.payload);
            if (expectedChecksum !== wrapper.checksum) {
                console.warn(`[SaveManager] Checksum mismatch in ${key}`);
                return null;
            }

            // Migrate if needed
            let save = this.migrate(wrapper.payload);
            
            // Validate business rules
            const validation = this.validator.validate(save);
            if (!validation.valid) {
                console.warn(`[SaveManager] Save logic validation failed in ${key}: ${validation.error}`);
                return null;
            }

            // Validate Reward Ledger Checksums
            if (save.rewardLedger && Array.isArray(save.rewardLedger)) {
                const validLedger = [];
                for (const entry of save.rewardLedger) {
                    const expected = generateStringChecksum(`${entry.id}_${entry.source}_${entry.createdAt}_${JSON.stringify(entry.bundle)}`);
                    if (entry.checksum === expected) {
                        validLedger.push(entry);
                    } else {
                        console.warn(`[SaveManager] RewardLedger checksum mismatch for ${entry.id}. Discarding.`);
                    }
                }
                save.rewardLedger = validLedger;
            }
            
            return save;
        } catch (e) {
            console.error(`[SaveManager] Failed to parse ${key}`, e);
            return null;
        }
    }

    public updateCache(partialData: Partial<IGameSave>): void {
        if (!this.cachedSave) {
            this.cachedSave = this.createEmptySave();
        }
        this.cachedSave = { ...this.cachedSave, ...partialData };
        this.markDirty();
    }

    public forceSave(): void {
        if (!this.cachedSave) return;
        
        EventBus.emit(EVENTS.REQUEST_SAVE_DATA); // Ensure cache is latest
        
        this.cachedSave.lastSaveTime = TimeProvider.now();
        
        const wrapper: ISaveWrapper = {
            checksum: generateChecksum(this.cachedSave),
            payload: this.cachedSave
        };
        
        const jsonStr = JSON.stringify(wrapper);
        
        const storage = PlatformManager.getStorage();
        let activeSlot = storage.getItem(SaveManager.SAVE_KEY_ACTIVE) || 'A';
        const targetSlotKey = activeSlot === 'A' ? SaveManager.SAVE_KEY_B : SaveManager.SAVE_KEY_A;
        
        // Save to inactive slot
        storage.setItem(targetSlotKey, jsonStr);
        
        // Verify write was successful before switching active pointer
        const verifiedData = storage.getItem(targetSlotKey);
        if (verifiedData === jsonStr) {
            storage.setItem(SaveManager.SAVE_KEY_ACTIVE, activeSlot === 'A' ? 'B' : 'A');
        } else {
            console.error('[SaveManager] Failed to verify save write to ' + targetSlotKey);
            // Fallback: try saving to active slot directly if target failed
            const currentSlotKey = activeSlot === 'A' ? SaveManager.SAVE_KEY_A : SaveManager.SAVE_KEY_B;
            storage.setItem(currentSlotKey, jsonStr);
        }
        
        this.isDirty = false;
        console.log('[SaveManager] Saved at', new Date(this.cachedSave.lastSaveTime).toLocaleTimeString());
    }

    public resetForPrestige(): void {
        if (!this.cachedSave) return;
        
        // Wipe grid
        this.cachedSave.grid.boxes = [];
        // Wipe money
        this.cachedSave.resources.money = "0";
        // Wipe session stats
        this.cachedSave.stats.mergeScore = 0;
        this.cachedSave.stats.mergeMeter = 0;
        this.cachedSave.stats.highestBoxLevel = 1;
        this.cachedSave.stats.luckyPityCounter = 0;
        
        // Increment prestige counter
        this.cachedSave.stats.prestigeCount = (this.cachedSave.stats.prestigeCount || 0) + 1;

        // Note: We DO NOT touch totalMoneyEarned, blueprints, achievements, daily stats, or totalMerges.
        
        this.markDirty();
        this.forceSave();
    }

    private migrate(save: any): IGameSave {
        let currentVersion = save.version || 0; // Legacy version
        let currentSaveVersion = save.saveVersion || 1;

        if (currentVersion < 1) {
            save.version = 1;
            save.stats = save.stats || {
                totalMerges: 0,
                totalMoneyEarned: "0",
                boxesBought: 0,
                highestBoxLevel: 1,
                shipmentsCompleted: 0,
                mergeScore: 0,
                mergeMeter: 0,
                luckyPityCounter: 0,
                prestigeCount: 0,
                trucksClaimed: 0
            };
            save.daily = save.daily || {
                lastClaimTime: 0,
                streak: 0
            };
            save.achievements = save.achievements || [];
            currentVersion = 1;
        }

        // Migrate to Save Version 2 (Introduced detailed versioning)
        if (currentSaveVersion < 2) {
            save.saveVersion = 2;
            save.gameVersion = save.gameVersion || SaveManager.GAME_VERSION;
            save.economyVersion = save.economyVersion || SaveManager.ECONOMY_VERSION;
            save.contentVersion = save.contentVersion || SaveManager.CONTENT_VERSION;
            currentSaveVersion = 2;
        }

        // Migrate to Save Version 3 (Ads & Idempotency)
        if (currentSaveVersion < 3) {
            save.saveVersion = 3;
            save.pendingRewards = save.pendingRewards || [];
            save.adsToday = save.adsToday || 0;
            save.lastAdResetDate = save.lastAdResetDate || 0;
            currentSaveVersion = 3;
        }

        // Migrate to Save Version 4 (Reward Ledger)
        if (currentSaveVersion < 4) {
            save.saveVersion = 4;
            save.rewardLedger = save.rewardLedger || [];
            if (save.pendingRewards) {
                delete save.pendingRewards;
            }
            save.adsToday = save.adsToday || 0;
            save.lastAdResetDate = save.lastAdResetDate || 0;
            currentSaveVersion = 4;
        }

        return save as IGameSave;
    }

    private createEmptySave(): IGameSave {
        return {
            version: 1, // Deprecated but kept for backwards compatibility parsing
            saveVersion: SaveManager.CURRENT_SAVE_VERSION,
            deviceId: 'dev_' + MathUtils.generateUUID(),
            gameVersion: SaveManager.GAME_VERSION,
            economyVersion: SaveManager.ECONOMY_VERSION,
            contentVersion: SaveManager.CONTENT_VERSION,
            lastSaveTime: TimeProvider.now(),
            resources: {
                money: "0" 
            },
            grid: {
                boxes: []
            },
            modifiers: {
                incomeMultiplier: 1.0,
                discountMultiplier: 1.0,
                startingLevel: 1,
                criticalChance: 0.05
            },
            stats: {
                totalMerges: 0,
                totalMoneyEarned: "0",
                boxesBought: 0,
                highestBoxLevel: 1,
                shipmentsCompleted: 0,
                mergeScore: 0,
                mergeMeter: 0,
                luckyPityCounter: 0,
                prestigeCount: 0,
                trucksClaimed: 0
            },
            daily: {
                lastClaimTime: 0,
                streak: 0
            },
            achievements: [],
            rewardLedger: [],
            adsToday: 0,
            lastAdResetDate: 0
        };
    }

    public getDeviceId(): string {
        if (!this.cachedSave) return '';
        return this.cachedSave.deviceId || '';
    }

    public getHealthStats(): IHealthStats {
        let status: HealthStatus = HealthStatus.HEALTHY;
        const now = TimeProvider.now();
        const dirtyMs = this.isDirty && this.cachedSave ? now - this.cachedSave.lastSaveTime : 0;
        
        if (dirtyMs > 30000) {
            status = HealthStatus.CRITICAL;
        } else if (dirtyMs > 10000) {
            status = HealthStatus.WARNING;
        }
        
        return {
            status,
            lastSaveTime: this.cachedSave ? this.cachedSave.lastSaveTime : 0,
            isDirty: this.isDirty
        };
    }
}
