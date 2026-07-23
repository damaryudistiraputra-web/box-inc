import Phaser from 'phaser';
import { BoxPool } from '../managers/BoxPool';
import { GridSystem } from '../managers/GridSystem';
import { InputController } from '../managers/InputController';
import { MergePipeline } from '../managers/MergePipeline';
import { ResourceManager } from '../managers/ResourceManager';
import { EconomyManager } from '../managers/EconomyManager';
import { ShopManager } from '../managers/ShopManager';
import { SpawnManager } from '../managers/SpawnManager';
import { VisualFXManager } from '../managers/VisualFXManager';
import { AudioManager } from '../managers/AudioManager';
import { SaveManager } from '../managers/SaveManager';
import { ResourceTrackerUI } from '../ui/ResourceTrackerUI';
import { ShopUI } from '../ui/ShopUI';
import { ProgressBarUI } from '../ui/ProgressBarUI';
import { StageAnnouncerUI } from '../ui/StageAnnouncerUI';
import { ShipmentUI } from '../ui/ShipmentUI';
import { MergeMeterUI } from '../ui/MergeMeterUI';
import { GoldenTruckEventUI } from '../ui/GoldenTruckEventUI';
import { ShipmentManager } from '../managers/ShipmentManager';
import { MergeMeterManager } from '../managers/MergeMeterManager';
import { GRID_CONFIG } from '../config/GridConfig';
import { AnimationManager } from '../managers/AnimationManager';
import { DebugManager } from '../managers/DebugManager';
import type { IGameSave } from '../interfaces/IGameSave';
import { EventBus, EVENTS } from '../core/EventBus';

import { PrestigeUI } from '../ui/PrestigeUI';
import { AnalyticsManager } from '../managers/AnalyticsManager';
import { TutorialManager } from '../managers/TutorialManager';
import { AchievementManager } from '../managers/AchievementManager';
import { RewardManager } from '../managers/RewardManager';
import { IncomeBoostUI } from '../ui/IncomeBoostUI';
import { MonetizationTests } from '../utils/MonetizationTests';
import { FPSMonitor } from '../utils/FPSMonitor';
import { HelpUI } from '../ui/HelpUI';

export class GameScene extends Phaser.Scene {
    private boxPool!: BoxPool;
    private gridSystem!: GridSystem;
    private mergePipeline!: MergePipeline;
    private inputController!: InputController;
    private economyManager!: EconomyManager;
    private shopManager!: ShopManager;
    private spawnManager!: SpawnManager;
    private visualFXManager!: VisualFXManager;
    private audioManager!: AudioManager;
    private animationManager!: AnimationManager;
    private shipmentManager!: ShipmentManager;
    
    private saveData!: IGameSave;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data: any) {
        this.saveData = data.saveData;
        EventBus.on(EVENTS.GAME_PRESTIGED, this.onPrestiged, this);
    }

    private onPrestiged(): void {
        console.log('[GameScene] Prestige triggered. Restarting scene...');
        EventBus.off(EVENTS.RESOURCE_CHANGED, this.markSaveDirty, this);
        EventBus.off(EVENTS.BOX_CREATED, this.markSaveDirty, this);
        EventBus.off(EVENTS.BOX_REMOVED, this.markSaveDirty, this);
        EventBus.off(EVENTS.BOX_LEVEL_UP, this.markSaveDirty, this);
        EventBus.off(EVENTS.REQUEST_SAVE_DATA, this.sendSaveData, this);
        EventBus.off(EVENTS.GAME_PRESTIGED, this.onPrestiged, this);
        
        this.scene.restart();
    }

    create() {
        console.log('GameScene: ready');

        // Draw a nice radial gradient background to replace the flat color
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a2a40, 0x1a2a40, 0x0a101f, 0x0a101f, 1);
        bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        
        // Add subtle grid overlay to make it less boring
        this.add.grid(
            this.cameras.main.centerX, 
            this.cameras.main.centerY, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            30, 30, 
            0x000000, 0, 
            0xffffff, 0.03
        );

        // 1. Init Dependencies
        this.boxPool = new BoxPool(this, 15);
        this.gridSystem = new GridSystem(
            this, 
            GRID_CONFIG.cols, 
            GRID_CONFIG.rows, 
            GRID_CONFIG.cellSize, 
            GRID_CONFIG.spacing
        );
        this.mergePipeline = new MergePipeline(this.gridSystem, this.boxPool);
        this.inputController = new InputController(this, this.gridSystem, this.mergePipeline);

        // --- Economy Setup ---
        // ResourceManager is already initialized in GameBootstrap
        this.economyManager = new EconomyManager(this);
        this.shopManager = ShopManager.getInstance();
        
        // --- Visual & Audio ---
        this.visualFXManager = new VisualFXManager(this);
        this.audioManager = new AudioManager(this);
        this.animationManager = new AnimationManager(this);
        new DebugManager(this);
        
        // Prestige UI
        new PrestigeUI(this).createTriggerButton();
        
        // Register all pooled boxes to EconomyManager
        this.boxPool.getAllBoxes().forEach(box => {
            this.economyManager.registerSource(box);
        });

        // 2. Build Grid
        this.gridSystem.createGrid(this.cameras.main.centerX, this.cameras.main.centerY - 50);

        // --- Spawn Manager ---
        this.spawnManager = new SpawnManager(this.gridSystem, this.boxPool, this.inputController);
        
        // --- Shipment Manager ---
        this.shipmentManager = new ShipmentManager(this.boxPool);
        
        // --- Merge Meter Manager (Init Singleton) ---
        MergeMeterManager.getInstance();

        // Init Analytics & Achievements
        AnalyticsManager.getInstance();
        AchievementManager.getInstance();

        // Register initial boxes from save data
        this.saveData.grid.boxes.forEach((boxData: any) => {
            const box = this.boxPool.spawn(0, 0, boxData.level);
            if (this.gridSystem.placeBoxAt(boxData.col, boxData.row, box)) {
                this.inputController.enableDrag(box, boxData.col, boxData.row);
            } else {
                this.boxPool.despawn(box);
            }
        });

        // 4. Build UI
        new ResourceTrackerUI(this, 20, 30, 'money', 'Money: $');
        
        // Move Progress Bar down to its own row
        new ProgressBarUI(this, this.cameras.main.centerX - 150, 75);
        
        // Income Boost UI (top right)
        new IncomeBoostUI(this, this.cameras.main.width - 90, 30);

        // Shop UI at the bottom
        new ShopUI(this, this.cameras.main.centerX, this.cameras.main.height - 80);
        
        // Stage Announcer
        new StageAnnouncerUI(this);

        // Merge Meter UI (Delivery Truck) - Moved up slightly
        new MergeMeterUI(this, this.cameras.main.centerX, this.cameras.main.height - 180);

        // Shipment UI (Side panel, moved higher to avoid truck overlap)
        new ShipmentUI(this, this.cameras.main.width - 110, this.cameras.main.height - 300, this.shipmentManager, this.boxPool);

        // GoldenTruckEventUI
        new GoldenTruckEventUI(this);

        // FTUE / Tutorial
        new TutorialManager(this);
        
        // Help UI (Panduan)
        new HelpUI(this, 30, this.cameras.main.height - 30);

        // --- Save System Hooks ---
        EventBus.on(EVENTS.RESOURCE_CHANGED, this.markSaveDirty, this);
        EventBus.on(EVENTS.BOX_CREATED, this.markSaveDirty, this);
        EventBus.on(EVENTS.BOX_REMOVED, this.markSaveDirty, this);
        EventBus.on(EVENTS.BOX_LEVEL_UP, this.markSaveDirty, this);
        
        EventBus.on(EVENTS.REQUEST_SAVE_DATA, this.sendSaveData, this);

        this.events.once('shutdown', this.cleanup, this);
        
        new FPSMonitor(this);

        // Suppress unused warnings
        void this.shopManager;
        void this.spawnManager;
        void this.visualFXManager;
        void this.audioManager;
        void this.animationManager;

        // Resume any pending rewards (crash recovery)
        RewardManager.getInstance().resumePendingRewards();
        
        // Init Analytics Timer
        AnalyticsManager.getInstance().initialize(this);

        // Register Tests
        MonetizationTests.initialize();
    }

    private cleanup(): void {
        EventBus.off(EVENTS.RESOURCE_CHANGED, this.markSaveDirty, this);
        EventBus.off(EVENTS.BOX_CREATED, this.markSaveDirty, this);
        EventBus.off(EVENTS.BOX_REMOVED, this.markSaveDirty, this);
        EventBus.off(EVENTS.BOX_LEVEL_UP, this.markSaveDirty, this);
        EventBus.off(EVENTS.REQUEST_SAVE_DATA, this.sendSaveData, this);
        
        if (this.audioManager) this.audioManager.destroy();
        if (this.economyManager) this.economyManager.destroy();
    }

    private markSaveDirty(): void {
        SaveManager.getInstance().markDirty();
    }
    
    private sendSaveData(): void {
        const gridBoxes: Array<{ col: number, row: number, level: number }> = [];
        this.boxPool.getAllBoxes().forEach(box => {
            if (box.active) {
                gridBoxes.push({ col: box.getData('col'), row: box.getData('row'), level: box.getLevel() });
            }
        });
        
        EventBus.emit(EVENTS.GAME_STATE_UPDATED, {
            resources: {
                // Read from singleton
                money: ResourceManager.getInstance().getBalance('money').toString()
            },
            grid: {
                boxes: gridBoxes
            }
        });
    }
}
