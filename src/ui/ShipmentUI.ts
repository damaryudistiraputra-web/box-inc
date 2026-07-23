import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import type { ActiveShipment } from '../managers/ShipmentManager';
import { ShipmentManager } from '../managers/ShipmentManager';
import { FeatureGate } from '../managers/FeatureGate';
import { LocalizationManager } from '../managers/LocalizationManager';
import { AdsConfig, AdsBalance } from '../config/GameBalance';
import { AdsManager } from '../managers/AdsManager';
import { AnalyticsManager } from '../managers/AnalyticsManager';
import { RewardSource } from '../interfaces/IReward';

export class ShipmentUI {
    private scene: Phaser.Scene;
    private manager: ShipmentManager;
    private container: Phaser.GameObjects.Container;
    private bg: Phaser.GameObjects.Graphics;
    private titleText: Phaser.GameObjects.Text;
    private reqsText: Phaser.GameObjects.Text;
    private rewardText: Phaser.GameObjects.Text;
    
    private claimBtn: Phaser.GameObjects.Container;
    private claimBtnBg: Phaser.GameObjects.Graphics;
    private claimBtnText: Phaser.GameObjects.Text;
    
    private adBtn!: Phaser.GameObjects.Container;
    private adBtnBg!: Phaser.GameObjects.Graphics;
    private adBtnText!: Phaser.GameObjects.Text;
    
    private adOfferShown: boolean = false;
    private boxPool: any;
    
    private width = 688; // 720 - 32px margins
    private height = 110;

    constructor(scene: Phaser.Scene, x: number, y: number, manager: ShipmentManager, boxPool: any) {
        this.scene = scene;
        this.manager = manager;
        this.boxPool = boxPool;

        // Panel Background (Dark Blue, Premium Card)
        this.bg = this.scene.add.graphics();
        this.bg.fillStyle(0x1E293B, 0.95);
        this.bg.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 16);
        this.bg.lineStyle(2, 0x334155, 1);
        this.bg.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 16);

        this.titleText = this.scene.add.text(-this.width / 2 + 20, -this.height / 2 + 15, LocalizationManager.t('shipment.title'), {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#F8FAFC'
        }).setOrigin(0, 0.5);

        this.reqsText = this.scene.add.text(-this.width / 2 + 20, -this.height / 2 + 45, '', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '14px',
            color: '#94A3B8'
        }).setOrigin(0, 0.5);

        this.rewardText = this.scene.add.text(-this.width / 2 + 20, -this.height / 2 + 75, '', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#10B981'
        }).setOrigin(0, 0.5);

        // Claim Button (Right aligned)
        this.claimBtnBg = this.scene.add.graphics();
        this.drawBtnBg(this.claimBtnBg, 0x555555, 140, 48); // Disabled state initially
        
        const claimZone = this.scene.add.zone(0, 0, 140, 48).setInteractive({ useHandCursor: true });
        
        this.claimBtnText = this.scene.add.text(0, 0, LocalizationManager.t('shipment.claim'), {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        this.claimBtn = this.scene.add.container(this.width / 2 - 90, 0, [this.claimBtnBg, claimZone, this.claimBtnText]);

        claimZone.on('pointerdown', () => this.onClaimClicked());

        // Ad Button (Next to claim button)
        this.adBtnBg = this.scene.add.graphics();
        this.drawBtnBg(this.adBtnBg, 0xF59E0B, 160, 48); // Orange
        
        const adZone = this.scene.add.zone(0, 0, 160, 48).setInteractive({ useHandCursor: true });
        
        this.adBtnText = this.scene.add.text(0, 0, '📺 Watch Ad (2x)', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        this.adBtn = this.scene.add.container(this.width / 2 - 250, 0, [this.adBtnBg, adZone, this.adBtnText]);
        adZone.on('pointerdown', () => this.onAdClicked());

        this.container = this.scene.add.container(x, y, [
            this.bg, this.titleText, this.reqsText, this.rewardText, this.claimBtn, this.adBtn
        ]);

        this.container.setVisible(false); // hide until unlocked and generated

        EventBus.on('SHIPMENT_GENERATED', this.renderShipment, this);
        EventBus.on(EVENTS.BOX_CREATED, this.checkClaimable, this);
        EventBus.on(EVENTS.BOX_LEVEL_UP, this.checkClaimable, this);
        EventBus.on(EVENTS.BOX_REMOVED, this.checkClaimable, this);
        
        // Initial check
        if (FeatureGate.isUnlocked('shipment')) {
            const active = this.manager.getActiveShipment();
            if (active) {
                this.renderShipment(active);
            }
        }
        
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private drawBtnBg(graphics: Phaser.GameObjects.Graphics, color: number, w: number, h: number) {
        graphics.clear();
        graphics.fillStyle(color, 1);
        graphics.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    }
    
    private destroy() {
        EventBus.off('SHIPMENT_GENERATED', this.renderShipment, this);
        EventBus.off(EVENTS.BOX_CREATED, this.checkClaimable, this);
        EventBus.off(EVENTS.BOX_LEVEL_UP, this.checkClaimable, this);
        EventBus.off(EVENTS.BOX_REMOVED, this.checkClaimable, this);
    }

    private renderShipment(shipment: ActiveShipment) {
        this.container.setVisible(true);
        this.titleText.setText(`${shipment.icon} ${shipment.tier.toUpperCase()} SHIPMENT`);
        
        let color = '#FFFFFF';
        if (shipment.tier === 'Normal') color = '#60A5FA'; // Blue 400
        if (shipment.tier === 'Hard') color = '#F43F5E'; // Rose 500
        if (shipment.tier === 'Epic') color = '#A855F7'; // Purple 500
        this.titleText.setColor(color);
        
        this.rewardText.setText(`Reward: +$${shipment.rewardCash.toString()}`);

        // Pop in animation
        this.container.setScale(0.8);
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        this.checkClaimable();
    }

    private checkClaimable() {
        if (!this.container.visible) return;

        const shipment = this.manager.getActiveShipment();
        if (!shipment) return;

        const counts = new Map<number, number>();
        if (this.boxPool) {
            this.boxPool.getAllBoxes().forEach((box: any) => {
                if (box.active) {
                    const lvl = box.getLevel();
                    counts.set(lvl, (counts.get(lvl) || 0) + 1);
                }
            });
        }

        let reqsStr = 'Requires: ';
        shipment.requirements.forEach(req => {
            const hasCount = counts.get(req.level) || 0;
            const progressCount = Math.min(hasCount, req.count);
            reqsStr += `Lv${req.level} [${progressCount}/${req.count}]   `;
        });
        this.reqsText.setText(reqsStr.trim());

        const canClaim = this.manager.canClaim();
        if (canClaim) {
            this.drawBtnBg(this.claimBtnBg, 0x10B981, 140, 48); // Green
            this.claimBtnText.setText('CLAIM');
            
            // Pulse animation if not already playing
            if (!this.scene.tweens.getTweensOf(this.claimBtn).length) {
                this.scene.tweens.add({
                    targets: this.claimBtn,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
            }

            if (AdsConfig.shipmentDoubleReward && AdsManager.getInstance().isAdAvailable()) {
                this.adBtn.setVisible(true);
                if (!this.adOfferShown) {
                    this.adOfferShown = true;
                    AnalyticsManager.getInstance().logEvent('reward_offer_shown', { source: RewardSource.SHIPMENT });
                }
            } else {
                this.adBtn.setVisible(false);
            }
        } else {
            this.drawBtnBg(this.claimBtnBg, 0x475569, 140, 48); // Slate 600
            this.claimBtnText.setText(LocalizationManager.t('shipment.not_met'));
            this.scene.tweens.killTweensOf(this.claimBtn);
            this.claimBtn.setScale(1);
            this.adBtn.setVisible(false);
        }
    }

    private onClaimClicked() {
        if (this.manager.canClaim()) {
            if (this.adBtn.visible) {
                AnalyticsManager.getInstance().logEvent('reward_offer_declined', { source: RewardSource.SHIPMENT });
            }
            this.manager.claimShipment();
            this.scene.tweens.killTweensOf(this.claimBtn);
            this.claimBtn.setScale(1);
            this.animateOut();
        } else {
            // Shake
            this.scene.tweens.add({
                targets: this.claimBtn,
                x: { from: this.claimBtn.x - 5, to: this.claimBtn.x + 5 },
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    this.claimBtn.setX(this.width / 2 - 90);
                }
            });
        }
    }

    private onAdClicked() {
        if (!this.manager.canClaim() || !this.manager.getActiveShipment()) return;
        
        AnalyticsManager.getInstance().logEvent('reward_offer_clicked', { source: RewardSource.SHIPMENT });
        
        const shipment = this.manager.getActiveShipment();
        if (!shipment) return;

        const bundle = {
            money: Number(shipment.rewardCash) * AdsBalance.rewardMultiplier,
            score: shipment.scoreVal * AdsBalance.rewardMultiplier
        };

        // Button press animation
        this.scene.tweens.add({ targets: this.adBtn, scaleX: 0.9, scaleY: 0.9, duration: 100, yoyo: true });

        AdsManager.getInstance().showRewarded(
            RewardSource.SHIPMENT,
            bundle,
            () => {
                this.manager.completeShipmentWithoutReward();
                this.scene.tweens.killTweensOf(this.claimBtn);
                this.claimBtn.setScale(1);
                this.animateOut();
            },
            (err) => {
                console.warn('[ShipmentUI] Ad failed', err);
            }
        );
    }

    private animateOut() {
        this.scene.tweens.add({
            targets: this.container,
            y: this.container.y + 50,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                this.container.setVisible(false);
                // Reset position for next shipment
                this.container.setY(this.container.y - 50);
                this.container.setAlpha(1);
                this.adOfferShown = false;
            }
        });
    }
}
