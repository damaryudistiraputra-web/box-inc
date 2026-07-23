import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { MergeMeterManager } from '../managers/MergeMeterManager';
import { FeatureGate } from '../managers/FeatureGate';

export class MergeMeterUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private bgBar: Phaser.GameObjects.Graphics;
    private fillBar: Phaser.GameObjects.Graphics;
    private icon: Phaser.GameObjects.Text;
    
    private width = 640; // Span the screen
    private height = 24;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;

        this.bgBar = this.scene.add.graphics();
        this.fillBar = this.scene.add.graphics();

        this.drawBg();

        // Icon floats slightly above/on the left of the bar
        this.icon = this.scene.add.text(-20, 0, '🚚', { fontSize: '28px' }).setOrigin(0.5);

        this.container = this.scene.add.container(x, y, [this.bgBar, this.fillBar, this.icon]);
        
        // Hide initially if feature is locked
        this.container.setVisible(FeatureGate.isUnlocked('goldenTruck'));

        // Initialize state
        const val = MergeMeterManager.getInstance().getMeterValue();
        this.drawFill((val / 100) * this.width);

        EventBus.on('MERGE_METER_UPDATED', this.onMeterUpdated, this);
        EventBus.on('STAGE_ADVANCED', this.checkUnlock, this);
        
        this.scene.events.once('shutdown', this.destroy, this);
    }

    private drawBg() {
        this.bgBar.clear();
        this.bgBar.fillStyle(0x0F172A, 0.8);
        this.bgBar.fillRoundedRect(0, -this.height / 2, this.width, this.height, 12);
        this.bgBar.lineStyle(2, 0xF59E0B, 0.5); // Subtle orange border
        this.bgBar.strokeRoundedRect(0, -this.height / 2, this.width, this.height, 12);
    }

    private drawFill(w: number) {
        this.fillBar.clear();
        if (w > 0) {
            this.fillBar.fillGradientStyle(0xFCD34D, 0xF59E0B, 0xFCD34D, 0xF59E0B, 1);
            this.fillBar.fillRoundedRect(0, -this.height / 2, w, this.height, 12);
        }
    }
    
    private destroy() {
        EventBus.off('MERGE_METER_UPDATED', this.onMeterUpdated, this);
        EventBus.off('STAGE_ADVANCED', this.checkUnlock, this);
    }

    private checkUnlock() {
        if (FeatureGate.isUnlocked('goldenTruck')) {
            this.container.setVisible(true);
        }
    }

    private onMeterUpdated(value: number) {
        if (!this.container.visible) return;

        // Ensure currentWidth is initialized
        if (!this.fillBar.getData('currentWidth')) {
            this.fillBar.setData('currentWidth', 0);
        }

        const targetWidth = (value / 100) * this.width;
        
        this.scene.tweens.add({
            targets: this.fillBar,
            currentWidth: targetWidth,
            duration: 300,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const w = tween.getValue() as number;
                this.drawFill(w);
                
                // Move truck icon along the bar
                this.icon.setX(w - 10);
            }
        });

        // Flash icon
        this.scene.tweens.add({
            targets: this.icon,
            scaleX: 1.5,
            scaleY: 1.5,
            yoyo: true,
            duration: 150
        });
    }
}
