// Mock HTMLCanvasElement for vitest / jsdom
if (typeof window !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = () => {
        return {
            fillRect: () => {},
            clearRect: () => {},
            getImageData: (x, y, w, h) => ({ data: new Array(w * h * 4) }),
            putImageData: () => {},
            createImageData: () => ([]),
            setTransform: () => {},
            drawImage: () => {},
            save: () => {},
            fillText: () => {},
            restore: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            stroke: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            arc: () => {},
            fill: () => {},
            measureText: () => ({ width: 0 }),
            transform: () => {},
            rect: () => {},
            clip: () => {}
        } as any;
    };
}
