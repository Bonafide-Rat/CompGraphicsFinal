import * as THREE from 'https://cdn.skypack.dev/three@0.136';

class Scanner {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.dots = [];
    this.dotLifetime = 10.0; // Dots will last for 2 seconds
  }

  scan() {
    const density = 200; // Number of dots to generate
    const maxDistance = 100; // Maximum distance to cast rays
    const coneAngle = Math.PI / 4; // Cone angle in radians (45 degrees)

    for (let i = 0; i < density; i++) {
        const raycaster = new THREE.Raycaster();
        
        // Calculate random direction within cone in front of the camera
        const theta = Math.acos(Math.random() * (1 - Math.cos(coneAngle)));
        const phi = Math.random() * 2 * Math.PI;
        const direction = new THREE.Vector3(
            Math.sin(theta) * Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
            Math.cos(theta)
        ).normalize();
        
        raycaster.set(this.camera.position, direction);
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

  update() {
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
  }
}

export default Scanner;
