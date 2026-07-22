import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { GoldenTruckManager } from '../managers/GoldenTruckManager';
import { AdsConfig, AdsBalance } from '../config/GameBalance';
import { AdsManager } from '../managers/AdsManager';
import { AnalyticsManager } from '../managers/AnalyticsManager';
import { RewardSource } from '../interfaces/IReward';

export class GoldenTruckEventUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private truckSprite: Phaser.GameObjects.Text;
    private clickPrompt: Phaser.GameObjects.Text;
    private dialogContainer!: Phaser.GameObjects.Container;
    
    private isEventActive = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.truckSprite = this.scene.add.text(0, 0, '🚛', { fontSize: '120px' }).setOrigin(0.5);
        this.truckSprite.setInteractive({ useHandCursor: true });
        
        this.clickPrompt = this.scene.add.text(0, -80, 'TAP!', {
            font: 'bold 32px Arial',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.clickPrompt.setAlpha(0);

        const width = this.scene.cameras.main.width;
        this.container = this.scene.add.container(width + 200, 150, [this.truckSprite, this.clickPrompt]);
        this.container.setDepth(2000);
        
        this.dialogContainer = this.scene.add.container(width / 2, this.scene.cameras.main.centerY).setDepth(3000).setVisible(false);

        this.truckSprite.on('pointerdown', () => this.onTruckClicked());
        
        EventBus.on(EVENTS.GOLDEN_TRUCK_ARRIVED, this.onTruckSpawned, this);
        EventBus.on(EVENTS.GOLDEN_TRUCK_DEPARTED, this.departTruck, this);
        EventBus.on(EVENTS.REWARD_PREVIEW, this.showPreview, this);
        
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private destroy() {
        EventBus.off(EVENTS.GOLDEN_TRUCK_ARRIVED, this.onTruckSpawned, this);
        EventBus.off(EVENTS.GOLDEN_TRUCK_DEPARTED, this.departTruck, this);
        EventBus.off(EVENTS.REWARD_PREVIEW, this.showPreview, this);
    }

    private onTruckSpawned() {
        if (this.isEventActive) return;
        this.isEventActive = true;

        this.scene.cameras.main.flash(300, 255, 215, 0);

        const width = this.scene.cameras.main.width;

        this.scene.tweens.add({
            targets: this.container,
            x: width / 2,
            duration: 1000,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.clickPrompt,
                    alpha: 1,
                    yoyo: true,
                    repeat: -1,
                    duration: 500
                });
            }
        });
    }

    private onTruckClicked(): void {
        if (this.container.x > this.scene.cameras.main.width + 100) return; // already left
        
        // Stop prompt tween and hide
        this.scene.tweens.killTweensOf(this.clickPrompt);
        this.clickPrompt.setAlpha(0);

        // Particle burst
        this.scene.cameras.main.flash(500, 255, 255, 255);

        const bundle = GoldenTruckManager.getInstance().rollReward();
        if (!bundle) return;

        EventBus.emit(EVENTS.REWARD_PREVIEW, { bundle, source: RewardSource.GOLDEN_TRUCK });

        if (AdsConfig.goldenTruckDoubleLoot && AdsManager.getInstance().isAdAvailable()) {
            AnalyticsManager.getInstance().logEvent('reward_offer_shown', { source: RewardSource.GOLDEN_TRUCK });
            this.showDoubleLootDialog(bundle);
        } else {
            GoldenTruckManager.getInstance().executeGrant(bundle, 800);
        }
    }

    private departTruck(): void {
        this.isEventActive = false;
        this.scene.tweens.killTweensOf(this.container);
        this.scene.tweens.killTweensOf(this.clickPrompt);
        
        this.scene.tweens.add({
            targets: this.container,
            x: -200, // Drive off screen left
            duration: 1000,
            ease: 'Power2'
        });
    }

    private showPreview(payload: any): void {
        if (payload.source !== 1) return; // RewardSource.GOLDEN_TRUCK = 1

        const bundle = payload.bundle;
        let previewText = "REWARD!";
        let color = '#FFFFFF';

        if (bundle.metadata?.title) {
            previewText = bundle.metadata.title;
            color = bundle.metadata.rarity === 'legendary' ? '#FFD700' : '#00FFFF';
        } else if (bundle.money) {
            previewText = `+$${bundle.money.toLocaleString()}`;
            color = '#00FF00';
        }

        const text = this.scene.add.text(
            this.container.x, 
            this.container.y - 80, 
            previewText, 
            {
                font: 'bold 36px Arial',
                color: color,
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5).setDepth(2001);

        this.scene.tweens.add({
            targets: text,
            y: text.y - 100,
            alpha: { start: 1, to: 0 },
            scale: { start: 0.5, to: 1.5 },
            duration: 800,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    private showDoubleLootDialog(baseBundle: any) {
        this.dialogContainer.removeAll(true);
        this.dialogContainer.setVisible(true);

        const bg = this.scene.add.rectangle(0, 0, 320, 160, 0x223344, 0.95).setStrokeStyle(3, 0xFFD700);
        const text = this.scene.add.text(0, -40, 'Double this loot?', { font: 'bold 24px Arial', color: '#FFFFFF' }).setOrigin(0.5);

        // Claim Button
        const claimBg = this.scene.add.rectangle(-80, 30, 120, 40, 0x555555).setInteractive({ useHandCursor: true });
        const claimText = this.scene.add.text(-80, 30, 'Claim\nNormal', { font: '14px Arial', color: '#FFF', align: 'center' }).setOrigin(0.5);
        
        claimBg.on('pointerdown', () => {
            AnalyticsManager.getInstance().logEvent('reward_offer_declined', { source: RewardSource.GOLDEN_TRUCK });
            this.hideDialog();
            GoldenTruckManager.getInstance().executeGrant(baseBundle, 0);
        });

        // Double Button
        const doubleBg = this.scene.add.rectangle(80, 30, 140, 40, 0xAA6600).setInteractive({ useHandCursor: true });
        const doubleText = this.scene.add.text(80, 30, 'Double\n(Watch Ad)', { font: 'bold 14px Arial', color: '#FFF', align: 'center' }).setOrigin(0.5);

        doubleBg.on('pointerdown', () => {
            AnalyticsManager.getInstance().logEvent('reward_offer_clicked', { source: RewardSource.GOLDEN_TRUCK });
            
            const doubledBundle = {
                ...baseBundle,
                money: baseBundle.money ? baseBundle.money * AdsBalance.rewardMultiplier : undefined,
                blueprint: baseBundle.blueprint ? baseBundle.blueprint * AdsBalance.rewardMultiplier : undefined,
                score: baseBundle.score ? baseBundle.score * AdsBalance.rewardMultiplier : undefined
            };

            AdsManager.getInstance().showRewarded(
                RewardSource.GOLDEN_TRUCK,
                doubledBundle,
                () => {
                    this.hideDialog();
                    GoldenTruckManager.getInstance().executeGrant(doubledBundle, 0);
                },
                (err) => {
                    console.warn('[GoldenTruckUI] Ad failed', err);
                }
            );
        });

        this.dialogContainer.add([bg, text, claimBg, claimText, doubleBg, doubleText]);
        
        this.dialogContainer.setScale(0);
        this.scene.tweens.add({
            targets: this.dialogContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    private hideDialog() {
        this.scene.tweens.add({
            targets: this.dialogContainer,
            scale: 0,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => {
                this.dialogContainer.setVisible(false);
            }
        });
    }
}
