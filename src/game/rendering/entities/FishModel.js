import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EntityModel } from './EntityModel.js';

const BASE = import.meta.env?.BASE_URL ?? '/';
const MODEL_PATH = `${BASE}model-imports/chopper-sonic-generations-ripped/source/chopper.glb`;

// O peixe fica de pé no salto e precisa caber no alçapão do tabuleiro.
const MAX_HEIGHT = 1.45;
const MAX_DEPTH = 1.14;

// Dobradiça da mandíbula inferior no espaço do modelo (cabeça em +Z).
const JAW_HINGE_Y = -0.02;
const JAW_HINGE_Z = 0.12;
const JAW_OPEN_ANGLE = 0.5;
const JAW_BLEND = 0.06;
const CHOMP_PERIOD = 1.15;

let chopperLoad;

// O GLB não tem morph targets: criamos um que abre a boca girando os vértices
// da mandíbula em torno da dobradiça.
function addJawMorph(scene) {
  scene.traverse((object) => {
    const position = object.geometry?.attributes?.position;
    if (!object.isMesh || !position) return;

    const jaw = new Float32Array(position.array.length);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      let targetY = y;
      let targetZ = z;

      if (z > JAW_HINGE_Z && y < JAW_HINGE_Y) {
        // Peso suave perto da dobradiça evita uma rachadura entre mandíbula e cabeça.
        const weight = Math.min(1, Math.min(z - JAW_HINGE_Z, JAW_HINGE_Y - y) / JAW_BLEND);
        const angle = JAW_OPEN_ANGLE * weight;
        const dy = y - JAW_HINGE_Y;
        const dz = z - JAW_HINGE_Z;
        targetY = JAW_HINGE_Y + dy * Math.cos(angle) - dz * Math.sin(angle);
        targetZ = JAW_HINGE_Z + dy * Math.sin(angle) + dz * Math.cos(angle);
      }

      jaw[i * 3] = x;
      jaw[i * 3 + 1] = targetY;
      jaw[i * 3 + 2] = targetZ;
    }

    object.geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(jaw, 3)];
    object.geometry.morphTargetsRelative = false;
    object.updateMorphTargets();
  });
}

function loadChopper(url) {
  chopperLoad ??= new GLTFLoader()
    .loadAsync(url)
    .then((gltf) => {
      addJawMorph(gltf.scene);
      return gltf;
    })
    .catch((error) => {
      chopperLoad = undefined;
      throw error;
    });
  return chopperLoad;
}

export async function createFishModel(options = {}) {
  const { scene } = await loadChopper(options.url ?? MODEL_PATH);
  return new FishModel(clone(scene));
}

export class FishModel extends EntityModel {
  constructor(model) {
    // O Chopper tem a cabeça em +Z e o dorso em +Y. Inclinar o modelo
    // coloca a cabeça para cima e mantém um dos lados voltado à câmera.
    model.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
    ));

    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.setScalar(Math.min(MAX_HEIGHT / size.y, MAX_DEPTH / size.z));

    const wrapper = new THREE.Group();
    wrapper.add(model);
    super(wrapper);

    this.wrapper = wrapper;
    this.jawMeshes = [];
    model.traverse((object) => {
      if (!object.isMesh || !object.geometry?.morphAttributes?.position?.length) return;
      if (!object.morphTargetInfluences) object.updateMorphTargets();
      this.jawMeshes.push(object);
    });
    this.swimPhase = Math.random() * Math.PI * 2;
    this.jawPhase = Math.random();
  }

  // Abre devagar, segura e fecha com um estalo, como o Chopper original.
  jawOpening() {
    const t = this.jawPhase;
    if (t < 0.42) {
      const u = t / 0.42;
      return u * u * (3 - 2 * u);
    }
    if (t < 0.5) return 1;
    if (t < 0.58) {
      const u = (t - 0.5) / 0.08;
      return 1 - u * u;
    }
    return 0;
  }

  update(dt) {
    super.update(dt);
    this.swimPhase += dt * 10;
    this.jawPhase = (this.jawPhase + dt / CHOMP_PERIOD) % 1;
    // O GLB não traz animação: um leve balanceio sugere a cauda em movimento.
    this.wrapper.rotation.y = Math.sin(this.swimPhase) * 0.12;
    const open = this.jawOpening();
    for (const mesh of this.jawMeshes) {
      mesh.morphTargetInfluences[0] = open;
    }
  }

  // Geometria e materiais vêm do GLB compartilhado; só a caixa de depuração
  // é exclusiva de cada peixe e precisa ser liberada ao remover a entidade.
  dispose() {
    this.hitboxHelper?.geometry.dispose();
    this.hitboxHelper?.material.dispose();
    this.hitboxHelper = null;
  }
}
