export class CanvasResizer {
    constructor(renderer, camera) {
        this.renderer = renderer;
        this.camera = camera;
        window.addEventListener('resize', this);
        this.widthText = document.getElementById('width');
        this.heightText = document.getElementById('height');
        this.resize();
    }

    handleEvent() {
        this.resize();
    }

    resize() {
        const canvas = this.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width === 0 || height === 0) return;

        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
}
