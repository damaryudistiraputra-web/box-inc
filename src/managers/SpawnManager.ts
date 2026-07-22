import { EventBus, EVENTS } from '../core/EventBus';
import { FeatureGate } from './FeatureGate';
import { RewardManager } from './RewardManager';
import { RewardSource } from '../interfaces/IReward';
import { GameBalance } from '../config/GameBalance';
import { MathUtils } from '../utils/MathUtils';
import { SaveManager } from './SaveManager';
import { GridSystem } from './GridSystem';
import { BoxPool } from './BoxPool';
import { InputController } from './InputController';

export class SpawnManager {
    private gridSystem: GridSystem;
    private boxPool: BoxPool;
    private inputController: InputController;

    constructor(gridSystem: GridSystem, boxPool: BoxPool, inputController: InputController) {
        this.gridSystem = gridSystem;
        this.boxPool = boxPool;
        this.inputController = inputController;
        
        this.setupListeners();
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.SHOP_BUY_SUCCESS, this.onShopBuySuccess, this);
    }

    private onShopBuySuccess(payload: { level: number }): void {
        const emptySlot = this.gridSystem.getFirstEmptySlot();
        
        if (emptySlot) {
            let spawnedLevel = payload.level;
            let isLucky = false;

            if (FeatureGate.isUnlocked('luckyBox')) {
                const save = SaveManager.getInstance().load();
                save.stats.luckyPityCounter = (save.stats.luckyPityCounter || 0) + 1;
                
                const rand = MathUtils.randomInt(1, 100);
                if (rand <= GameBalance.LUCKY_BOX_CHANCE || save.stats.luckyPityCounter >= GameBalance.LUCKY_PITY_THRESHOLD) {
                    isLucky = true;
                    save.stats.luckyPityCounter = 0; // Reset pity
                }
                SaveManager.getInstance().markDirty();
            }

            const box = this.boxPool.spawn(emptySlot.col, emptySlot.row, spawnedLevel);

            if (isLucky) {
                // We ask RewardManager to grant a lucky box trigger. 
                // But wait, the reward system says we should decouple this. 
                // Actually, the box is already spawned here. We can just call box.playLuckyReveal().
                // However, the design says: RewardManager -> SpawnManager.
                // If we want SpawnManager to trigger it, maybe just emit an event or apply it.
                RewardManager.getInstance().grant({
                    id: MathUtils.generateUUID(),
                    source: RewardSource.LUCKY_BOX,
                    bundle: { triggerLuckyBox: true, spawnBox: { level: spawnedLevel } },
                    timestamp: Date.now()
                }, { x: emptySlot.col, y: emptySlot.row });
                
                // Then apply the visual effect
                const save = SaveManager.getInstance().load();
                const highestBox = save.stats.highestBoxLevel;
                const gap = Math.floor(highestBox / 4) + 1;
                const minLuckyLevel = Math.max(1, highestBox - gap);
                const maxLuckyLevel = Math.max(1, highestBox - 1);
                const luckyLevel = MathUtils.randomInt(minLuckyLevel, maxLuckyLevel);
                
                box.playLuckyReveal(luckyLevel);
            }
            
            if (this.gridSystem.placeBoxAt(emptySlot.col, emptySlot.row, box)) {
                this.inputController.enableDrag(box, emptySlot.col, emptySlot.row);
                
                // Add pop-in animation
                box.setScale(0);
                box.scene.tweens.add({
                    targets: box,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 300,
                    ease: 'Back.easeOut'
                });
                
                EventBus.emit(EVENTS.BOX_CREATED, { box, col: emptySlot.col, row: emptySlot.row });
            } else {
                this.boxPool.despawn(box);
            }
        } else {
            console.warn('SpawnManager tried to spawn but grid was full');
        }
    }
}
