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

    constructor(scene: Phaser.Scene, x: number, y: number, manager: ShipmentManager, boxPool: any) {
        this.scene = scene;
        this.manager = manager;
        this.boxPool = boxPool;

        // Panel Background
        this.bg = this.scene.add.graphics();
        this.bg.fillStyle(0x112233, 0.95);
        this.bg.fillRoundedRect(-100, -95, 200, 190, 12);
        this.bg.lineStyle(2, 0x556677, 1);
        this.bg.strokeRoundedRect(-100, -95, 200, 190, 12);

        this.titleText = this.scene.add.text(0, -75, LocalizationManager.t('shipment.title'), {
            font: 'bold 16px Arial',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.reqsText = this.scene.add.text(0, -40, '', {
            font: '14px Arial',
            color: '#CCCCCC',
            align: 'center'
        }).setOrigin(0.5);

        this.rewardText = this.scene.add.text(0, -5, '', {
            font: 'bold 14px Arial',
            color: '#44FF44'
        }).setOrigin(0.5);

        // Claim Button
        this.claimBtnBg = this.scene.add.graphics() as any; // Using graphics instead of rect
        (this.claimBtnBg as any).fillStyle(0x44AA44, 1);
        (this.claimBtnBg as any).fillRoundedRect(-50, -15, 100, 30, 8);
        
        // Add a transparent zone for clicking
        const claimZone = this.scene.add.zone(0, 0, 100, 30).setInteractive({ useHandCursor: true });
        
        this.claimBtnText = this.scene.add.text(0, 0, LocalizationManager.t('shipment.claim'), {
            font: 'bold 14px Arial',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        this.claimBtn = this.scene.add.container(0, 35, [this.claimBtnBg, claimZone, this.claimBtnText]);

        claimZone.on('pointerdown', () => this.onClaimClicked());

        // Ad Button
        this.adBtnBg = this.scene.add.graphics() as any;
        (this.adBtnBg as any).fillStyle(0xAA6600, 1);
        (this.adBtnBg as any).fillRoundedRect(-60, -15, 120, 30, 8);
        
        const adZone = this.scene.add.zone(0, 0, 120, 30).setInteractive({ useHandCursor: true });
        
        this.adBtnText = this.scene.add.text(0, 0, 'Double Reward\n(Watch Ad)', {
            font: 'bold 12px Arial',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);
        this.adBtn = this.scene.add.container(0, 75, [this.adBtnBg, adZone, this.adBtnText]);
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
    
    private destroy() {
        EventBus.off('SHIPMENT_GENERATED', this.renderShipment, this);
        EventBus.off(EVENTS.BOX_CREATED, this.checkClaimable, this);
        EventBus.off(EVENTS.BOX_LEVEL_UP, this.checkClaimable, this);
        EventBus.off(EVENTS.BOX_REMOVED, this.checkClaimable, this);
    }

    private renderShipment(shipment: ActiveShipment) {
        this.container.setVisible(true);
        this.titleText.setText(`${shipment.icon} ${shipment.tier.toUpperCase()} ${LocalizationManager.t('shipment.title')}`);
        
        let color = '#FFFFFF';
        if (shipment.tier === 'Normal') color = '#55FF55';
        if (shipment.tier === 'Hard') color = '#5555FF';
        if (shipment.tier === 'Epic') color = '#FF55FF';
        this.titleText.setColor(color);

        // Reqs text will be populated dynamically in checkClaimable
        
        this.rewardText.setText(`+$${shipment.rewardCash.toString()}`);

        // Pop in animation
        this.container.setScale(0);
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });

        this.checkClaimable();
    }

    private checkClaimable() {
        if (!this.container.visible) return;

        const shipment = this.manager.getActiveShipment();
        if (!shipment) return;

        // Need to count boxes to show progress
        const counts = new Map<number, number>();
        // Using an event to just query or we can let manager expose getCounts?
        // Let's just use the pool if passed, or we can ask the manager if it canClaim and how many it has.
        // Actually, we passed boxPool to constructor, let's save it.
        if (this.boxPool) {
            this.boxPool.getAllBoxes().forEach((box: any) => {
                if (box.active) {
                    const lvl = box.getLevel();
                    counts.set(lvl, (counts.get(lvl) || 0) + 1);
                }
            });
        }

        let reqsStr = '';
        shipment.requirements.forEach(req => {
            const hasCount = counts.get(req.level) || 0;
            const progressCount = Math.min(hasCount, req.count);
            reqsStr += `Lv${req.level}: ${progressCount} / ${req.count}\n`;
        });
        this.reqsText.setText(reqsStr.trim());

        const canClaim = this.manager.canClaim();
        if (canClaim) {
            this.claimBtnBg.clear();
            this.claimBtnBg.fillStyle(0x44AA44, 1);
            this.claimBtnBg.fillRoundedRect(-50, -15, 100, 30, 8);
            this.claimBtnText.setText(LocalizationManager.t('shipment.claim'));
            
            // Pulse animation if not already playing
            if (!this.scene.tweens.getTweensOf(this.claimBtn).length) {
                this.scene.tweens.add({
                    targets: this.claimBtn,
                    scaleX: 1.1,
                    scaleY: 1.1,
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
            this.claimBtnBg.clear();
            this.claimBtnBg.fillStyle(0x555555, 1);
            this.claimBtnBg.fillRoundedRect(-50, -15, 100, 30, 8);
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
                x: { from: -5, to: 5 },
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    this.claimBtn.setX(0);
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
            x: this.container.x + 300, // Move offscreen right
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                this.container.setVisible(false);
                // Reset position for next shipment
                this.container.setX(this.container.x - 300);
                this.container.setAlpha(1);
                this.adOfferShown = false;
            }
        });
    }
}
