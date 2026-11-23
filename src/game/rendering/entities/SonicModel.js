import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EntityModel } from "./EntityModel.js";
import poseClips from "./sonicPoseClips.js";

const SPIN_REFERENCE_SPEED = 12;
const FADE_TIME = 0.15;
const IDLE_SPEED = 0.01;
// Estados com um clipe só; "Locomotion" mistura Walk e Jog na troca de marcha.
const POSE_STATES = ['Idle', 'Spin', 'Brake', 'Crouch', 'LookUp'];
// Velocidade dos pés (u/s) de cada clipe tocado a 1×, medida no modelo já escalado, e o
// ritmo máximo de reprodução. Ritmo = velocidade / footSpeed mantém o pé de apoio parado
// em relação ao chão.
const GAITS = {
  Walk: { footSpeed: 5, maxRate: 4.5 },
  Jog: { footSpeed: 4.75, maxRate: 4.5 },
};
const MIN_GAIT_RATE = 0.3;
const JOG_START_SPEED = 20;

// O pelo do modelo é um azul-marinho escuro (#15248b; azul linear mediano 0,258).
// Remapeamos só os texels azuis para um azul de Sonic mais vivo (#1a52f0), mantendo o
// sombreamento da textura; pele, olhos, sapatos e luvas ficam como estão.
export const SONIC_BLUE = {
  material: 'sonic_gm_body',
  textureBlue: 0.258,
  target: new THREE.Color('#1a52f0'),
};

/** Injeta o remapeamento de azul no shader do material do corpo do Sonic. */
export function boostSonicBlue(material) {
  const target = SONIC_BLUE.target;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', /* glsl */ `
      #include <map_fragment>
      {
        vec3 base = diffuseColor.rgb;
        // "Azulidade": quanto o canal azul domina os outros dois (0 em pele, olhos e luvas).
        float blueness = smoothstep(0.3, 0.6, (base.b - max(base.r, base.g)) / max(base.b, 1e-4));
        vec3 sonicBlue = vec3(${target.r.toFixed(5)}, ${target.g.toFixed(5)}, ${target.b.toFixed(5)})
          * (base.b / ${SONIC_BLUE.textureBlue.toFixed(3)});
        diffuseColor.rgb = mix(base, sonicBlue, blueness);
      }`);
  };
  material.needsUpdate = true;
}

/** Marcha pretendida para a velocidade atual; a troca visual ocorre em updateGaits. */
export function gaitWeights(speed) {
  return speed < JOG_START_SPEED ? { Walk: 1, Jog: 0 } : { Walk: 0, Jog: 1 };
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
        if (material.name === SONIC_BLUE.material) boostSonicBlue(material);
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
    this.updateGaits(speed, dt);
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
      // Walk e Jog começam juntos e avançam na mesma fase normalizada.
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
   * Mistura as marchas durante a troca e dá a ambas a mesma frequência de passo. Cada
   * marcha "quer" o ritmo que casa seus pés com o
   * chão; a frequência comum é a média desses ritmos ponderada pelos pesos.
   */
  updateGaits(speed, dt) {
    const targetJog = gaitWeights(speed).Jog;
    const jog = THREE.MathUtils.clamp(targetJog,
      this.gaitWeights.Jog - dt / FADE_TIME,
      this.gaitWeights.Jog + dt / FADE_TIME);
    this.gaitWeights = { Walk: 1 - jog, Jog: jog };
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
