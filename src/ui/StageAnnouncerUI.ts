import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import type { StageInfo } from '../config/StageConfig';

export class StageAnnouncerUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private bgOverlay: Phaser.GameObjects.Rectangle;
    private titleText: Phaser.GameObjects.Text;
    private subtitleText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        this.bgOverlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        this.bgOverlay.setOrigin(0, 0);
        this.bgOverlay.setInteractive(); // Block clicks while animating

        this.titleText = this.scene.add.text(width / 2, height / 2 - 40, 'STAGE COMPLETE!', {
            font: 'bold 48px Arial',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.subtitleText = this.scene.add.text(width / 2, height / 2 + 20, '', {
            font: '32px Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.container = this.scene.add.container(0, 0, [this.bgOverlay, this.titleText, this.subtitleText]);
        this.container.setDepth(1000); // Always on top
        this.container.setVisible(false);

        EventBus.on(EVENTS.STAGE_ADVANCED, this.showAnnouncement, this);
        
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private destroy() {
        EventBus.off(EVENTS.STAGE_ADVANCED, this.showAnnouncement, this);
    }

    private showAnnouncement(data: { stage: StageInfo, previousStageId: number }) {
        this.subtitleText.setText(`${data.stage.name} Unlocked!`);
        
        this.container.setVisible(true);
        this.container.setAlpha(0);
        this.titleText.setScale(0.5);
        this.subtitleText.setScale(0.5);

        // Flash screen
        this.scene.cameras.main.flash(500, 255, 255, 255);

        // Tween in
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });

        this.scene.tweens.add({
            targets: [this.titleText, this.subtitleText],
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Wait for 1.5 seconds, then fade out
                this.scene.time.delayedCall(1500, () => {
                    this.scene.tweens.add({
                        targets: this.container,
                        alpha: 0,
                        duration: 300,
                        ease: 'Power2',
                        onComplete: () => {
                            this.container.setVisible(false);
                        }
                    });
                });
            }
        });
    }
}
