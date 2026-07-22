import Phaser from 'phaser';

export class FPSMonitor {
    private scene: Phaser.Scene;
    private lowFpsTimer: number = 0;
    private hasLogged: boolean = false;
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.scene.events.on('update', this.update, this);
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private update(time: number, delta: number) {
        if (this.hasLogged) return;
        
        const fps = this.scene.game.loop.actualFps;
        
        // Skip first few seconds while game stabilizes
        if (time < 5000) return;
        
        if (fps > 0 && fps < 25) {
            this.lowFpsTimer += delta;
            if (this.lowFpsTimer >= 10000) {
                this.hasLogged = true;
                
                // We use dynamic import or global event to prevent cyclic deps
                import('../managers/AnalyticsManager').then(({ AnalyticsManager }) => {
                    // @ts-ignore (private constructor in singleton)
                    const am = (AnalyticsManager as any).getInstance();
                    am.logEvent('low_fps_warning', { avg_fps: Math.round(fps) });
                });
            }
        } else {
            this.lowFpsTimer = 0;
        }
    }
    
    private destroy() {
        this.scene.events.off('update', this.update, this);
    }
}
