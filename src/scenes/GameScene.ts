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
        
        // --- Industrial Atmosphere Background ---
        const atmo = this.add.graphics();
        atmo.setDepth(0);
        
        // Subtle grid/blueprint lines
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        
        atmo.lineStyle(1, 0xffffff, 0.015);
        for (let gx = 0; gx < w; gx += 30) {
            atmo.beginPath();
            atmo.moveTo(gx, 0);
            atmo.lineTo(gx, h);
            atmo.strokePath();
        }
        for (let gy = 0; gy < h; gy += 30) {
            atmo.beginPath();
            atmo.moveTo(0, gy);
            atmo.lineTo(w, gy);
            atmo.strokePath();
        }
        
        // Gear silhouettes in corners (very faint)
        const gearAlpha = 0.025;
        
        // Top-left gear
        atmo.lineStyle(2, 0xffffff, gearAlpha);
        atmo.strokeCircle(60, 60, 40);
        atmo.strokeCircle(60, 60, 25);
        for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2;
            atmo.beginPath();
            atmo.moveTo(60 + Math.cos(angle) * 28, 60 + Math.sin(angle) * 28);
            atmo.lineTo(60 + Math.cos(angle) * 45, 60 + Math.sin(angle) * 45);
            atmo.strokePath();
        }
        
        // Bottom-right gear
        atmo.strokeCircle(w - 80, h - 120, 50);
        atmo.strokeCircle(w - 80, h - 120, 30);
        for (let a = 0; a < 10; a++) {
            const angle = (a / 10) * Math.PI * 2;
            atmo.beginPath();
            atmo.moveTo(w - 80 + Math.cos(angle) * 33, h - 120 + Math.sin(angle) * 33);
            atmo.lineTo(w - 80 + Math.cos(angle) * 55, h - 120 + Math.sin(angle) * 55);
            atmo.strokePath();
        }
        
        // Diagonal pipe on left side
        atmo.lineStyle(3, 0xffffff, 0.02);
        atmo.beginPath();
        atmo.moveTo(15, 200);
        atmo.lineTo(15, h - 200);
        atmo.strokePath();
        atmo.fillStyle(0xffffff, 0.02);
        atmo.fillCircle(15, 200, 5);
        atmo.fillCircle(15, h - 200, 5);
        
        // Diagonal pipe on right side
        atmo.beginPath();
        atmo.moveTo(w - 15, 250);
        atmo.lineTo(w - 15, h - 150);
        atmo.strokePath();
        atmo.fillCircle(w - 15, 250, 5);
        atmo.fillCircle(w - 15, h - 150, 5);

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
        this.economyManager = new EconomyManager(this);
        this.shopManager = ShopManager.getInstance();
        
        // --- Visual & Audio ---
        this.visualFXManager = new VisualFXManager(this);
        this.audioManager = new AudioManager(this);
        this.animationManager = new AnimationManager(this);
        new DebugManager(this);
        
        // Prestige UI (Layer 800)
        new PrestigeUI(this).createTriggerButton(); // Might need depth adjustment inside PrestigeUI
        
        // Register all pooled boxes to EconomyManager
        this.boxPool.getAllBoxes().forEach(box => {
            this.economyManager.registerSource(box);
        });

        // 2. Build Grid - Centered at 0,0 local to the container
        this.gridSystem.createGrid(0, 0);

        // --- UI Container for Grid (Visual Scaling) ---
        // Layer 100
        const gridContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY - 150);
        gridContainer.setScale(1.85); // Scale up to fill ~70% of screen
        gridContainer.setDepth(100);

        // --- Factory Floor Background ---
        // Draws conveyor lines, pipes, and industrial floor BEHIND the cells
        this.drawFactoryFloor(gridContainer);

        // Add background cells and decorations first (bottom layer)
        const snapshot = [...this.children.list];
        snapshot.forEach(child => {
            const n = child.name;
            if (n === 'gridCell' || n === 'gridCellDecor' || n === 'gridCellScan') {
                gridContainer.add(child);
            }
        });
        
        // Add boxes after so they render on top and receive pointer events
        snapshot.forEach(child => {
            if (child.name === 'boxEntity') {
                gridContainer.add(child);
            }
        });

        // Listen for new boxes being spawned (e.g. from expanding the pool)
        EventBus.on(EVENTS.BOX_CREATED, (payload: any) => {
            if (payload.box) {
                gridContainer.add(payload.box);
            }
        });

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

        // 4. Build UI (Layers 500+)
        new ResourceTrackerUI(this, 16, 48, 'money'); // Layer 500 via component
        
        // Income Boost UI (Zone 1 - Top Right)
        new IncomeBoostUI(this, this.cameras.main.width - 96, 48);

        // Progress Bar (Factory) - Tight above the grid
        new ProgressBarUI(this, this.cameras.main.centerX, 130);

        // Shipment UI - Mission first, then truck progress below
        new ShipmentUI(this, this.cameras.main.centerX, 860, this.shipmentManager, this.boxPool);

        // Merge Meter UI (Delivery Truck) - Below shipment
        new MergeMeterUI(this, this.cameras.main.centerX, 960);

        // Shop UI at the bottom (Mega Button) - Tighter to logistics
        const shop = new ShopUI(this, this.cameras.main.centerX, this.cameras.main.height - 65);
        shop.setDepth(500);
        
        // Stage Announcer (Layer 800)
        new StageAnnouncerUI(this);

        // GoldenTruckEventUI
        new GoldenTruckEventUI(this);

        // FTUE / Tutorial
        new TutorialManager(this);
        
        // Help UI (Panduan)
        const help = new HelpUI(this, 30, this.cameras.main.height - 30);
        help.setDepth(900);

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

    /**
     * Draws an industrial factory floor behind the grid.
     * Includes: base panel, conveyor belts between cells, pipe connections,
     * warning stripes, and a frame border.
     * All coordinates are relative to grid center (0,0).
     */
    private drawFactoryFloor(container: Phaser.GameObjects.Container): void {
        const cols = GRID_CONFIG.cols;
        const rows = GRID_CONFIG.rows;
        const cellSize = GRID_CONFIG.cellSize;
        const spacing = GRID_CONFIG.spacing;
        
        const totalW = cols * cellSize + (cols - 1) * spacing;
        const totalH = rows * cellSize + (rows - 1) * spacing;
        const pad = 30; // padding around the grid
        
        // Origin matches GridSystem's calculation
        const originX = -(totalW / 2) + (cellSize / 2);
        const originY = -(totalH / 2) + (cellSize / 2);

        const floor = this.add.graphics();
        
        // === 1. Factory Floor Base Panel ===
        // Slightly lighter than game background, with rounded industrial corners
        floor.fillStyle(0x1E293B, 0.6);
        floor.fillRoundedRect(-totalW/2 - pad, -totalH/2 - pad, totalW + pad*2, totalH + pad*2, 20);
        
        // Outer frame border (industrial steel)
        floor.lineStyle(3, 0x475569, 0.6);
        floor.strokeRoundedRect(-totalW/2 - pad, -totalH/2 - pad, totalW + pad*2, totalH + pad*2, 20);
        
        // Inner frame border (double-line industrial look)
        floor.lineStyle(1, 0x334155, 0.4);
        floor.strokeRoundedRect(-totalW/2 - pad + 6, -totalH/2 - pad + 6, totalW + pad*2 - 12, totalH + pad*2 - 12, 16);

        // === 2. Warning stripes at top and bottom edges ===
        const stripeColor = 0xF59E0B; // Amber
        const stripeY1 = -totalH/2 - pad + 8;
        const stripeY2 = totalH/2 + pad - 14;
        const stripeW = totalW + pad*2 - 24;
        const stripeStartX = -totalW/2 - pad + 12;
        
        for (let sx = 0; sx < stripeW; sx += 16) {
            floor.fillStyle(stripeColor, 0.08);
            floor.fillRect(stripeStartX + sx, stripeY1, 8, 6);
            floor.fillRect(stripeStartX + sx + 8, stripeY2, 8, 6);
        }

        // === 3. Conveyor Belts — horizontal lines between cells ===
        const conveyorColor = 0x64748B; // Slate 500
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const x1 = originX + c * (cellSize + spacing) + cellSize/2;
                const y = originY + r * (cellSize + spacing);
                const x2 = x1 + spacing;
                
                // Belt track (two parallel lines)
                floor.lineStyle(2, conveyorColor, 0.25);
                floor.beginPath();
                floor.moveTo(x1, y - 6);
                floor.lineTo(x2, y - 6);
                floor.strokePath();
                
                floor.beginPath();
                floor.moveTo(x1, y + 6);
                floor.lineTo(x2, y + 6);
                floor.strokePath();
                
                // Chevron arrows on conveyor (pointing right →)
                const midX = (x1 + x2) / 2;
                floor.lineStyle(1.5, conveyorColor, 0.2);
                floor.beginPath();
                floor.moveTo(midX - 3, y - 4);
                floor.lineTo(midX + 2, y);
                floor.lineTo(midX - 3, y + 4);
                floor.strokePath();
            }
        }
        
        // === 4. Pipe connections — vertical lines between cells ===
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols; c++) {
                const x = originX + c * (cellSize + spacing);
                const y1 = originY + r * (cellSize + spacing) + cellSize/2;
                const y2 = y1 + spacing;
                
                // Pipe (single thicker line with caps)
                floor.lineStyle(3, conveyorColor, 0.2);
                floor.beginPath();
                floor.moveTo(x, y1);
                floor.lineTo(x, y2);
                floor.strokePath();
                
                // Pipe joint circles at ends
                floor.fillStyle(conveyorColor, 0.15);
                floor.fillCircle(x, y1, 3);
                floor.fillCircle(x, y2, 3);
            }
        }
        
        // === 5. Corner mounting bolts on the outer frame ===
        const boltColor = 0x94A3B8; // Slate 400
        const boltR = 3;
        const boltInset = 16;
        const fx1 = -totalW/2 - pad + boltInset;
        const fy1 = -totalH/2 - pad + boltInset;
        const fx2 = totalW/2 + pad - boltInset;
        const fy2 = totalH/2 + pad - boltInset;
        
        floor.fillStyle(boltColor, 0.3);
        floor.fillCircle(fx1, fy1, boltR);
        floor.fillCircle(fx2, fy1, boltR);
        floor.fillCircle(fx1, fy2, boltR);
        floor.fillCircle(fx2, fy2, boltR);
        
        // Inner ring on bolts
        floor.lineStyle(1, boltColor, 0.2);
        floor.strokeCircle(fx1, fy1, boltR + 2);
        floor.strokeCircle(fx2, fy1, boltR + 2);
        floor.strokeCircle(fx1, fy2, boltR + 2);
        floor.strokeCircle(fx2, fy2, boltR + 2);

        // === 6. "BOX INC." label at top of factory frame ===
        const label = this.add.text(0, -totalH/2 - pad + 14, 'BOX INC. FACTORY FLOOR', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#64748B',
            letterSpacing: 4
        }).setOrigin(0.5).setAlpha(0.5);

        // Add floor (first, so it's behind everything) and label
        container.add(floor);
        container.sendToBack(floor);
        container.add(label);

        // === 7. Subtle conveyor shimmer animation ===
        const shimmer = this.add.graphics();
        shimmer.fillStyle(0x60A5FA, 0.04);
        shimmer.fillRect(-totalW/2, -2, totalW, 4);
        container.add(shimmer);
        
        this.tweens.add({
            targets: shimmer,
            y: { from: -totalH/2, to: totalH/2 },
            alpha: { from: 0, to: 0.15 },
            duration: 4000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}
