import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { BoxEntity } from '../entities/BoxEntity';
import { BOX_CONFIG } from '../config/BoxConfig';

export class VisualFXManager {
    private scene: Phaser.Scene;
    
    // Aggregation
    private aggregatedIncome: bigint = 0n;
    private flushTimer: Phaser.Time.TimerEvent;
    
    // Pools
    private textPool: Phaser.GameObjects.Text[] = [];
    private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

    // Screen Shake Config based on level
    // Intensity, Duration
    private shakeConfig: Record<number, { intensity: number, duration: number }> = {
        1: { intensity: 0.003, duration: 20 },
        2: { intensity: 0.005, duration: 30 },
        3: { intensity: 0.008, duration: 40 },
        4: { intensity: 0.012, duration: 60 },
        5: { intensity: 0.020, duration: 80 }
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupListeners();
        
        this.generateParticleTexture();

        // Timer to flush aggregated income texts every 500ms
        this.flushTimer = this.scene.time.addEvent({
            delay: 500,
            callback: this.flushIncomeTexts,
            callbackScope: this,
            loop: true
        });
    }
    
    private generateParticleTexture(): void {
        if (!this.scene.textures.exists('fx_particle')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(8, 8, 8);
            graphics.generateTexture('fx_particle', 16, 16);
            graphics.destroy();
        }
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.BOX_INCOME, this.onBoxIncome, this);
        EventBus.on(EVENTS.REWARD_GRANTED, this.onRewardGranted, this);
        EventBus.on(EVENTS.REWARD_PREVIEW, this.onRewardGranted, this); // Reusing onRewardGranted for floating preview text for now
    }

    private onRewardGranted(payload: { bundle: any, source: number, originPosition?: {x: number, y: number} }): void {
        const { bundle, originPosition } = payload;
        
        // Pick a position (default center of screen if origin not provided)
        const x = originPosition ? originPosition.x : this.scene.cameras.main.width / 2;
        const y = originPosition ? originPosition.y - 100 : this.scene.cameras.main.height / 2 - 100;

        let yOffset = 0;

        if (bundle.money) {
            this.spawnFloatingText(x, y + yOffset, `+$${bundle.money.toLocaleString()}`, '#00FF00');
            yOffset -= 40;
        }

        if (bundle.score) {
            this.spawnFloatingText(x, y + yOffset, `+${bundle.score} SCORE`, '#FFD700');
            yOffset -= 40;
        }

        if (bundle.blueprint) {
            this.spawnFloatingText(x, y + yOffset, `+${bundle.blueprint} BLUEPRINT`, '#00FFFF');
            yOffset -= 40;
        }

        if (bundle.metadata?.title) {
            const color = bundle.metadata.rarity === 'legendary' ? '#FFD700' : 
                          bundle.metadata.rarity === 'epic' ? '#FF00FF' : 
                          bundle.metadata.rarity === 'rare' ? '#00FFFF' : '#FFFFFF';
            this.spawnFloatingText(x, y + yOffset, bundle.metadata.title, color);
            yOffset -= 40;
        }
    }

    public update(): void {}

    private onBoxIncome(payload: { box: BoxEntity, amount: bigint, isCritical: boolean }): void {
        this.aggregatedIncome += payload.amount;
        
        if (payload.isCritical) {
            // Play a small pop for critical
            this.scene.tweens.add({
                targets: payload.box,
                scaleX: 1.15,
                scaleY: 1.15,
                yoyo: true,
                duration: 100,
                ease: 'Quad.out'
            });
        }

        if (payload.isCritical) {
            // Flash screen
            this.scene.cameras.main.flash(200, 255, 100, 100);
            
            // Critical Text
            const critText = this.scene.add.text(payload.box.x, payload.box.y - 50, 'CRITICAL!', {
                font: 'bold 36px Arial',
                color: '#FF3333',
                stroke: '#FFFFFF',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(1500);

            this.scene.tweens.add({
                targets: critText,
                y: critText.y - 100,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => critText.destroy()
            });
        }
    }

    private flushIncomeTexts(): void {
        if (this.aggregatedIncome > 0n) {
            // Spawn from center of screen, slightly above grid
            const x = this.scene.cameras.main.centerX;
            const y = this.scene.cameras.main.centerY - 200;
            
            this.spawnFloatingText(x, y, `+$${this.aggregatedIncome.toString()}`);
            this.aggregatedIncome = 0n;
        }
    }

    private getFloatingText(): Phaser.GameObjects.Text {
        if (this.textPool.length > 0) {
            const text = this.textPool.pop()!;
            text.setActive(true).setVisible(true);
            return text;
        }
        
        const text = this.scene.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);
        
        return text;
    }

    private spawnFloatingText(x: number, y: number, textString: string, color: string = '#00ff00'): void {
        const floatText = this.getFloatingText();
        floatText.setPosition(x, y);
        floatText.setText(textString);
        floatText.setColor(color);
        floatText.setScale(0);
        floatText.setAlpha(1);

        // Tween: Scale 0 -> 1.2 -> 1 -> Up -> Fade -> Pool
        this.scene.tweens.chain({
            targets: floatText,
            tweens: [
                { scale: 1.2, duration: 150, ease: 'Back.out' },
                { scale: 1.0, duration: 100, ease: 'Quad.inOut' },
                { y: y - 80, alpha: 0, duration: 600, ease: 'Quad.in', delay: 200 }
            ],
            onComplete: () => {
                floatText.setActive(false).setVisible(false);
                this.textPool.push(floatText);
            }
        });
    }





    private getEmitter(): Phaser.GameObjects.Particles.ParticleEmitter {
        const inactive = this.emitters.find(e => !e.active);
        if (inactive) return inactive;

        const emitter = this.scene.add.particles(0, 0, 'fx_particle', {
            emitting: false,
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 300,
            blendMode: 'ADD'
        });
        emitter.setDepth(100);
        
        this.emitters.push(emitter);
        return emitter;
    }

    private onBoxLevelUp(payload: { box: BoxEntity, level: number }): void {
        // Screen Shake
        const shake = this.shakeConfig[payload.level] || { intensity: 0.025, duration: 100 };
        this.scene.cameras.main.shake(shake.duration, shake.intensity);

        // Particle Burst
        const config = BOX_CONFIG[payload.level] || BOX_CONFIG[1];
        const emitter = this.getEmitter();
        
        emitter.setPosition(payload.box.x, payload.box.y);
        emitter.setParticleTint(config.color);
        
        emitter.active = true;
        emitter.explode(15);
        
        // Let it auto-disable after lifespan
        this.scene.time.delayedCall(700, () => {
            emitter.active = false;
        });
        
        // Fire haptic event
        let hapticEvent = 'HAPTIC_LIGHT';
        if (payload.level >= 3 && payload.level <= 4) hapticEvent = 'HAPTIC_MEDIUM';
        if (payload.level >= 5) hapticEvent = 'HAPTIC_HEAVY';
        
        EventBus.emit(hapticEvent);
    }

    public destroy(): void {
        this.flushTimer.destroy();
        EventBus.off(EVENTS.BOX_INCOME, this.onBoxIncome, this);
        EventBus.off(EVENTS.BOX_LEVEL_UP, this.onBoxLevelUp, this);
    }
}
