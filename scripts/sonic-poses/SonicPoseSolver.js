import * as THREE from 'three';

// Ferramenta de desenvolvimento: monta poses estáticas nos ossos do Sonic para o
// bake-sonic-poses.js gravar como clipes. O jogo não executa este arquivo.

// Ossos usados; os nomes do GLTF terminam com um sufixo numérico (ex.: hips_98).
const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head', 'nose', 'earL', 'earR',
  'hipL', 'legL', 'footL', 'toeL', 'hipR', 'legR', 'footR', 'toeR',
  'shoulderL', 'armL', 'forearmL', 'handL', 'middle1L', 'index1L', 'pinky1L',
  'shoulderR', 'armR', 'forearmR', 'handR', 'middle1R', 'index1R', 'pinky1R',
];
const SIDES = [['L', 1], ['R', -1]];

// Distâncias em comprimentos de perna (ou de cabeça, para as mãos na cabeça) e ângulos
// em radianos; pitch positivo curva para frente.
export const POSES = {
  // Agachado: pés sob o quadril recuado, canelas inclinadas e joelhos à frente, tronco e
  // cabeça curvados e palmas nas laterais da cabeça (os braços não alcançam o topo).
  Crouch: {
    hipDrop: 0.5,
    hipBack: 0.25,
    stance: 0.3,
    footForward: -0.3,
    footSplay: 0.45,
    kneeForward: 1,
    kneeSpread: 0.4,
    pitch: { spine: 0.35, chest: 0.35, neck: 0.15, head: 0.4 },
    shrug: 0.6,
    hands: 'head',
    handForward: 0.25,
    handRadius: 1.1,
  },
  // Olhando para cima: corpo ereto, cabeça inclinada para trás e mãos na cintura.
  LookUp: {
    hipDrop: 0,
    hipBack: 0,
    stance: 0.3,
    footForward: 0,
    footSplay: 0.3,
    kneeForward: 1,
    kneeSpread: 0.3,
    pitch: { spine: 0, chest: -0.1, neck: -0.3, head: -0.6 },
    shrug: 0,
    hands: 'hips',
    handOut: 0.32,
    handUp: 0.12,
    handBack: 0.02,
  },
};

const ELBOW = { spread: 1, forward: 0.2, up: 0.3 };
// No GLB o joelho só dobra em torno do X local (Walk/Jog/Run), até cerca de 150°.
const KNEE_AXIS = new THREE.Vector3(1, 0, 0);
const KNEE_MAX_BEND = THREE.MathUtils.degToRad(150);

function worldPos(bone, target = new THREE.Vector3()) {
  return bone.getWorldPosition(target);
}

// Base ortonormal com x = a e y = b sem a componente em a.
function basis(a, b) {
  const x = a.clone().normalize();
  const y = b.clone().addScaledVector(x, -b.dot(x)).normalize();
  return new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y));
}

export class SonicPoseSolver {
  constructor(model) {
    this.model = model;
    this.bones = {};
    model.traverse((object) => {
      if (!object.isBone) return;
      const name = object.name.replace(/_\d+$/, '');
      if (BONE_NAMES.includes(name) && !this.bones[name]) this.bones[name] = object;
    });
    const missing = BONE_NAMES.filter((name) => !this.bones[name]);
    if (missing.length) throw new Error(`Ossos do Sonic não encontrados: ${missing.join(', ')}`);
  }

  /** Posa o esqueleto a partir do estado atual (primeiro quadro do Idle). */
  solve(pose) {
    const { bones } = this;
    this.pose = pose;
    this.model.updateMatrixWorld(true);
    this.up = new THREE.Vector3(0, 1, 0);
    // O modelo olha para o +Z local; o quadril do rig vem girado e não serve de referência.
    this.forward = this.model.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    this.left = new THREE.Vector3().crossVectors(this.up, this.forward);

    this.legLength = worldPos(bones.hipL).distanceTo(worldPos(bones.legL)) +
      worldPos(bones.legL).distanceTo(worldPos(bones.footL));
    // Joelhos ainda na orientação de repouso (o Idle não anima as pernas): base da dobradiça.
    const kneeRest = { L: bones.legL.quaternion.clone(), R: bones.legR.quaternion.clone() };
    const footRotations = {};
    for (const [side] of SIDES) footRotations[side] = bones[`foot${side}`].getWorldQuaternion(new THREE.Quaternion());
    const groundHeight = (worldPos(bones.footL).y + worldPos(bones.footR).y) / 2;

    // O rig já vem torcido (quadril e cabeça girados); endireita o corpo antes de curvá-lo.
    this.alignUpright(bones.hips, bones.hipL, bones.hipR, bones.hips, [bones.spine]);
    this.lowerHips();
    this.alignUpright(bones.chest, bones.shoulderL, bones.shoulderR, bones.chest, [bones.neck]);
    this.alignUpright(bones.head, bones.earL, bones.earR, bones.head, [bones.earL, bones.earR]);
    for (const [name, angle] of Object.entries(pose.pitch)) this.rotate(bones[name], this.left, angle);

    for (const [side, sign] of SIDES) {
      this.solveLeg(side, sign, groundHeight, kneeRest[side], footRotations[side]);
      this.rotate(bones[`shoulder${side}`], this.forward, sign * pose.shrug);
      const target = pose.hands === 'head' ? this.handOnHead(sign) : this.handOnHip(side, sign);
      this.solveArm(side, sign, target);
    }
    this.model.updateMatrixWorld(true);
  }

  // Aplica uma rotação em espaço de mundo ao osso: L' = P⁻¹ · R · P · L.
  rotateWorld(bone, rotation) {
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.premultiply(parent).premultiply(rotation).premultiply(parent.invert());
    bone.updateMatrixWorld(true);
  }

  rotate(bone, axis, angle) {
    this.rotateWorld(bone, new THREE.Quaternion().setFromAxisAngle(axis, angle));
  }

  // Gira o osso para levar o referencial (a, b) até (wantA, wantB).
  alignFrame(bone, a, b, wantA, wantB) {
    const matrix = basis(wantA, wantB).multiply(basis(a, b).transpose());
    this.rotateWorld(bone, new THREE.Quaternion().setFromRotationMatrix(matrix));
  }

  // A reta right→left passa a apontar para a esquerda do modelo e base→topo para cima.
  alignUpright(bone, left, right, base, tops) {
    const side = worldPos(left).sub(worldPos(right));
    const top = new THREE.Vector3();
    for (const point of tops) top.add(worldPos(point));
    const up = top.divideScalar(tops.length).sub(worldPos(base));
    this.alignFrame(bone, side, up, this.left, this.up);
  }

  lowerHips() {
    const hips = this.bones.hips;
    const target = worldPos(hips)
      .addScaledVector(this.up, -this.pose.hipDrop * this.legLength)
      .addScaledVector(this.forward, -this.pose.hipBack * this.legLength);
    hips.position.copy(hips.parent.worldToLocal(target));
    hips.updateMatrixWorld(true);
  }

  solveLeg(side, sign, groundHeight, kneeRest, footRotation) {
    const { bones, pose, legLength } = this;
    const knee = bones[`leg${side}`];
    const foot = bones[`foot${side}`];
    const target = worldPos(bones.hips).setY(groundHeight)
      .addScaledVector(this.forward, (pose.footForward + pose.hipBack) * legLength)
      .addScaledVector(this.left, sign * pose.stance * legLength);
    const kneeDirection = this.forward.clone().multiplyScalar(pose.kneeForward)
      .addScaledVector(this.left, sign * pose.kneeSpread);
    this.solveHingeLeg(bones[`hip${side}`], knee, foot, target, kneeDirection, kneeRest);

    // Pé plano (orientação do Idle), com a ponta para frente e levemente aberta.
    const parent = foot.parent.getWorldQuaternion(new THREE.Quaternion());
    foot.quaternion.copy(parent.invert().multiply(footRotation));
    foot.updateMatrixWorld(true);
    const toes = worldPos(bones[`toe${side}`]).sub(worldPos(foot)).setY(0);
    const wanted = this.forward.clone().applyAxisAngle(this.up, sign * pose.footSplay);
    this.rotateWorld(foot, new THREE.Quaternion().setFromUnitVectors(toes.normalize(), wanted));
  }

  // Lateral da cabeça já curvada, à altura das orelhas; a palma encosta por fora da malha.
  handOnHead(sign) {
    const { bones, pose } = this;
    const head = worldPos(bones.head);
    const headUp = worldPos(bones.earL).add(worldPos(bones.earR)).multiplyScalar(0.5).sub(head);
    const headSize = headUp.length();
    headUp.normalize();
    const headForward = worldPos(bones.nose).sub(head);
    headForward.addScaledVector(headUp, -headForward.dot(headUp)).normalize();
    const outward = new THREE.Vector3().crossVectors(headUp, headForward).multiplyScalar(sign)
      .addScaledVector(headForward, pose.handForward).normalize();
    return {
      position: head.addScaledVector(headUp, headSize / 2).addScaledVector(outward, pose.handRadius * headSize),
      palm: outward.clone().negate(),
      fingers: headUp.addScaledVector(outward, -headUp.dot(outward)),
    };
  }

  // Punho na cintura, por fora do quadril; dedos para baixo e para frente.
  handOnHip(side, sign) {
    const { bones, pose, legLength } = this;
    const position = worldPos(bones[`hip${side}`])
      .addScaledVector(this.left, sign * pose.handOut * legLength)
      .addScaledVector(this.up, pose.handUp * legLength)
      .addScaledVector(this.forward, -pose.handBack * legLength);
    return {
      position,
      palm: this.left.clone().multiplyScalar(-sign),
      fingers: this.forward.clone().addScaledVector(this.up, -1),
    };
  }

  solveArm(side, sign, target) {
    const { bones, legLength } = this;
    const elbow = bones[`forearm${side}`];
    const pole = worldPos(elbow)
      .addScaledVector(this.left, sign * ELBOW.spread * legLength)
      .addScaledVector(this.forward, ELBOW.forward * legLength)
      .addScaledVector(this.up, ELBOW.up * legLength);
    const hand = bones[`hand${side}`];
    this.solveTwoBone(bones[`arm${side}`], elbow, hand, target.position, pole);

    const fingers = worldPos(bones[`middle1${side}`]).sub(worldPos(hand));
    const across = worldPos(bones[`index1${side}`]).sub(worldPos(bones[`pinky1${side}`]));
    const palm = new THREE.Vector3().crossVectors(fingers, across).multiplyScalar(sign);
    this.alignFrame(hand, palm, fingers, target.palm, target.fingers);
  }

  /**
   * IK da perna com o joelho como dobradiça: dobra só no eixo do joelho até a distância
   * quadril–tornozelo bater com o alvo, leva o tornozelo ao alvo girando a coxa e, por fim,
   * gira a coxa em torno da reta quadril–alvo para o joelho apontar para kneeDirection.
   */
  solveHingeLeg(hip, knee, ankle, target, kneeDirection, kneeRest) {
    const origin = worldPos(hip);
    const wanted = target.distanceTo(origin);
    const hinge = new THREE.Quaternion();
    const reachAt = (angle) => {
      knee.quaternion.copy(kneeRest).multiply(hinge.setFromAxisAngle(KNEE_AXIS, angle));
      knee.updateMatrixWorld(true);
      return worldPos(ankle).distanceTo(origin);
    };
    // Quanto mais dobra, mais perto o tornozelo fica do quadril.
    let low = 0;
    let high = KNEE_MAX_BEND;
    for (let i = 0; i < 40; i++) {
      const middle = (low + high) / 2;
      if (reachAt(middle) > wanted) low = middle;
      else high = middle;
    }
    reachAt((low + high) / 2);

    const toTarget = target.clone().sub(origin).normalize();
    this.rotateWorld(hip, new THREE.Quaternion().setFromUnitVectors(
      worldPos(ankle).sub(origin).normalize(), toTarget,
    ));
    const current = worldPos(knee).sub(origin);
    current.addScaledVector(toTarget, -current.dot(toTarget));
    const desired = kneeDirection.clone().addScaledVector(toTarget, -kneeDirection.dot(toTarget));
    const twist = Math.atan2(toTarget.dot(current.clone().cross(desired)), current.dot(desired));
    this.rotate(hip, toTarget, twist);
  }

  // IK analítica de dois ossos; pole indica para onde o cotovelo aponta.
  solveTwoBone(root, mid, end, target, pole) {
    const a = worldPos(root);
    const b = worldPos(mid);
    const c = worldPos(end);
    const upper = a.distanceTo(b);
    const lower = b.distanceTo(c);
    const direction = target.clone().sub(a);
    const distance = THREE.MathUtils.clamp(
      direction.length(), Math.abs(upper - lower) + 1e-6, upper + lower - 1e-6,
    );
    direction.normalize();
    const bend = pole.clone().sub(a);
    bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    const cosA = THREE.MathUtils.clamp(
      (upper * upper + distance * distance - lower * lower) / (2 * upper * distance), -1, 1,
    );
    const desiredMid = a.clone()
      .addScaledVector(direction, cosA * upper)
      .addScaledVector(bend, Math.sqrt(1 - cosA * cosA) * upper);
    const reach = a.clone().addScaledVector(direction, distance);

    this.rotateWorld(root, new THREE.Quaternion().setFromUnitVectors(
      b.clone().sub(a).normalize(), desiredMid.sub(a).normalize(),
    ));
    worldPos(mid, b);
    worldPos(end, c);
    this.rotateWorld(mid, new THREE.Quaternion().setFromUnitVectors(
      c.sub(b).normalize(), reach.sub(b).normalize(),
    ));
  }
}
