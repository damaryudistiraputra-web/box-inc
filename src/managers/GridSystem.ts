import Phaser from 'phaser';
import { GridCell } from '../entities/GridCell';
import { BoxEntity } from '../entities/BoxEntity';
import { EventBus, EVENTS } from '../core/EventBus';

export interface GridOccupancy {
    cell: GridCell;
    box: BoxEntity | null;
}

export class GridSystem {
    private scene: Phaser.Scene;
    private cols: number;
    private rows: number;
    private cellSize: number;
    private spacing: number;
    
    private grid: GridOccupancy[][] = [];
    private originX: number = 0;
    private originY: number = 0;

    constructor(scene: Phaser.Scene, cols: number, rows: number, cellSize: number, spacing: number) {
        this.scene = scene;
        this.cols = cols;
        this.rows = rows;
        this.cellSize = cellSize;
        this.spacing = spacing;
    }

    public createGrid(centerX: number, centerY: number): void {
        const totalWidth = (this.cols * this.cellSize) + ((this.cols - 1) * this.spacing);
        const totalHeight = (this.rows * this.cellSize) + ((this.rows - 1) * this.spacing);

        this.originX = centerX - (totalWidth / 2) + (this.cellSize / 2);
        this.originY = centerY - (totalHeight / 2) + (this.cellSize / 2);

        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const x = this.originX + c * (this.cellSize + this.spacing);
                const y = this.originY + r * (this.cellSize + this.spacing);
                
                const cell = new GridCell(this.scene, x, y, c, r, this.cellSize);
                this.grid[r][c] = { cell, box: null };
            }
        }
    }

    public getGridCoordsFromPosition(x: number, y: number): { col: number, row: number } | null {
        // Find nearest cell based on distance. 
        // We use a simple radius check (half cell size) to snap.
        const radius = this.cellSize / 2;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c].cell;
                const dist = Phaser.Math.Distance.Between(x, y, cell.x, cell.y);
                if (dist <= radius) {
                    return { col: c, row: r };
                }
            }
        }
        return null;
    }

    public getPositionFromCoords(col: number, row: number): { x: number, y: number } {
        if (!this.isValid(col, row)) return { x: 0, y: 0 };
        const cell = this.grid[row][col].cell;
        return { x: cell.x, y: cell.y };
    }

    public highlightCell(col: number, row: number, isValid: boolean): void {
        if (this.isValid(col, row)) {
            this.grid[row][col].cell.setHighlight(isValid);
        }
    }

    public clearAllHighlights(): void {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c].cell.clearHighlight();
            }
        }
    }

    public placeBoxAt(col: number, row: number, box: BoxEntity): boolean {
        if (!this.isValid(col, row)) return false;
        
        const slot = this.grid[row][col];
        if (slot.box !== null) return false;

        slot.box = box;
        box.setPosition(slot.cell.x, slot.cell.y);
        
        this.checkOccupancy();
        return true;
    }

    public removeBoxAt(col: number, row: number): BoxEntity | null {
        if (!this.isValid(col, row)) return null;
        
        const slot = this.grid[row][col];
        const box = slot.box;
        slot.box = null;
        
        this.checkOccupancy();
        return box;
    }
    
    public getBoxAt(col: number, row: number): BoxEntity | null {
        if (!this.isValid(col, row)) return null;
        return this.grid[row][col].box;
    }

    public getFirstEmptySlot(): { col: number, row: number } | null {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].box === null) {
                    return { col: c, row: r };
                }
            }
        }
        return null;
    }

    public checkOccupancy(): void {
        const emptySlot = this.getFirstEmptySlot();
        if (emptySlot === null) {
            EventBus.emit(EVENTS.GRID_FULL);
        } else {
            EventBus.emit(EVENTS.GRID_AVAILABLE);
        }
    }

    private isValid(col: number, row: number): boolean {
        return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
    }
}
