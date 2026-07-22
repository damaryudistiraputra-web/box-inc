import Phaser from 'phaser';
import { SaveManager } from '../managers/SaveManager';
import { RemoteConfigManager } from '../managers/RemoteConfigManager';
import { WatchdogManager } from '../managers/WatchdogManager';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Load any absolute minimal assets for the loading screen here (e.g., logo)
    }

    async create() {
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Booting...', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Load Save Data first
        SaveManager.getInstance().load();
        
        // Fetch remote config
        await RemoteConfigManager.getInstance().initialize();
        
        // Start Watchdog
        WatchdogManager.getInstance();

        // Move to preload
        this.scene.start('PreloadScene');
    }
}
