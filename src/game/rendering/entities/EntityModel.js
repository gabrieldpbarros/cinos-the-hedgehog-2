import * as THREE from 'three';

export class EntityModel {
  constructor(model = null) {
    this.root = new THREE.Group();
    this.visual = new THREE.Group();
    this.root.add(this.visual);

    this.placeholder = model ? null : new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x999999 }),
    );
    this.model = model ?? this.placeholder;
    this.visual.add(this.model);
  }

  setModel(model) {
    this.model.removeFromParent();
    if (this.placeholder) {
      this.placeholder.geometry.dispose();
      this.placeholder.material.dispose();
      this.placeholder = null;
    }
    this.model = model;
    this.visual.add(model);
  }

  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  setVisualOffset(x, y, z) {
    this.visual.position.set(x, y, z);
  }

  setVisualRotation(x, y, z) {
    this.visual.rotation.set(x, y, z);
  }

  setVisualScale(x, y, z) {
    this.visual.scale.set(x, y, z);
  }

  update(dt) {
    
  }

  getObject3D() {
    return this.root;
  }
}
