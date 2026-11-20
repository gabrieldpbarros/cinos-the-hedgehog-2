import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EntityModel } from "./EntityModel.js";

const WALK_LIMIT = 8;
const SPIN_REFERENCE_SPEED = 12;
const CROUCH_SCALE = 0.82;
const CROUCH_DROP = 0.16;
const CROUCH_RESPONSE = 14;

export async function createSonicModel() {
  const loader = new GLTFLoader();
  const { scene, animations } = await loader.loadAsync(
    `${import.meta.env.BASE_URL}model-imports/sonic_lost_world_sonic_model_animator_fan/scene.gltf`
  );

  return new SonicModel(scene, animations);
}

export class SonicModel extends EntityModel {
  constructor(model, animations) {
    super(model);

    // Escala o modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(1.5 / size.y);
    this.baseScaleY = model.scale.y;
    this.crouch = 0;
    this.crouchDrop = 0;

    // Recalcula a caixa já escalada e apoia os pés na base do cubo
    box.setFromObject(model);
    model.position.y = -box.min.y - 0.5;
    model.rotation.y = Math.PI / 2;
    const rightCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    model.rotation.y = -Math.PI / 2;
    const leftCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    model.rotation.y = Math.PI / 2;
    this.leftFacingOffset = rightCenter.sub(leftCenter);
    this.leftFacingOffset.y = 0;
    this.facingLeft = false;

    model.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.metalness = 0.05;
        material.roughness = 0.6;
      }
    });

    this.mixer = new THREE.AnimationMixer(model);
    this.clips = new Map(animations.map((clip) => [clip.name, clip]));
    for (const name of ['Idle', 'Walk', 'Jog', 'Spin', 'Brake']) {
      if (!this.clips.has(name)) throw new Error(`Animação do Sonic não encontrada: ${name}`);
    }
    this.spinAction = this.mixer.clipAction(this.clips.get('Spin'));
    this.spinLift = 0;
    this.activeAction = null;
  }

  update(dt, logic) {
    this.model.visible = logic.isDamageVisible?.() ?? true;
    const speedX = logic.getSpeed().x;
    const speed = Math.abs(speedX);
    if (speed > 0.01 && (speedX < 0) !== this.facingLeft) {
      this.facingLeft = speedX < 0;
      this.model.rotation.y = this.facingLeft ? -Math.PI / 2 : Math.PI / 2;
      this.model.position.addScaledVector(this.leftFacingOffset, this.facingLeft ? 1 : -1);
    }
    const crouching = logic.onGround && !logic.isSpinning() &&
      logic.currentActions.has('CROUCH');
    const name = logic.isSpinning() ? 'Spin'
      : logic.isBraking() ? 'Brake'
      : crouching && speed >= 0.01 ? 'Walk'
      : speed < 0.01 ? 'Idle'
      : speed < WALK_LIMIT ? 'Walk'
      : 'Jog';
    const nextAction = this.mixer.clipAction(this.clips.get(name));
    if (nextAction !== this.activeAction) {
      this.activeAction?.fadeOut(0.15);
      nextAction.reset().play();
      if (this.activeAction) nextAction.fadeIn(0.15);
      this.activeAction = nextAction;
    }
    if (name === 'Spin') {
      const motionSpeed = Math.hypot(speed, logic.getSpeed().y);
      nextAction.timeScale = THREE.MathUtils.clamp(motionSpeed / SPIN_REFERENCE_SPEED, 1, 2);
    } else if (name === 'Walk' || name === 'Jog') {
      nextAction.timeScale = Math.min(3.5, 0.5 + speed * 0.09);
    }
    this.mixer.update(dt);

    // O GLB não tem clipe de agachamento; o Ctrl ganha uma pose procedural curta.
    this.crouch += (Number(crouching) - this.crouch) * Math.min(1, dt * CROUCH_RESPONSE);
    this.model.scale.y = this.baseScaleY * (1 - (1 - CROUCH_SCALE) * this.crouch);
    const crouchDrop = CROUCH_DROP * this.crouch;
    this.model.position.y += this.crouchDrop - crouchDrop;
    this.crouchDrop = crouchDrop;

    // Spin desce ~0,57 unidade; antecipar a elevação evita atravessar o chão no crossfade.
    const spinWeight = this.spinAction.isRunning() ? this.spinAction.getEffectiveWeight() : 0;
    const lift = 0.67 * Math.sqrt(spinWeight);
    this.model.position.y += lift - this.spinLift;
    this.spinLift = lift;
  }
}
