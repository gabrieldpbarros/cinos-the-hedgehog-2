import * as THREE from 'three';

const DEFAULT_CAPACITY = 256;

/**
 * Desenha todos os anéis com uma única InstancedMesh. Cada anel mantém seu próprio
 * modelo lógico (rotação, coleta e faíscas), mas a malha visível é compartilhada.
 */
export class RingInstances {
  constructor(scene, capacity = DEFAULT_CAPACITY) {
    this.scene = scene;
    this.capacity = capacity;
    this.mesh = null;
    this.entries = [];
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
  }

  add(entity) {
    const visual = entity.model?.model;
    if (!visual) return false;
    if (this.entries.some((entry) => entry.entity === entity)) return true;

    let template = null;
    visual.traverse((object) => {
      if (!template && object.isMesh) template = object;
    });
    if (!template) return false;
    // Um anel especial com outra geometria/material não pode entrar neste lote;
    // nesse caso a cena desenha o modelo individualmente.
    if (this.mesh && (template.geometry !== this.mesh.geometry ||
        template.material !== this.mesh.material)) return false;

    if (!this.mesh) {
      this.mesh = new THREE.InstancedMesh(template.geometry, template.material, this.capacity);
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.mesh.frustumCulled = false;
      // A malha instanciada entra no shadow map como um único objeto; os 72 anéis
      // continuam projetando sombra sem voltar a custar 72 draw calls.
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      this.mesh.name = 'instanced-rings';
      this.scene.add(this.mesh);
    }

    // O visual original fica só como fonte de transformação; as faíscas continuam
    // presas à raiz da entidade, que permanece na cena.
    visual.visible = false;
    this.entries.push({ entity, template });
    this.scene.add(entity.getModel3D().getObject3D());
    return true;
  }

  remove(entity) {
    const index = this.entries.findIndex((entry) => entry.entity === entity);
    if (index === -1) return false;
    this.entries.splice(index, 1);
    entity.getModel3D().getObject3D().removeFromParent();
    return true;
  }

  update() {
    if (!this.mesh) return;
    const count = Math.min(this.entries.length, this.capacity);
    for (let i = 0; i < count; i++) {
      const { entity, template } = this.entries[i];
      if (entity.logic.active === false) {
        this.mesh.setMatrixAt(i, this.zero);
        continue;
      }
      template.updateWorldMatrix(true, false);
      this.mesh.setMatrixAt(i, template.matrixWorld);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    if (!this.mesh) return;
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.mesh = null;
    this.entries = [];
  }
}
