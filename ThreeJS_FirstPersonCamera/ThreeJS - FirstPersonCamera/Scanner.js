import * as THREE from 'https://cdn.skypack.dev/three@0.136';

class Scanner {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.dots = [];
    this.dotLifetime = 2.0; // Dots will last for 2 seconds

    // Point cloud setup
    this.dotCount = 1000;
    this.positions = new Float32Array(this.dotCount * 3);
    this.pointCloudGeometry = new THREE.BufferGeometry();
    this.pointCloudGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const pointCloudMaterial = new THREE.PointsMaterial({
      color: 0xff0000,
      size: 0.1,
      transparent: true,
      opacity: 1.0,
    });

    this.pointCloud = new THREE.Points(this.pointCloudGeometry, pointCloudMaterial);
    this.scene.add(this.pointCloud);
  }

  scan() {
    const density = 50; // Number of rays to cast
    const maxDistance = 100; // Maximum distance to cast rays

    for (let i = 0; i < density; i++) {
      const raycaster = new THREE.Raycaster();
      const direction = new THREE.Vector3(
        (Math.random() * 2 - 1),
        (Math.random() * 2 - 1),
        (Math.random() * 2 - 1)
      ).normalize();

      raycaster.set(this.camera.position, direction);
      const intersects = raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        this.addDot(intersect.point);
      }
    }
  }

  addDot(position) {
    const index = this.dots.length % this.dotCount;
    this.positions[index * 3] = position.x;
    this.positions[index * 3 + 1] = position.y;
    this.positions[index * 3 + 2] = position.z;
    this.dots.push({ position, timestamp: performance.now(), index });

    this.pointCloudGeometry.attributes.position.needsUpdate = true;
  }

  update() {
    const now = performance.now();
    const newDots = [];
    for (const dot of this.dots) {
      const elapsed = (now - dot.timestamp) / 1000.0;
      if (elapsed < this.dotLifetime) {
        newDots.push(dot);
        const alpha = 1.0 - (elapsed / this.dotLifetime);
        this.pointCloud.material.opacity = alpha;
      }
    }
    this.dots = newDots;
  }
}

export default Scanner;
