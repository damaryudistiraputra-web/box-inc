import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';

export class ResourceTrackerUI extends Phaser.GameObjects.Container {
    private resourceId: string;
    private balanceText: Phaser.GameObjects.Text;
    private iconText: Phaser.GameObjects.Text;
    private bg: Phaser.GameObjects.Graphics;
    
    private currentVisualAmount: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, resourceId: string) {
        super(scene, x, y);
        this.resourceId = resourceId;
        this.setDepth(500); // UI Layer

        // Premium Dark Glassmorphism Background
        this.bg = scene.add.graphics();
        this.drawBg(200); // Initial width

        this.iconText = scene.add.text(16, 0, '💵', {
            fontSize: '24px'
        }).setOrigin(0, 0.5);

        this.balanceText = scene.add.text(50, 0, '0', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#10B981', // Vibrant Green
            stroke: '#059669',
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0, 0.5);

        this.add([this.bg, this.iconText, this.balanceText]);
        scene.add.existing(this);

        this.setupListeners();
    }

    private drawBg(width: number) {
        this.bg.clear();
        this.bg.fillStyle(0x1E293B, 0.85); // Slate 800 with opacity
        this.bg.fillRoundedRect(0, -24, width, 48, 24);
        this.bg.lineStyle(2, 0x334155, 1); // Slate 700 border
        this.bg.strokeRoundedRect(0, -24, width, 48, 24);
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.RESOURCE_CHANGED, this.onResourceChanged, this);
        this.on('destroy', () => {
            EventBus.off(EVENTS.RESOURCE_CHANGED, this.onResourceChanged, this);
        });
    }

    private formatNumber(n: number): string {
        return n.toLocaleString('en-US');
    }

    private onResourceChanged(payload: { id: string, amount: bigint, delta: bigint }): void {
        if (payload.id === this.resourceId) {
            const targetAmount = Number(payload.amount);
            const isGain = targetAmount > this.currentVisualAmount;
            
            // Rolling number animation
            this.scene.tweens.addCounter({
                from: this.currentVisualAmount,
                to: targetAmount,
                duration: 250,
                ease: 'Cubic.easeOut',
                onUpdate: (tween) => {
                    this.currentVisualAmount = Math.floor(tween.getValue() as number);
                    this.balanceText.setText(this.formatNumber(this.currentVisualAmount));
                    
                    // Adjust background width dynamically based on text size + padding
                    const newWidth = Math.max(200, 50 + this.balanceText.width + 24);
                    this.drawBg(newWidth);
                }
            });
            
            // Green flash on income gain
            if (isGain) {
                this.scene.tweens.add({
                    targets: this.balanceText,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    yoyo: true,
                    duration: 120,
                    ease: 'Sine.easeInOut'
                });
                // Brief green glow on the bg
                this.bg.lineStyle(2, 0x10B981, 1);
                this.scene.time.delayedCall(200, () => {
                    this.bg.lineStyle(2, 0x334155, 1);
                });
            }
        }
    }
}
