import Phaser from 'phaser';
import { BoxEntity } from '../entities/BoxEntity';
import { GridSystem } from './GridSystem';
import { MergePipeline } from './MergePipeline';
import { MergeValidator } from './MergeValidator';
import { HeatmapManager } from './HeatmapManager';
import { EventBus, EVENTS } from '../core/EventBus';

export class InputController {
    private scene: Phaser.Scene;
    private grid: GridSystem;
    private mergePipeline: MergePipeline;
    private originalCol: number = -1;
    private originalRow: number = -1;

    constructor(scene: Phaser.Scene, grid: GridSystem, mergePipeline: MergePipeline) {
        this.scene = scene;
        this.grid = grid;
        this.mergePipeline = mergePipeline;
        this.setupInput();
    }

    private setupInput(): void {
        this.scene.input.on('dragstart', this.onDragStart, this);
        this.scene.input.on('drag', this.onDrag, this);
        this.scene.input.on('dragend', this.onDragEnd, this);
    }

    public enableDrag(box: BoxEntity, col: number, row: number): void {
        this.scene.input.setDraggable(box);
        box.setData('col', col);
        box.setData('row', row);
    }

    private onDragStart(_pointer: Phaser.Input.Pointer, gameObject: BoxEntity): void {
        void _pointer;
        this.originalCol = gameObject.getData('col');
        this.originalRow = gameObject.getData('row');
        
        gameObject.setDepth(100);
        EventBus.emit(EVENTS.BOX_PICKED, { box: gameObject, col: this.originalCol, row: this.originalRow });
    }

    private onDrag(_pointer: Phaser.Input.Pointer, gameObject: BoxEntity, dragX: number, dragY: number): void {
        void _pointer;
        gameObject.x = dragX;
        gameObject.y = dragY;

        this.grid.clearAllHighlights();
        const hoverCoords = this.grid.getGridCoordsFromPosition(dragX, dragY);
        
        if (hoverCoords) {
            const targetBox = this.grid.getBoxAt(hoverCoords.col, hoverCoords.row);
            const isOccupied = targetBox !== null;
            const isOriginal = hoverCoords.col === this.originalCol && hoverCoords.row === this.originalRow;
            
            let isValid = false;
            if (isOriginal || !isOccupied) {
                isValid = true;
            } else {
                isValid = MergeValidator.canMerge(gameObject, targetBox);
            }
            
            this.grid.highlightCell(hoverCoords.col, hoverCoords.row, isValid);
        }
    }

    private onDragEnd(_pointer: Phaser.Input.Pointer, gameObject: BoxEntity): void {
        void _pointer;
        this.grid.clearAllHighlights();
        const endCoords = this.grid.getGridCoordsFromPosition(gameObject.x, gameObject.y);
        
        if (endCoords) {
            // Heatmap Tracking
            HeatmapManager.getInstance().trackInteraction('box_drag', endCoords.col, endCoords.row);

            const targetBox = this.grid.getBoxAt(endCoords.col, endCoords.row);
            const isOccupied = targetBox !== null;
            const isOriginal = endCoords.col === this.originalCol && endCoords.row === this.originalRow;
            
            if (isOriginal) {
                this.cancelDrop(gameObject);
            } else if (!isOccupied) {
                // Valid Empty Cell Drop
                this.grid.removeBoxAt(this.originalCol, this.originalRow);
                this.grid.placeBoxAt(endCoords.col, endCoords.row, gameObject);
                gameObject.setData('col', endCoords.col);
                gameObject.setData('row', endCoords.row);
                
                const targetPos = this.grid.getPositionFromCoords(endCoords.col, endCoords.row);
                this.tweenTo(gameObject, targetPos.x, targetPos.y, () => {
                    EventBus.emit(EVENTS.BOX_DROPPED, { box: gameObject, col: endCoords.col, row: endCoords.row });
                });
            } else {
                // Occupied - Attempt Merge
                const mergeSuccess = this.mergePipeline.attemptMerge(
                    gameObject, 
                    this.originalCol, 
                    this.originalRow, 
                    endCoords.col, 
                    endCoords.row
                );
                
                if (!mergeSuccess) {
                    this.cancelDrop(gameObject);
                }
            }
        } else {
            // Dropped completely outside grid -> Return to origin
            this.cancelDrop(gameObject);
        }
    }

    private cancelDrop(box: BoxEntity): void {
        const originalPos = this.grid.getPositionFromCoords(this.originalCol, this.originalRow);
        this.tweenTo(box, originalPos.x, originalPos.y, () => {
            EventBus.emit(EVENTS.BOX_CANCELLED, { box, col: this.originalCol, row: this.originalRow });
        });
    }

    private tweenTo(box: BoxEntity, x: number, y: number, onComplete: () => void): void {
        this.scene.tweens.add({
            targets: box,
            x: x,
            y: y,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                box.setDepth(1);
                onComplete();
            }
        });
    }
}
