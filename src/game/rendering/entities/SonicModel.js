import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EntityModel } from "./EntityModel.js";
import poseClips from "./sonicPoseClips.js";

const SPIN_REFERENCE_SPEED = 12;
const FADE_TIME = 0.15;
const IDLE_SPEED = 0.01;
// Estados com um clipe só; "Locomotion" mistura Walk, Jog e Run conforme a velocidade.
const POSE_STATES = ['Idle', 'Spin', 'Brake', 'Crouch', 'LookUp'];
// Velocidade dos pés (u/s) de cada clipe tocado a 1×, medida no modelo já escalado, e o
// ritmo máximo de reprodução. Ritmo = velocidade / footSpeed mantém o pé de apoio parado
// em relação ao chão.
const GAITS = {
  Walk: { footSpeed: 5, maxRate: 2.5 },
  Jog: { footSpeed: 4.75, maxRate: 4.5 },
  Run: { footSpeed: 3.5, maxRate: 6 },
};
const MIN_GAIT_RATE = 0.3;
const WALK_TO_JOG = [5, 9];
const JOG_TO_RUN = [13, 17];

/** Pesos de Walk, Jog e Run para uma velocidade; somam 1 e mudam suavemente. */
export function gaitWeights(speed) {
  const jog = THREE.MathUtils.smoothstep(speed, ...WALK_TO_JOG);
  const run = THREE.MathUtils.smoothstep(speed, ...JOG_TO_RUN);
  return { Walk: 1 - jog, Jog: jog * (1 - run), Run: run };
}

export async function createSonicModel() {
  const loader = new GLTFLoader();
  const { scene, animations } = await loader.loadAsync(
    `${import.meta.env.BASE_URL}model-imports/sonic_lost_world_sonic_model_animator_fan/scene.gltf`
  );

  // O GLB não tem agachar nem olhar para cima; scripts/bake-sonic-poses.js gera esses clipes.
  const poses = poseClips.map((data) => THREE.AnimationClip.parse(data));
  return new SonicModel(scene, [...animations, ...poses]);
}

export class SonicModel extends EntityModel {
  constructor(model, animations) {
    super(model);

    // Escala o modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(1.5 / size.y);

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
    this.actions = new Map();
    for (const name of [...POSE_STATES, ...Object.keys(GAITS)]) {
      if (!this.clips.has(name)) throw new Error(`Animação do Sonic não encontrada: ${name}`);
      // Todas as ações tocam sempre; os pesos (aplicados em applyWeights) decidem o que aparece.
      this.actions.set(name, this.mixer.clipAction(this.clips.get(name)).setEffectiveWeight(0).play());
    }
    this.stateWeights = new Map([...POSE_STATES, 'Locomotion'].map((state) => [state, 0]));
    this.gaitWeights = gaitWeights(0);
    this.state = null;
    this.spinAction = this.actions.get('Spin');
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
    const state = logic.isSpinning() ? 'Spin'
      : logic.isBraking() ? 'Brake'
      : logic.isCrouching() ? 'Crouch'
      : logic.isLookingUp() ? 'LookUp'
      : speed < IDLE_SPEED ? 'Idle'
      : 'Locomotion';
    if (state !== this.state) this.enterState(state);
    this.fadeStates(dt);

    const motionSpeed = Math.hypot(speed, logic.getSpeed().y);
    this.spinAction.timeScale = THREE.MathUtils.clamp(motionSpeed / SPIN_REFERENCE_SPEED, 1, 2);
    this.updateGaits(speed);
    this.applyWeights();
    this.mixer.update(dt);

    // Spin desce ~0,57 unidade; antecipar a elevação evita atravessar o chão no crossfade.
    const spinWeight = this.spinAction.isRunning() ? this.spinAction.getEffectiveWeight() : 0;
    const lift = 0.67 * Math.sqrt(spinWeight);
    this.model.position.y += lift - this.spinLift;
    this.spinLift = lift;
  }

  enterState(state) {
    const first = this.state === null;
    this.state = state;
    if (first) this.stateWeights.set(state, 1);
    if (state !== 'Locomotion') {
      this.actions.get(state).time = 0;
    } else if (this.stateWeights.get('Locomotion') === 0) {
      // Walk, Jog e Run começam juntos e avançam na mesma fase normalizada.
      for (const name of Object.keys(GAITS)) this.actions.get(name).time = 0;
    }
  }

  // Crossfade linear: o estado atual sobe e os demais descem em FADE_TIME.
  fadeStates(dt) {
    const step = dt / FADE_TIME;
    for (const [state, weight] of this.stateWeights) {
      this.stateWeights.set(state, state === this.state
        ? Math.min(1, weight + step)
        : Math.max(0, weight - step));
    }
  }

  /**
   * Mistura as marchas pela velocidade e dá a todas a mesma frequência de passo, para os
   * pés das três ficarem em sincronia. Cada marcha "quer" o ritmo que casa seus pés com o
   * chão; a frequência comum é a média desses ritmos ponderada pelos pesos.
   */
  updateGaits(speed) {
    this.gaitWeights = gaitWeights(speed);
    let stepsPerSecond = 0;
    for (const [name, gait] of Object.entries(GAITS)) {
      const rate = THREE.MathUtils.clamp(speed / gait.footSpeed, MIN_GAIT_RATE, gait.maxRate);
      stepsPerSecond += this.gaitWeights[name] * rate / this.clips.get(name).duration;
    }
    for (const name of Object.keys(GAITS)) {
      this.actions.get(name).timeScale = stepsPerSecond * this.clips.get(name).duration;
    }
  }

  // Normaliza os pesos dos estados: durante trocas rápidas a soma não pode ficar abaixo de 1,
  // senão o mixer mistura a pose de repouso (T-pose).
  applyWeights() {
    let total = 0;
    for (const weight of this.stateWeights.values()) total += weight;
    for (const state of POSE_STATES) {
      this.actions.get(state).setEffectiveWeight(this.stateWeights.get(state) / total);
    }
    const locomotion = this.stateWeights.get('Locomotion') / total;
    let dominant = 'Walk';
    for (const name of Object.keys(GAITS)) {
      this.actions.get(name).setEffectiveWeight(locomotion * this.gaitWeights[name]);
      if (this.gaitWeights[name] > this.gaitWeights[dominant]) dominant = name;
    }
    this.activeAction = this.actions.get(this.state === 'Locomotion' ? dominant : this.state);
  }
}
