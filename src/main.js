import { CanvasResizer } from './canvas/resizer.js'

const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) throw new Error("WebGL2 não é suportado.");

const canvasResizer = new CanvasResizer(canvas);