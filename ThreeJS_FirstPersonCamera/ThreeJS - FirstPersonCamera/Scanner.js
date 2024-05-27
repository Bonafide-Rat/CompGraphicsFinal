import * as THREE from 'https://cdn.skypack.dev/three@0.136';

class Scanner {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.dots = [];
    this.dotLifetime = 20.0; // Dots will last for 2 seconds
  }

  scan() {
    this.targetScan();
    this.horizontalScan();
  }

  targetScan() {
    const density = 1; // Number of dots to generate
    const coneAngle = Math.PI / 2; // Cone angle in radians (90 degrees)
    const numRays = 50; // Number of rays to cast within the cone

    // Get camera direction
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Calculate rotation axis perpendicular to camera direction
    const rotationAxis = new THREE.Vector3();
    rotationAxis.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

    // Calculate step angle between each ray
    const stepAngle = coneAngle / numRays;

    // Start angle for the first ray
    const startAngle = -coneAngle / 2;

    for (let i = 0; i < numRays; i++) {
      // Calculate direction for this ray
      const angle = startAngle + i * stepAngle;
      const direction = cameraDirection.clone().applyAxisAngle(rotationAxis, angle);

      const raycaster = new THREE.Raycaster();
      raycaster.set(this.camera.position, direction);
      const intersects = raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const dot = this.createDot(intersect.point);
        this.dots.push({ dot, timestamp: performance.now() });
      }
    }
  }

  horizontalScan() {
    const numRays = 40; // Number of rays to cast (360 degrees / 30 degrees = 12)
    const intervalAngle = Math.PI / 20; // Interval angle in radians (30 degrees)

    // Get camera position
    const cameraPosition = this.camera.position.clone();

    for (let i = 0; i < numRays; i++) {
      // Calculate direction for this ray
      const angle = i * intervalAngle;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

      const raycaster = new THREE.Raycaster(cameraPosition, direction);
      const intersects = raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const dot = this.createDot(intersect.point);
        this.dots.push({ dot, timestamp: performance.now() });
      }
    }
  }

  createDot(position) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const dot = new THREE.Mesh(geometry, material);
    dot.position.copy(position);
    this.scene.add(dot);
    return dot;
  }

  /*update() {
    const now = performance.now();
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const { dot, timestamp } = this.dots[i];
      const elapsed = (now - timestamp) / 1000.0;
      if (elapsed > this.dotLifetime) {
        this.scene.remove(dot);
        this.dots.splice(i, 1);
      } else {
        const alpha = 1.0 - elapsed / this.dotLifetime;
        dot.material.opacity = alpha;
        dot.material.transparent = true;
      }
    }
  }*/
}

export default Scanner;
