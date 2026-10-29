# Tutorial de integração de modelos 3D ao `Three.js`

Para carregar o modelo no `Three.js`, basta usar o `GLTFLoader` nativo da linguagem:

```js
JavaScriptimport * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 1. Instanciar o loader
const loader = new GLTFLoader();

// 2. Carregar o modelo do Sonic (.glb ou .gltf)
loader.load(
  'caminho/para/sonic.glb', // Substitua pelo caminho do seu arquivo baixado
  (gltf) => {
    const sonicMesh = gltf.scene;

    // Ajustes comuns de escala/posição dependendo do modelo baixado
    sonicMesh.scale.set(1, 1, 1); 
    sonicMesh.position.set(0, 0, 0);

    scene.add(sonicMesh);

    // Se o modelo contiver animações (ex: corrida/idle):
    /*
    const mixer = new THREE.AnimationMixer(sonicMesh);
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();
    */
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% carregado');
  },
  (error) => {
    console.error('Erro ao carregar o modelo:', error);
  }
);
```
### Dicas de Integração

**Iluminação**: Modelos GLTF costumam usar materiais PBR (`MeshStandardMaterial`). Lembre-se de adicionar uma luz ambiente (`AmbientLight`) e uma luz direcional (`DirectionalLight`) na cena.

**Otimização**: Se o arquivo for muito pesado, você pode otimizá-lo facilmente usando a ferramenta via CLI gltf-pipeline ou arrastando o arquivo no site gltf.report.