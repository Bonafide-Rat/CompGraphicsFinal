import * as THREE from 'https://cdn.skypack.dev/three@0.136';

import {FirstPersonControls} from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/FirstPersonControls.js';

import TerrainGeneration from './TerrainGeneration';

import Scanner from './Scanner';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { createNoise2D } from 'simplex-noise';

import * as CANNON from 'cannon-es';

import CannonDebugger from 'cannon-es-debugger';

import Stats from 'stats.js';

const moveSpeed = 3;

const KEYS = {
  'a': 65,
  's': 83,
  'w': 87,
  'd': 68,
};

function clamp(x, a, b) {
  return Math.min(Math.max(x, a), b);
}

class InputController {
  constructor(target) {
    this.target_ = target || document;
    this.initialize_();    
  }

  initialize_() {
    this.current_ = {
      leftButton: false,
      rightButton: false,
      mouseXDelta: 0,
      mouseYDelta: 0,
      mouseX: 0,
      mouseY: 0,
    };
    this.previous_ = null;
    this.keys_ = {};
    this.previousKeys_ = {};
    this.target_.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
    this.target_.addEventListener('mousemove', (e) => this.onMouseMove_(e), false);
    this.target_.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
    this.target_.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
    this.target_.addEventListener('keyup', (e) => this.onKeyUp_(e), false);
  }

  onMouseMove_(e) {
    const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    this.current_.mouseXDelta = movementX;
    this.current_.mouseYDelta = movementY;

    // You may choose to remove the previous_ check here if needed
    if (this.previous_ === null) {
        this.previous_ = { ...this.current_ };
    }

    this.current_.mouseX += movementX;
    this.current_.mouseY += movementY;
  }

  onMouseDown_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = true;
        break;
      }
      case 2: {
        this.current_.rightButton = true;
        break;
      }
    }
  }

  onMouseUp_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = false;
        break;
      }
      case 2: {
        this.current_.rightButton = false;
        break;
      }
    }
  }

  onKeyDown_(e) {
    this.keys_[e.keyCode] = true;
  }

  onKeyUp_(e) {
    this.keys_[e.keyCode] = false;
  }

  key(keyCode) {
    return !!this.keys_[keyCode];
  }

  isReady() {
    return this.previous_ !== null;
  }

  update(_) {
    if (this.previous_ !== null) {
      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

      this.previous_ = {...this.current_};
    }
  }
};


class FirstPersonCamera {
  constructor(camera, objects, physicsWorld) {
    this.camera_ = camera;
    this.input_ = new InputController();
    this.rotation_ = new THREE.Quaternion();
    this.translation_ = new THREE.Vector3(0, 2, 0);
    this.currentTranslation_ = new THREE.Vector3(0,2,0);
    this.phi_ = 0;
    this.phiSpeed_ = 8;
    this.theta_ = 0;
    this.thetaSpeed_ = 5;
    this.headBobActive_ = false;
    this.headBobTimer_ = 0;
    this.objects_ = objects;
    this.physicsWorld_ = physicsWorld;
    this.initializePhysicsBody_();
    this.initializePhysicsEvents_();
    this.activeCollision_ = false;
  }
  
  initializePhysicsBody_(){
    const bodyShape = new CANNON.Sphere(2);
    this.physicsBody_ = new CANNON.Body({mass: 1, shape: bodyShape, collisionResponse:0});
    this.physicsWorld_.addBody(this.physicsBody_);
    this.physicsBody_.position.copy(this.camera_.position);
  }
  
  initializePhysicsEvents_(){
    this.physicsBody_.addEventListener('collide', (event) =>{
      this.activeCollision_ = true;
    });
    this.velocity_ = new THREE.Vector3();
  }

  update(timeElapsedS) {
    this.updateRotation_(timeElapsedS);
    this.updateCamera_(timeElapsedS);
    this.updateTranslation_(timeElapsedS);
    this.updateHeadBob_(timeElapsedS);
    this.input_.update(timeElapsedS);
    this.physicsBody_.position.copy(this.camera_.position);
  }

  updateCamera_(_) {
    this.camera_.quaternion.copy(this.rotation_);
    if (!this.activeCollision_) {
      this.camera_.position.copy(this.currentTranslation_);
    }
    this.camera_.position.y += Math.sin(this.headBobTimer_ * 10) * 1.5;
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);
    const dir = forward.clone();

    forward.multiplyScalar(100);
    forward.add(this.translation_);

    let closest = forward;
    const result = new THREE.Vector3();
    const ray = new THREE.Ray(this.translation_, dir);
    for (let i = 0; i < this.objects_.length; ++i) {
      if (ray.intersectBox(this.objects_[i], result)) {
        if (result.distanceTo(ray.origin) < closest.distanceTo(ray.origin)) {
          closest = result.clone();
        }
      }
    }
    this.camera_.lookAt(closest);
  }

  updateHeadBob_(timeElapsedS) {
    if (this.headBobActive_) {
      const wavelength = Math.PI;
      const nextStep = 1 + Math.floor(((this.headBobTimer_ + 0.000001) * 10) / wavelength);
      const nextStepTime = nextStep * wavelength / 10;
      this.headBobTimer_ = Math.min(this.headBobTimer_ + timeElapsedS, nextStepTime);

      if (this.headBobTimer_ == nextStepTime) {
        this.headBobActive_ = false;
      }
    }
  }

  updateTranslation_(timeElapsedS) {
    const forwardVelocity = ((this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0)) * moveSpeed;
    const strafeVelocity = ((this.input_.key(KEYS.a) ? 1 : 0) + (this.input_.key(KEYS.d) ? -1 : 0)) * moveSpeed;

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * timeElapsedS * 10);
    
    this.translation_.add(forward);
    this.translation_.add(left);
    if (!this.activeCollision_){
      this.currentTranslation_.copy(this.translation_);
    }
    
    if (this.activeCollision_){
      console.log(this.currentTranslation_.dot(this.translation_));
      if (this.currentTranslation_.normalize().dot(this.translation_.normalize()) <= 0){
        console.log("reverse");
        this.activeCollision_ = false;
      }
    }
  }

  updateRotation_(timeElapsedS) {
    const xh = this.input_.current_.mouseXDelta / window.innerWidth;
    const yh = this.input_.current_.mouseYDelta / window.innerHeight;

    this.phi_ += -xh * this.phiSpeed_;
    this.theta_ = clamp(this.theta_ + -yh * this.thetaSpeed_, -Math.PI / 3, Math.PI / 3);

    if (this.phi_ > Math.PI) {
      this.phi_ -= Math.PI * 2;
    } else if (this.phi_ < -Math.PI) {
      this.phi_ += Math.PI * 2;
    }

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    this.rotation_.copy(q);
  }
}


class FirstPersonCameraDemo {
  constructor() {
    this.initialize_();
  }

  initialize_() {
    this.initializeRenderer_();
    this.initializeLights_();
    this.initializeScene_();
    this.initializePostFX_();
    this.initializeDemo_();
    this.previousRAF_ = null;
    this.raf_();
    this.onWindowResize_();
    
  }
  
  initializeDemo_() {
    this.fpsCamera_ = new FirstPersonCamera(this.camera_, this.objects_, this.physicsWorld_);
    this.scanner_ = new Scanner(this.scene_, this.camera_);
    this.cannonDebugRenderer_ = new CannonDebugger(this.scene_, this.physicsWorld_,{
      color: 0xff0000,
    })
  }
  
  initializePhysicsWorld_(){
    const world = new CANNON.World();
    world.gravity.set(0,0,0);
    return world;
  }

  initializeRenderer_() {
    this.threejs_ = new THREE.WebGLRenderer({
      antialias: false,
    });
    this.threejs_.shadowMap.enabled = true;
    this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    this.threejs_.physicallyCorrectLights = true;
    this.threejs_.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(this.threejs_.domElement);

    window.addEventListener('resize', () => {
      this.onWindowResize_();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(0, 2, 0);

    this.scene_ = new THREE.Scene();

    this.uiCamera_ = new THREE.OrthographicCamera(
        -1, 1, 1 * aspect, -1 * aspect, 1, 1000);
    this.uiScene_ = new THREE.Scene();

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.scanner_.scan();
      }
    });

  }

  initializeScene_() {

    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();
    const rockTexture = mapLoader.load('resources/img/rocktexture.png');
    const rockNormal = mapLoader.load('resources/img/rocknormal.png');

    const physicsWorld = this.initializePhysicsWorld_();
    this.physicsWorld_ = physicsWorld;

    const terrainGenerator = new TerrainGeneration(this.scene_,this.physicsWorld_, rockTexture, rockNormal, 25);
    
    const snakingArray = [
      [1, 1, 1],
      [0, 0, 1],
      [1, 1, 1]
    ];

    terrainGenerator.CreateGrid(snakingArray,50, true);
    //terrainGenerator.CreateRoom(new THREE.Vector3(0,0,0), 50, snakingArray,new THREE.Vector2(0,0))

    this.objects_ = [];

    // Crosshair
    const crosshair = mapLoader.load('resources/crosshair.png');
    crosshair.anisotropy = maxAnisotropy;

    this.sprite_ = new THREE.Sprite(
      new THREE.SpriteMaterial({map: crosshair, color: 0xffffff, fog: false, depthTest: false, depthWrite: false}));
    this.sprite_.scale.set(0.15, 0.15 * this.camera_.aspect, 1)
    this.sprite_.position.set(0, 0, -10);

    this.uiScene_.add(this.sprite_);

    
}




  initializeLights_() {
  
    this.spotlight = new THREE.SpotLight(0xFFFFFF, 20.0, 120, Math.PI / 6, 0.8, 1.0);
    this.spotlight.castShadow = true;
    this.spotlight.shadow.bias = -0.00001;
    this.spotlight.shadow.mapSize.width = 4096;
    this.spotlight.shadow.mapSize.height = 4096;
    this.spotlight.shadow.camera.near = 1;
    this.spotlight.shadow.camera.far = 100;
    this.spotlight.position.copy(this.camera_.position);
    this.scene_.add(this.spotlight);


    this.ambientLight = new THREE.AmbientLight(0xFFFFFF);
    //this.scene_.add(this.ambientLight);
  }

  updateSpotlightPosition() {
    this.spotlight.position.copy(this.camera_.position);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera_.quaternion);
    const targetPosition = this.camera_.position.clone().add(forward).add(new THREE.Vector3(0, 0, 0));
    this.spotlight.target.position.copy(targetPosition);
    this.spotlight.target.updateMatrixWorld();
    this.spotlight.lookAt(targetPosition);
  }
  

  loadMaterial_(name, tiling) {
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();

    const metalMap = mapLoader.load('resources/freepbr/' + name + 'metallic.png');
    metalMap.anisotropy = maxAnisotropy;
    metalMap.wrapS = THREE.RepeatWrapping;
    metalMap.wrapT = THREE.RepeatWrapping;
    metalMap.repeat.set(tiling, tiling);

    const albedo = mapLoader.load('resources/freepbr/' + name + 'albedo.png');
    albedo.anisotropy = maxAnisotropy;
    albedo.wrapS = THREE.RepeatWrapping;
    albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(tiling, tiling);
    albedo.encoding = THREE.sRGBEncoding;

    const normalMap = mapLoader.load('resources/freepbr/' + name + 'normal.png');
    normalMap.anisotropy = maxAnisotropy;
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(tiling, tiling);

    const roughnessMap = mapLoader.load('resources/freepbr/' + name + 'roughness.png');
    roughnessMap.anisotropy = maxAnisotropy;
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(tiling, tiling);

    const material = new THREE.MeshStandardMaterial({
      metalnessMap: metalMap,
      map: albedo,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
    });

    return material;
  }

  initializePostFX_() { 
  }

  onWindowResize_() {
    this.camera_.aspect = window.innerWidth / window.innerHeight;
    this.camera_.updateProjectionMatrix();

    this.uiCamera_.left = -this.camera_.aspect;
    this.uiCamera_.right = this.camera_.aspect;
    this.uiCamera_.updateProjectionMatrix();

    this.threejs_.setSize(window.innerWidth, window.innerHeight);
  }

  raf_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }
      this.step_(t - this.previousRAF_);
      this.threejs_.autoClear = true;
      this.threejs_.render(this.scene_, this.camera_);
      this.threejs_.autoClear = false;
      this.threejs_.render(this.uiScene_, this.uiCamera_);
      this.previousRAF_ = t;
      this.raf_();
    });
  }

  step_(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    this.physicsWorld_.step(1 / 60, timeElapsedS);
    // this.controls_.update(timeElapsedS);
    //console.log(this.camera_.rotation)
    //this.cannonDebugRenderer_.update();
    this.updateSpotlightPosition();
    this.fpsCamera_.update(timeElapsedS);
    //this.scanner_.update(timeElapsedS);
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new FirstPersonCameraDemo();
}); 