import { CanvasResizer } from './canvas/resizer.js';

const canvas = document.getElementById('canvas');

new CanvasResizer(renderer, camera);

renderer.setAnimationLoop(() => renderer.render(scene, camera));
