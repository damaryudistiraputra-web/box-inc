import Phaser from 'phaser';

export class GridCell extends Phaser.GameObjects.Graphics {
    public readonly col: number;
    public readonly row: number;
    private cellSize: number;
    
    constructor(scene: Phaser.Scene, x: number, y: number, col: number, row: number, size: number) {
        super(scene, { x, y });
        this.col = col;
        this.row = row;
        this.cellSize = size;

        this.drawNormal();
        scene.add.existing(this);
    }

    private drawNormal(): void {
        this.clear();
        this.fillStyle(0x000000, 0.4);
        this.fillRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 12);
        
        this.lineStyle(2, 0xffffff, 0.1);
        this.strokeRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 12);
    }

    public setHighlight(isValid: boolean): void {
        this.clear();
        const color = isValid ? 0x00ff00 : 0xff0000;
        
        this.fillStyle(color, 0.4);
        this.fillRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 12);
        
        this.lineStyle(3, color, 0.8);
        this.strokeRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 12);
    }

    public clearHighlight(): void {
        this.drawNormal();
    }
}
