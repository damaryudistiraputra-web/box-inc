import Phaser from 'phaser';
import { BOX_CONFIG, BOX_SIZE, BOX_CORNER_RADIUS } from '../config/BoxConfig';
import type { IIncomeSource } from '../interfaces/IIncomeSource';
import { Modifiers } from '../managers/ModifierManager';
import { EventBus, EVENTS } from '../core/EventBus';

export class BoxEntity extends Phaser.GameObjects.Container implements IIncomeSource {
    private boxGraphics: Phaser.GameObjects.Graphics;
    private levelText: Phaser.GameObjects.Text;
    private emojiText: Phaser.GameObjects.Text;
    private currentLevel: number = 1;
    private boxId: string;
    
    private isRevealing: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.setName('boxEntity');
        this.boxId = 'box_' + Phaser.Math.RND.uuid();

        this.boxGraphics = scene.add.graphics();
        
        this.emojiText = scene.add.text(0, -8, '', {
            fontFamily: 'Arial',
            fontSize: '40px'
        }).setOrigin(0.5);

        this.levelText = scene.add.text(0, 24, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add([this.boxGraphics, this.emojiText, this.levelText]);
        
        // Interactive zone for drag & drop matching centered graphics
        this.setSize(BOX_SIZE, BOX_SIZE);
        const hitArea = new Phaser.Geom.Rectangle(-BOX_SIZE/2, -BOX_SIZE/2, BOX_SIZE, BOX_SIZE);
        this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        this.on('pointerdown', this.onPointerDown, this);

        // Don't drag while revealing
        this.scene.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: any, dragX: number, dragY: number) => {
            if (gameObject === this && !this.isRevealing) {
                this.x = dragX;
                this.y = dragY;
            }
        });

        scene.add.existing(this);
    }

    private onPointerDown() {
        if (this.isRevealing) {
            // Fast forward skip
            this.scene.tweens.killTweensOf(this);
            this.angle = 0;
            this.scene.cameras.main.flash(200, 255, 215, 0);
            this.setLevel(this.pendingFinalLevel);
            this.isRevealing = false;
            this.setScale(1);
            return;
        }
        // Visually bring to top during interaction without mutating display list array
        // which can interrupt Phaser's drag event propagation.
        this.setDepth(100);
    }

    private pendingFinalLevel: number = 1;

    public playLuckyReveal(finalLevel: number) {
        this.isRevealing = true;
        this.pendingFinalLevel = finalLevel;
        
        // Visual state during reveal
        this.boxGraphics.clear();
        this.boxGraphics.fillStyle(0xFFD700);
        this.boxGraphics.fillRoundedRect(-BOX_SIZE/2, -BOX_SIZE/2, BOX_SIZE, BOX_SIZE, BOX_CORNER_RADIUS);
        this.emojiText.setText('❓'); // Question mark emoji during reveal
        this.levelText.setText('???');
        
        // Jiggle animation
        this.scene.tweens.add({
            targets: this,
            angle: { from: -10, to: 10 },
            yoyo: true,
            repeat: 5,
            duration: 100,
            onComplete: () => {
                this.angle = 0;
                
                // Pop and reveal
                this.scene.cameras.main.flash(200, 255, 215, 0);
                
                this.setLevel(finalLevel);
                this.isRevealing = false;
                
                this.scene.tweens.add({
                    targets: this,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    yoyo: true,
                    duration: 150,
                    ease: 'Back.easeOut'
                });
            }
        });
    }

    public setLevel(level: number): void {
        this.currentLevel = level;
        
        // Wrap around if level exceeds defined configs
        const safeLevel = level > 10 ? 10 : level;
        const config = BOX_CONFIG[safeLevel] || BOX_CONFIG[1];
        
        this.renderBox(config.color);
        
        this.emojiText.setText(config.emoji);
        this.levelText.setText(`Lv ${level}`);
        this.levelText.setColor(config.textColor);
    }

    private renderBox(color: number): void {
        this.boxGraphics.clear();
        
        // Shadow
        this.boxGraphics.fillStyle(0x000000, 0.3);
        this.boxGraphics.fillRoundedRect(-BOX_SIZE/2 + 4, -BOX_SIZE/2 + 4, BOX_SIZE, BOX_SIZE, BOX_CORNER_RADIUS);
        
        // Main Box
        this.boxGraphics.fillStyle(color, 1);
        this.boxGraphics.fillRoundedRect(-BOX_SIZE/2, -BOX_SIZE/2, BOX_SIZE, BOX_SIZE, BOX_CORNER_RADIUS);
        
        // Highlight/Border (simulating 3D edge)
        this.boxGraphics.lineStyle(2, 0xffffff, 0.2);
        this.boxGraphics.strokeRoundedRect(-BOX_SIZE/2, -BOX_SIZE/2, BOX_SIZE, BOX_SIZE, BOX_CORNER_RADIUS);
    }

    public getLevel(): number {
        return this.currentLevel;
    }

    // Prepare for object pooling
    public spawn(x: number, y: number, level: number): void {
        this.setPosition(x, y);
        this.setLevel(level);
        this.setActive(true);
        this.setVisible(true);
    }

    public despawn(): void {
        this.setActive(false);
        this.setVisible(false);
    }

    // --- IIncomeSource Implementation ---
    public getId(): string {
        return this.boxId;
    }

    public getIncomePerSecond(): Record<string, bigint> {
        const config = BOX_CONFIG[this.currentLevel];
        if (!config) return {};
        
        let baseIncome = Number(config.baseValue) * Modifiers.incomeMultiplier;
        let isCritical = false;
        
        if (Phaser.Math.RND.frac() <= Modifiers.criticalChance) {
            baseIncome *= Modifiers.criticalMultiplier;
            isCritical = true;
        }
        
        const finalIncome = BigInt(Math.floor(baseIncome));
        
        if (isCritical) {
            // Let VisualFX know this specific box crit
            EventBus.emit(EVENTS.BOX_INCOME, { box: this, amount: finalIncome, isCritical: true });
        }
        
        return {
            'money': finalIncome
        };
    }

    public isActiveSource(): boolean {
        // Only active (spawned on grid) boxes generate income
        return this.active;
    }
}
