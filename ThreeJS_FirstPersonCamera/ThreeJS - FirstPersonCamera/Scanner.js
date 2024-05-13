import * as THREE from 'three';

class Scanner {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.scannerMaterial = new THREE.PointsMaterial({
      size: 0.05, // Adjust the size of the dots
      sizeAttenuation: false,
      color: 0xffffff, // Color of the dots
      transparent: true,
      opacity: 0.5, // Opacity of the dots
    });

    // Initialize vertices array
    this.vertices = [];

    this.scannerPoints = new THREE.Points(new THREE.BufferGeometry(), this.scannerMaterial);
    this.scene.add(this.scannerPoints);

    // Boolean to track if scanner is active
    this.active = false;

    // Event listener for left mouse click
    document.addEventListener('mousedown', this.onMouseDown.bind(this), false);
  }

  onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
      // Start or stop the scanner depending on its current state
      this.active = !this.active;
    }
  }

  update() {
    if (this.active) {
      // Get the direction vector from camera to a point in front of it
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(this.camera.quaternion);
      direction.normalize();
  
      // Raycast from camera position to detect intersection with objects
      const raycaster = new THREE.Raycaster(this.camera.position, direction);
      const intersects = raycaster.intersectObjects(this.scene.children, true);
  
      // Clear existing points
      this.vertices.length = 0;
  
      // Add points to the scanner
      intersects.forEach(intersect => {
        const point = intersect.point.clone();
        this.vertices.push(point);
      });
  
      // Update scanner points geometry
      this.scannerPoints.geometry.setFromPoints(this.vertices);
      this.scannerPoints.visible = true;
    } else {
      // Hide scanner when not active
      this.scannerPoints.visible = false;
    }
  }
}

export default Scanner;
