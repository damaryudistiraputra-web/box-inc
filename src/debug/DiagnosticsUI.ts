import Phaser from 'phaser';
import { AnalyticsManager } from '../managers/AnalyticsManager';
import { RemoteConfigManager } from '../managers/RemoteConfigManager';
import { SaveManager } from '../managers/SaveManager';
import { EconomyManager } from '../managers/EconomyManager';
import { WatchdogManager } from '../managers/WatchdogManager';
import { RewardManager } from '../managers/RewardManager';
import { PlatformManager } from '../platform/PlatformManager';

export class DiagnosticsUI extends Phaser.GameObjects.Container {
    private textGroup: Phaser.GameObjects.Text;
    private sceneRef: Phaser.Scene;
    private isVisible: boolean = false;
    private bg: Phaser.GameObjects.Graphics;
    private copyButton: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.sceneRef = scene;

        this.bg = scene.add.graphics();
        this.bg.fillStyle(0x000000, 0.9);
        this.bg.fillRect(0, 0, 350, 450);

        this.textGroup = scene.add.text(10, 10, 'Diagnostics', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#00ff00'
        });

        this.copyButton = scene.add.text(10, 420, '[ COPY JSON ]', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#444444'
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.copyJsonToClipboard());

        this.add([this.bg, this.textGroup, this.copyButton]);
        this.setDepth(10000);
        this.setVisible(this.isVisible);
        scene.add.existing(this);

        // Bind F9
        scene.input.keyboard?.on('keydown-F9', this.toggleVisibility, this);
        scene.events.on('update', this.updateStats, this);
        scene.events.once('shutdown', this.destroy, this);
    }

    private toggleVisibility() {
        this.isVisible = !this.isVisible;
        this.setVisible(this.isVisible);
        if (this.isVisible) this.updateStats();
    }

    private getDiagnosticsData(): any {
        const loop = this.sceneRef.game.loop;
        const save = SaveManager.getInstance().load();
        const rcm = (RemoteConfigManager as any).instance;
        const am = AnalyticsManager.getInstance();
        const wm = WatchdogManager.getInstance();
        const rm = RewardManager.getInstance();
        const em = EconomyManager.getInstance();
        
        let configAgeMs = 0;
        if (rcm && typeof rcm.getLastFetchTime === 'function') {
            configAgeMs = Date.now() - rcm.getLastFetchTime();
        }

        // @ts-ignore
        const listeners = this.sceneRef.events._eventsCount || 0;

        // @ts-ignore
        const configVer = window.__configVersion || 0;
        // @ts-ignore
        const configHsh = window.__configHash || 'none';
        // @ts-ignore
        const configVar = window.__configVariant || 'A';

        return {
            build: save.gameVersion,
            economyVersion: save.economyVersion,
            configVersion: configVer,
            configHash: configHsh,
            configAgeSec: Math.floor(configAgeMs / 1000),
            variant: configVar,
            platform: PlatformManager.getDevice().type,
            language: window.navigator.language || 'en',
            stage: save.stats.prestigeCount,
            highestBox: save.stats.highestBoxLevel,
            incomeSec: em?.getIncomePerSecond().toString() || '0',
            money: save.resources.money,
            saveSlot: localStorage.getItem('boxinc_active_slot') || 'A',
            rewardQueue: rm?.getHealthStats().pendingCount || 0,
            analyticsQueue: am?.getHealthStats().queueSize || 0,
            fps: Math.round(loop.actualFps),
            listeners,
            watchdogHeartbeatAgoSec: Math.floor((Date.now() - wm.getLastHeartbeat()) / 1000)
        };
    }

    private updateStats() {
        if (!this.isVisible) return;

        const data = this.getDiagnosticsData();
        const lines = [
            '==== LIVE DIAGNOSTICS ====',
            `Build:       ${data.build}`,
            `EconVer:     ${data.economyVersion}`,
            `ConfigVer:   ${data.configVersion}`,
            `ConfigHash:  ${data.configHash}`,
            `ConfigAge:   ${data.configAgeSec}s ago`,
            `Variant:     ${data.variant}`,
            `Platform:    ${data.platform}`,
            `Language:    ${data.language}`,
            '',
            `Stage:       ${data.stage}`,
            `HighestBox:  ${data.highestBox}`,
            `Income/Sec:  ${data.incomeSec}`,
            `Money:       ${data.money}`,
            '',
            `Save Slot:   ${data.saveSlot}`,
            `RewardQueue: ${data.rewardQueue}`,
            `AnalytQueue: ${data.analyticsQueue}`,
            '',
            `FPS:         ${data.fps}`,
            `Listeners:   ${data.listeners}`,
            `Watchdog:    ${data.watchdogHeartbeatAgoSec}s ago`
        ];

        this.textGroup.setText(lines.join('\n'));
    }

    private copyJsonToClipboard() {
        const data = this.getDiagnosticsData();
        const json = JSON.stringify(data, null, 2);
        
        // Attempt to copy
        if (navigator && navigator.clipboard) {
            navigator.clipboard.writeText(json)
                .then(() => {
                    this.copyButton.setText('[ COPIED! ]');
                    setTimeout(() => this.copyButton.setText('[ COPY JSON ]'), 2000);
                })
                .catch(err => console.error('Failed to copy', err));
        } else {
            console.log('JSON Data:', json);
            this.copyButton.setText('[ CHECK CONSOLE ]');
            setTimeout(() => this.copyButton.setText('[ COPY JSON ]'), 2000);
        }
    }

    destroy(fromScene?: boolean) {
        this.sceneRef.input.keyboard?.off('keydown-F9', this.toggleVisibility, this);
        this.sceneRef.events.off('update', this.updateStats, this);
        super.destroy(fromScene);
    }
}
