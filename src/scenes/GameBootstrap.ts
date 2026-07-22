import Phaser from 'phaser';
import { SaveManager } from '../managers/SaveManager';
import { Modifiers } from '../managers/ModifierManager';
import { StatisticsManager } from '../managers/StatisticsManager';
import { AchievementManager } from '../managers/AchievementManager';
import { DailyRewardManager } from '../managers/DailyRewardManager';
import { OfflineManager } from '../managers/OfflineManager';
import { AnalyticsManager } from '../managers/AnalyticsManager';
import { ReplayRecorder } from '../managers/ReplayRecorder';
import { HapticsManager } from '../managers/HapticsManager';
import { SettingsManager } from '../managers/SettingsManager';
import { ProgressionManager } from '../managers/ProgressionManager';
import type { IGameSave } from '../interfaces/IGameSave';
import { PlatformManager } from '../platform/PlatformManager';
import { LocalizationManager } from '../managers/LocalizationManager';

export class GameBootstrap extends Phaser.Scene {
    constructor() {
        super({ key: 'GameBootstrap' });
    }

    create() {
        console.log('GameBootstrap: Booting...');
        
        // SDK is ready to hide loading spinner
        PlatformManager.ready();
        
        // 1. Load Save
        const saveManager = SaveManager.getInstance();
        const saveData: IGameSave = saveManager.load();

        // 2. Initialize Managers
        LocalizationManager.getInstance().init();
        StatisticsManager.getInstance().init(saveData.stats);
        AchievementManager.getInstance();
        DailyRewardManager.getInstance().init(saveData.daily);
        
        AnalyticsManager.getInstance();
        ReplayRecorder.getInstance();
        HapticsManager.getInstance();
        SettingsManager.getInstance();
        ProgressionManager.getInstance();

        // 3. Inject global state (e.g. Modifiers)
        Object.assign(Modifiers, saveData.modifiers);
        
        // 4. Process Offline Progress (Will calculate and emit RESOURCE_ADD if away)
        OfflineManager.processOfflineProgress(saveData);

        // Tell Yandex we are playing
        PlatformManager.gameplayStart();

        // 5. Start GameScene and pass save data
        console.log('GameBootstrap: Starting GameScene');
        this.scene.start('GameScene', { saveData });

        // Setup visibilitychange pause system
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                PlatformManager.gameplayStop();
                this.scene.pause('GameScene');
                this.sound.pauseAll();
            } else {
                PlatformManager.gameplayStart();
                this.scene.resume('GameScene');
                this.sound.resumeAll();
            }
        });
    }
}
