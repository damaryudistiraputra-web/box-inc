import Phaser from 'phaser';

export class GridCell extends Phaser.GameObjects.Graphics {
    public readonly col: number;
    public readonly row: number;
    private cellSize: number;
    
    constructor(scene: Phaser.Scene, x: number, y: number, col: number, row: number, size: number) {
        super(scene, { x, y });
        this.setName('gridCell');
        this.col = col;
        this.row = row;
        this.cellSize = size;

        this.drawNormal();
        
        // Ensure interactive for hover events (120ms)
        this.setInteractive(new Phaser.Geom.Rectangle(-this.cellSize/2, -this.cellSize/2, this.cellSize, this.cellSize), Phaser.Geom.Rectangle.Contains);
        
        this.on('pointerover', this.onHover, this);
        this.on('pointerout', this.onHoverOut, this);
        
        scene.add.existing(this);
    }

    private drawNormal(): void {
        this.clear();
        // Indented premium look (Dark Slate gradient simulation)
        this.fillGradientStyle(0x0F172A, 0x0F172A, 0x1E293B, 0x1E293B, 0.6);
        this.fillRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 16);
        
        // Soft subtle border
        this.lineStyle(2, 0x334155, 0.4);
        this.strokeRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 16);
    }

    private onHover(): void {
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 120,
            ease: 'Sine.easeOut'
        });
    }

    private onHoverOut(): void {
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            duration: 120,
            ease: 'Sine.easeIn'
        });
    }

    public setHighlight(isValid: boolean): void {
        this.clear();
        const color = isValid ? 0x10B981 : 0xEF4444; // Green or Red
        
        this.fillStyle(color, 0.2);
        this.fillRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 16);
        
        this.lineStyle(3, color, 0.8);
        this.strokeRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 16);
    }

    public clearHighlight(): void {
        this.drawNormal();
    }
}
