import { RewardManager } from '../managers/RewardManager';
import { AdsManager } from '../managers/AdsManager';
import { SaveManager } from '../managers/SaveManager';
import { MathUtils } from './MathUtils';
import { RewardSource } from '../interfaces/IReward';
import { RemoteConfigManager } from '../managers/RemoteConfigManager';
import { PlatformManager } from '../platform/PlatformManager';
import { HeatmapManager } from '../managers/HeatmapManager';
import { FeatureFlags } from '../config/GameBalance';

export class MonetizationTests {
    public static initialize(): void {
        (window as any).runMonetizationTest = async (testId: number) => {
            console.log(`[MonetizationTest] Running Test ${testId}...`);
            switch (testId) {
                case 1:
                    await this.testDuplicateReward();
                    break;
                case 2:
                    await this.testCrashRecovery();
                    break;
                case 3:
                    await this.testSaveEditing();
                    break;
                case 4:
                    await this.testSpamClick();
                    break;
                case 5:
                    await this.testSaveMigration();
                    break;
                case 6:
                    await this.testSaveStress();
                    break;
                case 7:
                    await this.testPlatformFailure();
                    break;
                case 8:
                    await this.testConfigFailureFallback();
                    break;
                case 9:
                    await this.testConfigValidation();
                    break;
                case 10:
                    await this.testHeatmapBatching();
                    break;
                case 11:
                    await this.testDynamicFeatureToggle();
                    break;
                case 12:
                    await this.testSlotRecovery(true, false); // A valid, B corrupt
                    break;
                case 13:
                    await this.testSlotRecovery(false, true); // A corrupt, B valid
                    break;
                case 14:
                    await this.testSlotRecovery(false, false); // Both corrupt
                    break;
                default:
                    console.log(`[MonetizationTest] Unknown test ID ${testId}`);
            }
        };
        console.log(`[MonetizationTest] Initialized. Run window.runMonetizationTest(1-7) in console.`);
    }

    private static async testDuplicateReward(): Promise<void> {
        console.log("Scenario: RewardID = abc123, grant() twice");
        const rewardId = "test-dup-" + MathUtils.generateUUID();
        
        RewardManager.getInstance().grant({
            id: rewardId,
            source: RewardSource.SHIPMENT,
            bundle: { money: 100 },
            timestamp: Date.now()
        });

        console.log("First grant requested. Attempting second grant with same ID...");

        RewardManager.getInstance().grant({
            id: rewardId,
            source: RewardSource.SHIPMENT,
            bundle: { money: 100 },
            timestamp: Date.now()
        });

        console.log("Check console logs. You should see a rejection for duplicate reward.");
    }

    private static async testCrashRecovery(): Promise<void> {
        console.log("Scenario: Watch Ad -> PENDING -> browser crash -> reload");
        
        const save = SaveManager.getInstance().load();
        save.rewardLedger = save.rewardLedger || [];
        save.rewardLedger.push({
            id: "test-crash-" + MathUtils.generateUUID(),
            source: RewardSource.SHIPMENT,
            createdAt: Date.now(),
            state: "PENDING",
            bundle: { money: 99999 },
            checksum: "",
            schemaVersion: 4
        });
        
        // Fix checksum
        const { generateStringChecksum } = await import('./SaveValidator');
        const ledger = save.rewardLedger || [];
        const entry = ledger[ledger.length - 1];
        if (entry) {
            entry.checksum = generateStringChecksum(`${entry.id}:${entry.source}:${entry.createdAt}:${JSON.stringify(entry.bundle)}`);
            SaveManager.getInstance().markDirty();
        }
        console.log("Inserted PENDING reward. Please REFRESH THE BROWSER now. On reload, the reward should be automatically completed.");
    }

    private static async testSaveEditing(): Promise<void> {
        console.log("Scenario: Save File tampered (amount changed, checksum unchanged)");
        
        const save = SaveManager.getInstance().load();
        save.rewardLedger = save.rewardLedger || [];
        
        // Add valid entry
        const entry = {
            id: "test-tamper-" + MathUtils.generateUUID(),
            source: RewardSource.SHIPMENT,
            createdAt: Date.now(),
            state: "PENDING" as const,
            bundle: { money: 100 },
            checksum: "",
            schemaVersion: 4
        };
        const { generateStringChecksum } = await import('./SaveValidator');
        entry.checksum = generateStringChecksum(`${entry.id}:${entry.source}:${entry.createdAt}:${JSON.stringify(entry.bundle)}`);
        
        const ledger = save.rewardLedger || [];
        ledger.push(entry);

        // Tamper with bundle
        entry.bundle.money = 9999999;
        
        SaveManager.getInstance().markDirty();
        console.log("Save file tampered! Please REFRESH THE BROWSER now. The tampered reward should be discarded.");
    }

    private static async testSpamClick(): Promise<void> {
        console.log("Scenario: User spams 'Watch Ad' button");
        
        console.log("Click 1");
        AdsManager.getInstance().showRewarded(
            RewardSource.SHIPMENT,
            { money: 100 },
            () => { console.log("Ad 1 completed"); },
            () => { console.log("Ad 1 failed"); }
        );

        console.log("Click 2");
        AdsManager.getInstance().showRewarded(
            RewardSource.SHIPMENT,
            { money: 100 },
            () => { console.log("Ad 2 completed"); },
            () => { console.log("Ad 2 failed"); }
        );
        
        console.log("You should only see one ad process start. Second click should be rejected by AdState check.");
    }

    private static async testSaveMigration(): Promise<void> {
        console.log("Scenario: Load legacy save (v1/v2/v3) and verify migration to v4 schema");
        const versions = ['v1', 'v2', 'v3'];
        
        for (const v of versions) {
            try {
                const res = await fetch(`/fixtures/save_${v}.json`);
                if (!res.ok) throw new Error(`Could not fetch save_${v}.json`);
                
                const rawData = await res.json();
                
                // Overwrite local storage directly to bypass Cache
                localStorage.setItem('boxinc_save', JSON.stringify(rawData));
                
                // Force SaveManager to reload from disk and migrate
                (SaveManager.getInstance() as any).cachedSave = null;
                const migrated = SaveManager.getInstance().load();
                
                console.log(`Migrated ${v} -> v${migrated.saveVersion}`, migrated);
                if (migrated.saveVersion !== 4) {
                    console.error(`Migration Failed for ${v}: Expected saveVersion 4, got ${migrated.saveVersion}`);
                }
                if (!migrated.rewardLedger) {
                    console.error(`Migration Failed for ${v}: rewardLedger is missing`);
                }
            } catch (e) {
                console.error(`Error migrating ${v}`, e);
            }
        }
        
        console.log("Migration test finished.");
    }

    private static async testSaveStress(): Promise<void> {
        console.log("Scenario: Save -> Load -> Save 500x to detect corruption");
        
        const saveMgr = SaveManager.getInstance();
        let currentSave = saveMgr.load();
        
        console.time("SaveStressTest");
        for (let i = 0; i < 500; i++) {
            // Modify something trivial
            currentSave.stats.mergeScore += 1;
            saveMgr.markDirty();
            saveMgr.forceSave();
            
            // Reload bypassing cache
            (saveMgr as any).cachedSave = null;
            const reloaded = saveMgr.load();
            
            if (reloaded.stats.mergeScore !== currentSave.stats.mergeScore) {
                console.error(`Stress Test Failed at iteration ${i}: Score mismatch`);
                return;
            }
            currentSave = reloaded;
        }
        console.timeEnd("SaveStressTest");
        console.log("Stress test passed! 500 save/load cycles completed successfully.");
    }

    private static async testPlatformFailure(): Promise<void> {
        console.log("Scenario: YandexPlatform initialization timeout/fallback");
        
        const { PlatformManager } = await import('../platform/PlatformManager');
        const { YandexPlatform } = await import('../platform/YandexPlatform');
        const { WebPlatform } = await import('../platform/WebPlatform');
        
        console.log("Forcing PlatformManager to inject a failing YandexPlatform...");
        PlatformManager.forcePlatform(new YandexPlatform());
        
        // Temporarily unset window.YaGames and ysdk to force the failure
        const _YaGames = (window as any).YaGames;
        const _ysdk = (window as any).ysdk;
        (window as any).YaGames = undefined;
        (window as any).ysdk = undefined;
        
        console.log("Initializing PlatformManager (should timeout/fail and fallback to Web)...");
        await PlatformManager.initialize();
        
        // Restore
        (window as any).YaGames = _YaGames;
        (window as any).ysdk = _ysdk;
        
        console.log("Initialization complete. Platform is now:", PlatformManager.getInstance()['platform'] instanceof WebPlatform ? 'WebPlatform' : 'FAILED');
    }

    private static async testConfigFailureFallback(): Promise<void> {
        console.log("Scenario: Remote Config fetch fails -> fallback to local");
        // We override fetch temporarily
        const originalFetch = window.fetch;
        window.fetch = () => Promise.reject("Simulated Network Error");
        
        await RemoteConfigManager.getInstance().fetchConfig();
        console.log("Config version after failure:", RemoteConfigManager.getInstance().getConfigVersion());
        
        window.fetch = originalFetch;
    }

    private static async testConfigValidation(): Promise<void> {
        console.log("Scenario: Remote Config corrupt (chance > 1) -> validator rejects");
        const rcm = RemoteConfigManager.getInstance();
        const badPayload: any = {
            version: 99,
            economy: { criticalMergeChance: 500, prestigeBonus: 0, shipmentRewardMultiplier: 1 }
        };
        // @ts-ignore testing private validate
        const isValid = rcm['validateConfig'](badPayload);
        console.log("Validator accepted?", isValid, "(Should be false)");
    }

    private static async testHeatmapBatching(): Promise<void> {
        console.log("Scenario: 1000 drags -> batched");
        for (let i = 0; i < 1000; i++) {
            HeatmapManager.getInstance().trackInteraction('test_drag', 1, 1);
        }
        console.log("Check Network/Console for heatmap payload batching.");
    }

    private static async testDynamicFeatureToggle(): Promise<void> {
        console.log("Scenario: Remote Config toggles Golden Truck");
        console.log("Before: goldenTruckEnabled =", FeatureFlags.goldenTruck);
        FeatureFlags.goldenTruck = false;
        console.log("After: goldenTruckEnabled =", FeatureFlags.goldenTruck);
    }

    private static async testSlotRecovery(aValid: boolean, bValid: boolean): Promise<void> {
        console.log(`Scenario: Slot A ${aValid ? 'Valid' : 'Corrupt'}, Slot B ${bValid ? 'Valid' : 'Corrupt'}`);
        const storage = PlatformManager.getStorage();
        
        const saveStr = JSON.stringify({
            checksum: "123",
            payload: { resources: { money: "100" }, stats: {}, grid: {boxes:[]}, modifiers: {}, daily: {}, saveVersion: 4 }
        });
        
        storage.setItem('boxinc_save_a', aValid ? saveStr : "{bad_json}");
        storage.setItem('boxinc_save_b', bValid ? saveStr : "{bad_json}");
        
        const save = SaveManager.getInstance().load();
        console.log("Loaded save. money =", save.resources?.money);
    }
}
