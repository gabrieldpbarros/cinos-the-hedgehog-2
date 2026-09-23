export class CanvasResizer {
    constructor(canvas) {
        this.canvas = canvas;

        window.addEventListener('resize', this);
        this.widthText = document.getElementById('width');
        this.heightText = document.getElementById("height");

        this.setInitialSize();
    }

    setInitialSize() {
        this.canvas.height = window.innerHeight;
        this.canvas.width = window.innerWidth;

        // visualizacao
        this.heightText.textContent = this.canvas.height;
        this.widthText.textContent = this.canvas.width;
    }

    handleEvent(event) {
        switch (event.type) {
            case 'resize':
                this.canvas.height = window.innerHeight;
                this.canvas.width = window.innerWidth;

                // visualizacao
                this.heightText.textContent = this.canvas.height;
                this.widthText.textContent = this.canvas.width;
                break;
            default:
                break;
        }
    }
}