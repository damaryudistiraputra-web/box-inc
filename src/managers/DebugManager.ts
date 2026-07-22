import Phaser from 'phaser';
import { EconomyManager } from './EconomyManager';
import { TimeProvider } from '../utils/TimeProvider';
import { ProfilerUI } from '../debug/ProfilerUI';

import { DiagnosticsUI } from '../debug/DiagnosticsUI';

export class DebugManager {
    private scene: Phaser.Scene;
    private overlay: HTMLDivElement | null = null;
    private isVisible: boolean = false;
    private updateInterval: any;
    private profiler: ProfilerUI | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupKeyboard();
        new DiagnosticsUI(scene, 10, 10);
    }

    private setupKeyboard(): void {
        document.addEventListener('keydown', (e) => {
            // CTRL + D
            if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                this.toggleOverlay();
            }
        });
    }

    private toggleOverlay(): void {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.createOverlay();
            this.updateInterval = setInterval(() => this.updateData(), 500);
            this.profiler = new ProfilerUI(this.scene, 10, 250);
        } else {
            this.destroyOverlay();
            clearInterval(this.updateInterval);
            if (this.profiler) {
                this.profiler.destroy();
                this.profiler = null;
            }
        }
    }

    private createOverlay(): void {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'debug-overlay';
        this.overlay.style.position = 'absolute';
        this.overlay.style.top = '10px';
        this.overlay.style.left = '10px';
        this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.overlay.style.color = '#00ff00';
        this.overlay.style.padding = '15px';
        this.overlay.style.fontFamily = 'monospace';
        this.overlay.style.fontSize = '14px';
        this.overlay.style.zIndex = '9999';
        this.overlay.style.borderRadius = '8px';
        this.overlay.style.pointerEvents = 'auto';

        const content = document.createElement('div');
        content.id = 'debug-content';
        
        const controls = document.createElement('div');
        controls.style.marginTop = '15px';
        controls.style.display = 'flex';
        controls.style.gap = '10px';

        const btnExport = document.createElement('button');
        btnExport.innerText = 'Export Save';
        btnExport.onclick = () => this.exportSave();

        const btnImport = document.createElement('button');
        btnImport.innerText = 'Import Save';
        btnImport.onclick = () => this.importSave();

        controls.appendChild(btnExport);
        controls.appendChild(btnImport);

        this.overlay.appendChild(content);
        this.overlay.appendChild(controls);
        
        document.body.appendChild(this.overlay);
        this.updateData();
    }

    private updateData(): void {
        if (!this.overlay) return;
        const content = document.getElementById('debug-content');
        if (!content) return;

        const fps = this.scene.game.loop.actualFps.toFixed(1);
        const mem = (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) + ' MB' : 'N/A';
        const moneySec = EconomyManager.getInstance().getIncomePerSecond().toString();
        const tweens = this.scene.tweens.getTweens().length;
        const tick = Math.floor(TimeProvider.now() / 1000);
        const seed = Phaser.Math.RND.state();

        content.innerHTML = `
            <strong>DEBUG PANEL</strong><br/>
            FPS: ${fps}<br/>
            Memory: ${mem}<br/>
            Tweens: ${tweens}<br/>
            Money/sec: $${moneySec}<br/>
            Tick: ${tick}<br/>
            Seed: ${seed}
        `;
    }

    private destroyOverlay(): void {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.overlay = null;
        }
    }

    private exportSave(): void {
        const data = localStorage.getItem('boxinc_save');
        if (!data) return alert('No save found');

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boxinc_save_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    private importSave(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (re) => {
                const content = re.target?.result as string;
                localStorage.setItem('boxinc_save', content);
                alert('Save imported! Reloading game...');
                window.location.reload();
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
