import Phaser from 'phaser';
import { PrestigeManager } from '../managers/PrestigeManager';
import { ResourceManager } from '../managers/ResourceManager';
import { GameBalance, AdsConfig, AdsBalance } from '../config/GameBalance';
import { LocalizationManager } from '../managers/LocalizationManager';
import { AdsManager } from '../managers/AdsManager';
import { AnalyticsManager } from '../managers/AnalyticsManager';
import { RewardSource } from '../interfaces/IReward';

export class PrestigeUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    
    private blueprintsGainedText!: Phaser.GameObjects.Text;
    private incomeBonusText!: Phaser.GameObjects.Text;
    
    private prestigeBtn!: Phaser.GameObjects.Rectangle;
    private prestigeBtnText!: Phaser.GameObjects.Text;
    
    private adPrestigeBtn!: Phaser.GameObjects.Rectangle;
    private adPrestigeBtnText!: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(3000);
        this.container.setVisible(false);

        this.buildUI();
    }

    private buildUI(): void {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        const bg = this.scene.add.rectangle(width/2, height/2, width, height, 0x000000, 0.9);
        bg.setInteractive(); // block clicks

        const title = this.scene.add.text(width/2, 100, LocalizationManager.t('prestige.title'), {
            font: 'bold 48px Arial',
            color: '#00FFFF',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.blueprintsGainedText = this.scene.add.text(width/2, 200, LocalizationManager.t('prestige.gain_text', 0), {
            font: 'bold 32px Arial',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        this.incomeBonusText = this.scene.add.text(width/2, 280, LocalizationManager.t('prestige.income_total', 0), {
            font: 'bold 24px Arial',
            color: '#00FF00',
            align: 'center'
        }).setOrigin(0.5);

        // Warning Text
        const warningTitle = this.scene.add.text(width/2, 380, LocalizationManager.t('prestige.reset_warn'), {
            font: 'bold 24px Arial', color: '#FF4444'
        }).setOrigin(0.5);

        const resets = this.scene.add.text(width/2, 440, LocalizationManager.t('prestige.reset_list'), {
            font: '20px Arial', color: '#FF8888', align: 'center'
        }).setOrigin(0.5);

        const safeTitle = this.scene.add.text(width/2, 540, LocalizationManager.t('prestige.safe_warn'), {
            font: 'bold 24px Arial', color: '#44FF44'
        }).setOrigin(0.5);

        const safes = this.scene.add.text(width/2, 600, LocalizationManager.t('prestige.safe_list'), {
            font: '20px Arial', color: '#88FF88', align: 'center'
        }).setOrigin(0.5);

        this.prestigeBtn = this.scene.add.rectangle(width/2, height - 100, 300, 80, 0x00FFFF, 1).setInteractive({ useHandCursor: true });
        this.prestigeBtnText = this.scene.add.text(width/2, height - 100, LocalizationManager.t('prestige.reset'), {
            font: 'bold 32px Arial', color: '#000000'
        }).setOrigin(0.5);

        this.prestigeBtn.on('pointerdown', () => {
            if (this.adPrestigeBtn.visible) {
                AnalyticsManager.getInstance().logEvent('reward_offer_declined', { source: RewardSource.PRESTIGE });
            }
            this.hide();
            PrestigeManager.getInstance().executePrestige();
        });

        this.adPrestigeBtn = this.scene.add.rectangle(width/2 + 160, height - 100, 300, 80, 0xAA6600, 1).setInteractive({ useHandCursor: true });
        this.adPrestigeBtnText = this.scene.add.text(width/2 + 160, height - 100, 'Prestige Bonus\n(Watch Ad)', {
            font: 'bold 24px Arial', color: '#FFFFFF', align: 'center'
        }).setOrigin(0.5);

        this.adPrestigeBtn.on('pointerdown', () => {
            AnalyticsManager.getInstance().logEvent('reward_offer_clicked', { source: RewardSource.PRESTIGE });
            
            const manager = PrestigeManager.getInstance();
            const baseGained = manager.calculateBlueprints();
            const bonusGained = Math.floor(baseGained * AdsBalance.prestigeBonus);
            
            AdsManager.getInstance().showRewarded(
                RewardSource.PRESTIGE,
                { blueprint: bonusGained },
                () => {
                    this.hide();
                    manager.executePrestige();
                },
                (err) => {
                    console.warn('[PrestigeUI] Ad failed', err);
                }
            );
        });

        const closeBtn = this.scene.add.text(width - 50, 50, 'X', {
            font: 'bold 40px Arial', color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => this.hide());

        this.container.add([
            bg, title, this.blueprintsGainedText, this.incomeBonusText,
            warningTitle, resets, safeTitle, safes,
            this.prestigeBtn, this.prestigeBtnText, closeBtn,
            this.adPrestigeBtn, this.adPrestigeBtnText
        ]);
    }

    public show(): void {
        const manager = PrestigeManager.getInstance();
        if (!manager.canPrestige()) {
            console.log("Cannot prestige yet. Need Stage 6 and Blueprint >= 1");
            return;
        }

        const gained = manager.calculateBlueprints();
        const currentBlueprints = Number(ResourceManager.getInstance().getBalance('blueprint'));
        const newTotal = currentBlueprints + gained;
        const totalBonus = Math.floor(newTotal * GameBalance.BLUEPRINT_INCOME_MULTIPLIER * 100);

        this.blueprintsGainedText.setText(LocalizationManager.t('prestige.gain_text', gained));
        this.incomeBonusText.setText(LocalizationManager.t('prestige.income_total', totalBonus));

        const width = this.scene.cameras.main.width;
        const bonusGained = Math.floor(gained * AdsBalance.prestigeBonus);

        if (AdsConfig.prestigeBonus && AdsManager.getInstance().isAdAvailable()) {
            this.adPrestigeBtn.setVisible(true);
            this.adPrestigeBtnText.setVisible(true);
            this.adPrestigeBtnText.setText(`Prestige +${bonusGained} BP\n(Watch Ad)`);
            
            this.prestigeBtn.setX(width/2 - 160);
            this.prestigeBtnText.setX(width/2 - 160);
            
            AnalyticsManager.getInstance().logEvent('reward_offer_shown', { source: RewardSource.PRESTIGE });
        } else {
            this.adPrestigeBtn.setVisible(false);
            this.adPrestigeBtnText.setVisible(false);
            
            this.prestigeBtn.setX(width/2);
            this.prestigeBtnText.setX(width/2);
        }

        this.container.setVisible(true);
    }

    public hide(): void {
        this.container.setVisible(false);
    }

    // This creates a small button in the main game UI that only shows when eligible
    public createTriggerButton(): void {
        const btn = this.scene.add.text(this.scene.cameras.main.width - 20, 150, LocalizationManager.t('prestige.trigger'), {
            font: 'bold 20px Arial',
            color: '#00FFFF',
            backgroundColor: '#000000',
            padding: { x: 10, y: 10 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(1500);

        btn.on('pointerdown', () => this.show());

        this.scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (PrestigeManager.getInstance().canPrestige()) {
                    btn.setVisible(true);
                } else {
                    btn.setVisible(false);
                }
            }
        });
    }
}
