import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { ProgressionManager } from '../managers/ProgressionManager';
import type { StageInfo } from '../config/StageConfig';

export class ProgressBarUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private bgBar: Phaser.GameObjects.Graphics;
    private fillBar: Phaser.GameObjects.Graphics;
    private glowBar: Phaser.GameObjects.Graphics;
    private stageText: Phaser.GameObjects.Text;
    private scoreText: Phaser.GameObjects.Text;

    private width: number = 640;
    private height: number = 46; // Thicker for premium feel

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;

        this.bgBar = this.scene.add.graphics();
        this.glowBar = this.scene.add.graphics(); // Behind fill for ambient glow
        this.fillBar = this.scene.add.graphics();
        
        this.stageText = this.scene.add.text(0, -36, '', { 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '22px', 
            fontStyle: 'bold',
            color: '#F8FAFC',
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);

        // Premium score text embedded in the bar
        this.scoreText = this.scene.add.text(0, 0, '', { 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold', 
            color: '#FFFFFF',
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);

        this.container = this.scene.add.container(x, y, [this.bgBar, this.glowBar, this.fillBar, this.stageText, this.scoreText]);
        this.container.setDepth(500);

        this.drawBar(0);

        // Ambient glow loop (2.5s)
        this.scene.tweens.add({
            targets: this.glowBar,
            alpha: { from: 0.3, to: 0.8 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

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
        this.bgBar.fillStyle(0x1E293B, 1);
        this.bgBar.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 18);
        this.bgBar.lineStyle(2, 0x0F172A, 1);
        this.bgBar.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 18);

        const targetWidth = Math.max(0, Math.min(this.width * percent, this.width));
        
        if (!this.fillBar.getData('currentWidth')) {
            this.fillBar.setData('currentWidth', 0);
        }

        this.scene.tweens.add({
            targets: this.fillBar,
            currentWidth: targetWidth,
            duration: 300,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const w = tween.getValue() as number;
                this.fillBar.clear();
                this.glowBar.clear();
                if (w > 0) {
                    this.fillBar.fillGradientStyle(0x3B82F6, 0x2563EB, 0x3B82F6, 0x2563EB, 1);
                    this.fillBar.fillRoundedRect(-this.width / 2, -this.height / 2, w, this.height, 18);
                    
                    this.glowBar.fillStyle(0x60A5FA, 0.4);
                    this.glowBar.fillRoundedRect(-this.width / 2, -this.height / 2, w, this.height, 18);
                }
            }
        });
    }

    private updateProgress(score: number) {
        const pm = ProgressionManager.getInstance();
        const currentStage = pm.getCurrentStage();
        const nextStage = pm.getNextStage();

        this.stageText.setText(`🏭 ${currentStage.name}`);

        if (nextStage) {
            const currentThreshold = currentStage.threshold;
            const nextThreshold = nextStage.threshold;
            const progress = score - currentThreshold;
            const required = nextThreshold - currentThreshold;
            const percent = Math.max(0, progress / required);
            
            this.drawBar(percent);
            const percentText = Math.floor(percent * 100);
            this.scoreText.setText(`${percentText}%  ·  ${score.toLocaleString()} / ${nextThreshold.toLocaleString()}`);
        } else {
            this.drawBar(1);
            this.scoreText.setText(`MAX LEVEL  ·  ${score.toLocaleString()}`);
        }
    }

    private onStageAdvanced(data: { stage: StageInfo, previousStageId: number }) {
        this.stageText.setText(`🏭 ${data.stage.name}`);
        EventBus.emit('PLAY_SOUND', 'ui_upgrade');
        
        // Satisfying pop animation when stage advances
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 250,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
}
