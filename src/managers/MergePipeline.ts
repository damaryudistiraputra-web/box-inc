import { BoxEntity } from '../entities/BoxEntity';
import { GridSystem } from './GridSystem';
import { MergeValidator } from './MergeValidator';
import { EventBus, EVENTS } from '../core/EventBus';
import { BoxPool } from './BoxPool';
import { FeatureGate } from './FeatureGate';
import { RewardTables } from '../config/RewardTables';
import { MathUtils } from '../utils/MathUtils';
import { SaveManager } from './SaveManager';

export class MergePipeline {
    private grid: GridSystem;
    private boxPool: BoxPool;

    constructor(grid: GridSystem, boxPool: BoxPool) {
        this.grid = grid;
        this.boxPool = boxPool;
    }

    public attemptMerge(sourceBox: BoxEntity, sourceCol: number, sourceRow: number, targetCol: number, targetRow: number, comboCount: number = 1): boolean {
        EventBus.emit(EVENTS.BOX_MERGE_ATTEMPT, { sourceBox, targetCol, targetRow, comboCount });

        const targetBox = this.grid.getBoxAt(targetCol, targetRow);
        
        if (!MergeValidator.canMerge(sourceBox, targetBox)) {
            EventBus.emit(EVENTS.BOX_MERGE_REJECTED, { sourceBox, targetCol, targetRow });
            return false;
        }

        // --- Execute Merge ---
        
        // 1. Remove source box from grid and despawn it
        this.grid.removeBoxAt(sourceCol, sourceRow);
        this.boxPool.despawn(sourceBox);
        EventBus.emit(EVENTS.BOX_REMOVED, { box: sourceBox, col: sourceCol, row: sourceRow });
        
        // 2. Upgrade the target box
        if (targetBox) {
            const sourceLevel = sourceBox.getLevel();
            let isCritical = false;
            let newLevel = sourceLevel + 1;

            if (FeatureGate.isUnlocked('criticalMerge')) {
                const save = SaveManager.getInstance().load();
                const highestLevel = save.stats.highestBoxLevel;

                // Only allow critical merge if new level wouldn't exceed the highest level seen
                if (sourceLevel + 2 <= highestLevel) {
                    const rand = MathUtils.randomInt(1, 100);
                    if (rand <= RewardTables.CRITICAL_MERGE_CHANCE) {
                        isCritical = true;
                        newLevel = sourceLevel + 2;
                    }
                }
            }

            targetBox.setLevel(newLevel);
            
            EventBus.emit(EVENTS.BOX_LEVEL_UP, { box: targetBox, level: newLevel, col: targetCol, row: targetRow });
            EventBus.emit('PLAY_SOUND', 'ui_merge');
            
            // 3. Add a quick pop animation to the target box
            targetBox.scene.tweens.add({
                targets: targetBox,
                scaleX: 1.2,
                scaleY: 1.2,
                yoyo: true,
                duration: 100,
                ease: 'Sine.easeInOut'
            });

            // 4. Emit success for audio, particles, economy to pick up
            EventBus.emit(EVENTS.BOX_MERGE_SUCCESS, { 
                box: targetBox, 
                level: newLevel,
                col: targetCol, 
                row: targetRow,
                comboCount,
                isCritical
            });

            // 5. Chain Reaction Check (Combo)
            if (comboCount < 4) {
                // Wait slightly for visual satisfaction before auto-collapsing
                setTimeout(() => {
                    if (!targetBox.active) return; // might have been sold/merged by player
                    
                    const neighbors = [
                        { c: targetCol, r: targetRow - 1 }, // Top
                        { c: targetCol + 1, r: targetRow }, // Right
                        { c: targetCol, r: targetRow + 1 }, // Bottom
                        { c: targetCol - 1, r: targetRow }  // Left
                    ];

                    for (const n of neighbors) {
                        const neighborBox = this.grid.getBoxAt(n.c, n.r);
                        if (neighborBox && neighborBox.active && neighborBox.getLevel() === newLevel) {
                            // Valid chain reaction found!
                            // We merge the neighbor INTO this target box.
                            this.attemptMerge(neighborBox, n.c, n.r, targetCol, targetRow, comboCount + 1);
                            break; // Only chain with one neighbor
                        }
                    }
                }, 150);
            }
        }
        
        return true;
    }
}
