import * as THREE from 'three';

export class EntityModel {
  constructor(model = null) {
    this.root = new THREE.Group();
    this.visualOffset = new THREE.Vector3();

    this.placeholder = model ? null : new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x999999 }),
    );
    this.model = model ?? this.placeholder;
    this.root.add(this.model);
  }

  setModel(model) {
    this.model.removeFromParent();
    if (this.placeholder) {
      this.placeholder.geometry.dispose();
      this.placeholder.material.dispose();
      this.placeholder = null;
    }
    this.model = model;
    model.position.add(this.visualOffset);
    this.root.add(model);
  }

  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  setVisualOffset(x, y, z) {
    this.model.position.x += x - this.visualOffset.x;
    this.model.position.y += y - this.visualOffset.y;
    this.model.position.z += z - this.visualOffset.z;
    this.visualOffset.set(x, y, z);
  }

  setHitboxSize(length, height, depth) {
    if (!this.hitboxHelper) {
      this.hitboxHelper = new THREE.Box3Helper(new THREE.Box3(), 0xffff00);
      this.hitboxHelper.visible = false;
      this.root.add(this.hitboxHelper);
    }
    this.hitboxHelper.box.setFromCenterAndSize(
      new THREE.Vector3(),
      new THREE.Vector3(length, height, depth),
    );
  }

  setHitboxVisible(visible) {
    this.hitboxHelper.visible = visible;
  }

  update() {}

  getObjectDim() {
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const centerPos = box.getCenter(new THREE.Vector3());

    return {
      length: size.x,
      height: size.y,
      depth:  size.z,
      centerPos,
    }
  }

  getObject3D() {
    return this.root;
  }
}
