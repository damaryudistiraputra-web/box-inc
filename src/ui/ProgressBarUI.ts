import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { ProgressionManager } from '../managers/ProgressionManager';
import type { StageInfo } from '../config/StageConfig';

export class ProgressBarUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private bgBar: Phaser.GameObjects.Graphics;
    private fillBar: Phaser.GameObjects.Graphics;
    private stageText: Phaser.GameObjects.Text;
    private scoreText: Phaser.GameObjects.Text;

    private width: number = 300;
    private height: number = 20;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;

        this.bgBar = this.scene.add.graphics();
        this.fillBar = this.scene.add.graphics();
        
        this.stageText = this.scene.add.text(this.width / 2, -15, '', { 
            font: '16px Arial', 
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.scoreText = this.scene.add.text(this.width / 2, 10, '', { 
            font: '12px Arial', 
            color: '#ffffff'
        }).setOrigin(0.5);

        this.container = this.scene.add.container(x, y, [this.bgBar, this.fillBar, this.stageText, this.scoreText]);

        this.drawBar(0);

        EventBus.on(EVENTS.PROGRESSION_SCORE_UPDATED, this.updateProgress, this);
        EventBus.on(EVENTS.STAGE_ADVANCED, this.onStageAdvanced, this);

        // Initial render
        const pm = ProgressionManager.getInstance();
        this.updateProgress(pm.getScore());
        
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private destroy() {
        EventBus.off(EVENTS.PROGRESSION_SCORE_UPDATED, this.updateProgress, this);
        EventBus.off(EVENTS.STAGE_ADVANCED, this.onStageAdvanced, this);
    }

    private drawBar(percent: number) {
        this.bgBar.clear();
        this.bgBar.fillStyle(0x1a2a3a);
        this.bgBar.fillRoundedRect(0, 0, this.width, this.height, 10);
        this.bgBar.lineStyle(2, 0x44aaff, 1);
        this.bgBar.strokeRoundedRect(0, 0, this.width, this.height, 10);

        // We use a tween instead of redrawing instantly
        const targetWidth = Math.min(this.width * percent, this.width);
        
        // Ensure fillBar starts somewhere
        if (!this.fillBar.getData('currentWidth')) {
            this.fillBar.setData('currentWidth', 0);
        }

        this.scene.tweens.add({
            targets: this.fillBar,
            currentWidth: targetWidth,
            duration: 400,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const w = tween.getValue() as number;
                this.fillBar.clear();
                if (w > 0) {
                    this.fillBar.fillStyle(0x44aa44);
                    this.fillBar.fillRoundedRect(0, 0, w, this.height, 10);
                }
            }
        });
    }

    private updateProgress(score: number) {
        const pm = ProgressionManager.getInstance();
        const currentStage = pm.getCurrentStage();
        const nextStage = pm.getNextStage();

        this.stageText.setText(currentStage.name);

        if (nextStage) {
            const currentThreshold = currentStage.threshold;
            const nextThreshold = nextStage.threshold;
            const progress = score - currentThreshold;
            const required = nextThreshold - currentThreshold;
            const percent = progress / required;
            
            this.drawBar(percent);
            this.scoreText.setText(`${score} / ${nextThreshold}`);
        } else {
            // Max stage
            this.drawBar(1);
            this.scoreText.setText(`MAX LEVEL (${score})`);
        }
    }

    private onStageAdvanced(data: { stage: StageInfo, previousStageId: number }) {
        this.stageText.setText(data.stage.name);
        
        // Simple scale pop animation
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
}
