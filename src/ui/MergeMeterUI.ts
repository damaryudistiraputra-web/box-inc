import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { MergeMeterManager } from '../managers/MergeMeterManager';
import { FeatureGate } from '../managers/FeatureGate';

export class MergeMeterUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private bgBar: Phaser.GameObjects.Rectangle;
    private fillBar: Phaser.GameObjects.Rectangle;
    private icon: Phaser.GameObjects.Text;
    
    private width = 200;
    private height = 15;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;

        this.bgBar = this.scene.add.rectangle(0, 0, this.width, this.height, 0x222222, 1)
            .setOrigin(0, 0.5)
            .setStrokeStyle(2, 0xFFD700);
            
        this.fillBar = this.scene.add.rectangle(0, 0, 0, this.height, 0xFFD700, 1)
            .setOrigin(0, 0.5);

        this.icon = this.scene.add.text(-25, 0, '🚚', { fontSize: '20px' }).setOrigin(0.5);

        this.container = this.scene.add.container(x, y, [this.bgBar, this.fillBar, this.icon]);
        
        // Hide initially if feature is locked
        this.container.setVisible(FeatureGate.isUnlocked('goldenTruck'));

        // Initialize state
        const val = MergeMeterManager.getInstance().getMeterValue();
        this.fillBar.width = (val / 100) * this.width;

        EventBus.on('MERGE_METER_UPDATED', this.onMeterUpdated, this);
        EventBus.on('STAGE_ADVANCED', this.checkUnlock, this);
        
        this.scene.events.once('shutdown', this.destroy, this);
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

        // Tween the fill
        const targetWidth = (value / 100) * this.width;
        
        this.scene.tweens.add({
            targets: this.fillBar,
            width: targetWidth,
            duration: 300,
            ease: 'Cubic.easeOut'
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
