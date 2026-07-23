import Phaser from 'phaser';

export class GridCell extends Phaser.GameObjects.Graphics {
    public readonly col: number;
    public readonly row: number;
    private cellSize: number;
    
    // Factory decoration layer (separate graphics so highlights don't erase them)
    private decorLayer: Phaser.GameObjects.Graphics;
    private scanLine: Phaser.GameObjects.Graphics;
    
    constructor(scene: Phaser.Scene, x: number, y: number, col: number, row: number, size: number) {
        super(scene, { x, y });
        this.setName('gridCell');
        this.col = col;
        this.row = row;
        this.cellSize = size;

        // Decoration layer sits behind this graphics object at same position
        this.decorLayer = scene.add.graphics({ x, y });
        this.decorLayer.setName('gridCellDecor');
        
        // Scan line overlay for ambient motion
        this.scanLine = scene.add.graphics({ x, y });
        this.scanLine.setName('gridCellScan');
        this.scanLine.setAlpha(0);

        this.drawNormal();
        this.drawFactoryDecor();
        this.startAmbientAnimation();
        
        // Ensure interactive for hover events (120ms)
        this.setInteractive(new Phaser.Geom.Rectangle(-this.cellSize/2, -this.cellSize/2, this.cellSize, this.cellSize), Phaser.Geom.Rectangle.Contains);
        
        this.on('pointerover', this.onHover, this);
        this.on('pointerout', this.onHoverOut, this);
        
        scene.add.existing(this);
    }

    private drawNormal(): void {
        this.clear();
        // Industrial workstation pad — lighter panel that sits ON the factory floor
        this.fillGradientStyle(0x1E293B, 0x1E293B, 0x2D3B4E, 0x2D3B4E, 0.85);
        this.fillRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 14);
        
        // Panel border — industrial seam (more visible)
        this.lineStyle(2, 0x475569, 0.5);
        this.strokeRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 14);
    }

    /**
     * Draw factory workstation details on the decoration layer.
     * These persist even when highlights are shown (since they're on a separate Graphics).
     */
    private drawFactoryDecor(): void {
        this.decorLayer.clear();
        const half = this.cellSize / 2;
        const inset = 6; // px inset from cell edge

        // --- Corner brackets (L-shaped mounting brackets) ---
        const bracketLen = 12;
        const bracketW = 2;
        const bracketColor = 0x475569; // Slate 600
        const bracketAlpha = 0.35;
        
        this.decorLayer.lineStyle(bracketW, bracketColor, bracketAlpha);
        
        // Top-left corner bracket
        this.decorLayer.beginPath();
        this.decorLayer.moveTo(-half + inset, -half + inset + bracketLen);
        this.decorLayer.lineTo(-half + inset, -half + inset);
        this.decorLayer.lineTo(-half + inset + bracketLen, -half + inset);
        this.decorLayer.strokePath();
        
        // Top-right corner bracket
        this.decorLayer.beginPath();
        this.decorLayer.moveTo(half - inset - bracketLen, -half + inset);
        this.decorLayer.lineTo(half - inset, -half + inset);
        this.decorLayer.lineTo(half - inset, -half + inset + bracketLen);
        this.decorLayer.strokePath();
        
        // Bottom-left corner bracket
        this.decorLayer.beginPath();
        this.decorLayer.moveTo(-half + inset, half - inset - bracketLen);
        this.decorLayer.lineTo(-half + inset, half - inset);
        this.decorLayer.lineTo(-half + inset + bracketLen, half - inset);
        this.decorLayer.strokePath();
        
        // Bottom-right corner bracket
        this.decorLayer.beginPath();
        this.decorLayer.moveTo(half - inset - bracketLen, half - inset);
        this.decorLayer.lineTo(half - inset, half - inset);
        this.decorLayer.lineTo(half - inset, half - inset - bracketLen);
        this.decorLayer.strokePath();

        // --- Center crosshair / alignment mark ---
        const crossLen = 8;
        this.decorLayer.lineStyle(1, 0x475569, 0.2);
        
        // Horizontal
        this.decorLayer.beginPath();
        this.decorLayer.moveTo(-crossLen, 0);
        this.decorLayer.lineTo(crossLen, 0);
        this.decorLayer.strokePath();
        
        // Vertical
        this.decorLayer.beginPath();
        this.decorLayer.moveTo(0, -crossLen);
        this.decorLayer.lineTo(0, crossLen);
        this.decorLayer.strokePath();
        
        // --- Small corner bolts (circles) ---
        const boltRadius = 2;
        const boltInset = 10;
        this.decorLayer.fillStyle(0x64748B, 0.25); // Slate 500
        
        this.decorLayer.fillCircle(-half + boltInset, -half + boltInset, boltRadius);
        this.decorLayer.fillCircle(half - boltInset, -half + boltInset, boltRadius);
        this.decorLayer.fillCircle(-half + boltInset, half - boltInset, boltRadius);
        this.decorLayer.fillCircle(half - boltInset, half - boltInset, boltRadius);
    }

    /**
     * Subtle ambient scan line animation — a faint horizontal light sweeps
     * across the cell every 3-5 seconds. Staggered per cell so they don't all sync.
     */
    private startAmbientAnimation(): void {
        const half = this.cellSize / 2;
        
        // Draw the scan line (thin horizontal gradient bar)
        this.scanLine.clear();
        this.scanLine.fillStyle(0x60A5FA, 0.08); // Very faint blue
        this.scanLine.fillRect(-half, -1, this.cellSize, 2);
        
        // Stagger delay based on grid position so cells pulse at different times
        const staggerDelay = (this.col * 800) + (this.row * 1200);
        const duration = 3000 + (this.col + this.row) * 500; // 3-5s range
        
        this.scene.time.delayedCall(staggerDelay, () => {
            this.scene.tweens.add({
                targets: this.scanLine,
                alpha: { from: 0, to: 0.6 },
                y: { from: this.y - half, to: this.y + half },
                duration: duration,
                yoyo: false,
                repeat: -1,
                repeatDelay: 1500 + Phaser.Math.Between(0, 1000),
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    // Reset x to stay aligned with cell
                    this.scanLine.x = this.x;
                },
                onRepeat: () => {
                    this.scanLine.setAlpha(0);
                    this.scanLine.y = this.y - half;
                }
            });
        });
        
        // Subtle breathing glow on the cell border (2.5s loop)
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 1, to: 0.85 },
            duration: 2500 + (this.col * 300) + (this.row * 400),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
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
        this.fillRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 14);
        
        this.lineStyle(3, color, 0.8);
        this.strokeRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 14);
    }

    public clearHighlight(): void {
        this.drawNormal();
    }
}
