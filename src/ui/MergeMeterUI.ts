import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { MergeMeterManager } from '../managers/MergeMeterManager';

export class MergeMeterUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    
    private bg: Phaser.GameObjects.Graphics;
    private barBg: Phaser.GameObjects.Graphics;
    private barFill: Phaser.GameObjects.Graphics;
    private barGlow: Phaser.GameObjects.Graphics;
    private titleText: Phaser.GameObjects.Text;
    private progressText: Phaser.GameObjects.Text;
    
    private width = 640;
    private height = 36; // Taller — this is an important gameplay element

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;

        this.bg = this.scene.add.graphics();
        
        this.titleText = this.scene.add.text(0, -36, '🚚 Delivery Truck', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#F8FAFC',
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);

        this.barBg = this.scene.add.graphics();
        this.barFill = this.scene.add.graphics();
        this.barGlow = this.scene.add.graphics();
        
        this.progressText = this.scene.add.text(0, 0, '0 / 0', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);

        this.container = this.scene.add.container(x, y, [
            this.bg, this.titleText, this.barBg, this.barGlow, this.barFill, this.progressText
        ]);
        this.container.setDepth(600); // Same logistics hub layer

        this.drawLayout(0);

        EventBus.on('MERGE_METER_UPDATED', this.updateProgress, this);
        EventBus.on('MERGE_METER_FILLED', this.onFilled, this);
        EventBus.on('TRUCK_DELIVERED', this.onDelivered, this);

        // Initial fetch
        const mgr = MergeMeterManager.getInstance();
        this.updateProgress({ current: mgr.getMeterValue(), max: 100 });

        this.scene.events.once('shutdown', this.destroy, this);
    }

    private drawLayout(percent: number) {
        this.bg.clear();
        // Match Shipment UI background (Slate 800 glassmorphism)
        this.bg.fillStyle(0x1E293B, 0.9);
        this.bg.fillRoundedRect(-this.width / 2, -this.height / 2 - 16, this.width, this.height + 16, 20);
        this.bg.lineStyle(2, 0x334155, 1);
        this.bg.strokeRoundedRect(-this.width / 2, -this.height / 2 - 16, this.width, this.height + 16, 20);

        // Progress Bar Background
        this.barBg.clear();
        this.barBg.fillStyle(0x0F172A, 1);
        this.barBg.fillRoundedRect(-this.width / 2 + 16, -12, this.width - 32, 24, 12);
        this.barBg.lineStyle(2, 0x000000, 0.3);
        this.barBg.strokeRoundedRect(-this.width / 2 + 16, -12, this.width - 32, 24, 12);

        const targetW = Math.max(0, Math.min((this.width - 32) * percent, this.width - 32));
        
        // Animated fill
        if (!this.barFill.getData('currentW')) {
            this.barFill.setData('currentW', 0);
        }

        this.scene.tweens.add({
            targets: this.barFill,
            currentW: targetW,
            duration: 300,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const w = tween.getValue() as number;
                this.barFill.clear();
                this.barGlow.clear();
                if (w > 0) {
                    this.barFill.fillGradientStyle(0xF59E0B, 0xD97706, 0xF59E0B, 0xD97706, 1); // Amber premium
                    this.barFill.fillRoundedRect(-this.width / 2 + 16, -12, w, 24, 12);
                    
                    this.barGlow.fillStyle(0xF59E0B, 0.5);
                    this.barGlow.fillRoundedRect(-this.width / 2 + 16, -12, w, 24, 12);
                }
            }
        });
        // Flash title text slightly instead of icon since icon was removed
        this.scene.tweens.add({
            targets: this.titleText,
            scaleX: 1.1,
            scaleY: 1.1,
            yoyo: true,
            duration: 150
        });
    }

    private updateProgress(data: { current: number, max: number }) {
        const pct = data.max > 0 ? Math.floor((data.current / data.max) * 100) : 0;
        this.progressText.setText(`${data.current} / ${data.max}  ·  ${pct}%`);
        const p = data.max > 0 ? data.current / data.max : 0;
        this.drawLayout(p);
    }

    private onFilled() {
        this.progressText.setText('DELIVERING...');
        EventBus.emit('PLAY_SOUND', 'ui_upgrade');
        this.scene.tweens.add({
            targets: this.container,
            y: this.container.y - 10,
            yoyo: true,
            duration: 150,
            repeat: 3
        });
    }

    private onDelivered() {
        EventBus.emit('PLAY_SOUND', 'ui_claim');
        this.scene.cameras.main.flash(200, 255, 200, 100);
        this.updateProgress({ current: 0, max: 100 });
    }

    private destroy() {
        EventBus.off('MERGE_METER_UPDATED', this.updateProgress, this);
        EventBus.off('MERGE_METER_FILLED', this.onFilled, this);
        EventBus.off('TRUCK_DELIVERED', this.onDelivered, this);
    }
}
