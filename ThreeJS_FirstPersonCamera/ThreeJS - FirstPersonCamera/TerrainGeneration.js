
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import * as CANNON from 'cannon-es';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader';


class TerrainGeneration {
  constructor(scene, physicsWorld, texture, normalTexture, definitionLevel) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.floorDefinition = definitionLevel;
    this.texture = texture;
    this.normalTexture = normalTexture;
    this.FBXLoader = new FBXLoader();

  }
  AccessGrid(x, y, definition) {
    var index = x * definition + y;
    return index;
  }

  CreateWall(position, rotationX, rotationY,rotationZ, noiseDivisor, floorSize) {
    const newGeom = new THREE.BufferGeometry();
    const noise = createNoise2D();
    const step = floorSize / this.floorDefinition;
    const indices = [];
    const vertices = [];
    const divisor = noiseDivisor;

    const falloff = (x, y, falloffRadius) => {
      const distanceToCenter = Math.sqrt((x - floorSize / 2) ** 2 + (y - floorSize / 2) ** 2);
      const falloffFactor = Math.max(0, 1 - distanceToCenter / falloffRadius);
      return falloffFactor * falloffFactor;
    };

    for (var i = 0; i < this.floorDefinition; i++) {
      for (var j = 0; j < this.floorDefinition; j++) {
        var pos = new THREE.Vector3(i * step, j * step, 0);
        pos.x -= floorSize / 2;
        pos.y -= floorSize / 2;

        var noiseValue = noise(i / divisor, j / divisor) * falloff(i * step, j * step, 20);
        var height = (noiseValue + 1) / 2;
        pos.z = height * 10;

        vertices.push(pos.x, pos.y, pos.z);
      }
    }

    for (var i = 0; i < this.floorDefinition - 1; i++) {
      for (var j = 0; j < this.floorDefinition - 1; j++) {
        var Idx0 = this.AccessGrid(i, j, this.floorDefinition);
        var Idx1 = this.AccessGrid(i + 1, j, this.floorDefinition);
        var Idx2 = this.AccessGrid(i + 1, j + 1, this.floorDefinition);
        var Idx3 = this.AccessGrid(i, j + 1, this.floorDefinition);
        indices.push(Idx1, Idx0, Idx2);
        indices.push(Idx2, Idx0, Idx3);

      }
    }

    const uv = [];
    for (let i = 0; i < this.floorDefinition; i++) {
      for (let j = 0; j < this.floorDefinition; j++) {
        uv.push(i / (this.floorDefinition - 1), j / (this.floorDefinition - 1));
      }
    }

    newGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));

    newGeom.setIndex(indices);
    newGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    newGeom.computeVertexNormals();
    newGeom.computeVertexNormals();

    const floorMat = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: this.texture,
      normalMap: this.normalTexture,
    });

    const floor = new THREE.Mesh(newGeom, floorMat);

    floor.position.copy(position);

    const euler = new THREE.Euler(rotationX, rotationY, rotationZ);
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    floor.quaternion.copy(quaternion);
    const terrainBody = this.GenerateTriMesh(floor, quaternion);
    this.scene.add(floor);
    this.physicsWorld.addBody(terrainBody);
    return { mesh: floor, body: terrainBody};
  }

  GenerateTriMesh(mesh, quaternion) {
    var vertices = mesh.geometry.attributes.position.array;
    var indices = mesh.geometry.index.array;

    var terrainTriMesh = new CANNON.Trimesh(vertices, indices);
    const terrainBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: terrainTriMesh,
    })
    terrainBody.position.copy(mesh.position);
    terrainBody.quaternion.copy(quaternion);
    return terrainBody;
  }
  CreateRoom(centrePoint, floorSize, grid, gridPos) {
    const walls = [];
    const wallSize = floorSize / 3; // Define wall size

    const isAdjacentWall = (x, y) => {
        if (x < 0 || y < 0 || x >= grid.length || y >= grid[0].length) {
            return false; // Out of bounds, not a wall
        }
        return grid[x][y] === 1;
    };

    const isCornerTurn = (x, y) => {
      const adjacentWalls = [
        isAdjacentWall(x - 1, y),
        isAdjacentWall(x + 1, y),
        isAdjacentWall(x, y - 1),
        isAdjacentWall(x, y + 1),
      ].filter(Boolean).length;

      return adjacentWalls === 2 && (
        (isAdjacentWall(x - 1, y) && isAdjacentWall(x, y - 1)) ||
        (isAdjacentWall(x - 1, y) && isAdjacentWall(x, y + 1)) ||
        (isAdjacentWall(x + 1, y) && isAdjacentWall(x, y - 1)) ||
        (isAdjacentWall(x + 1, y) && isAdjacentWall(x, y + 1))
      );
    };


    // Create walls based on adjacent cellsaw
    if (!isAdjacentWall(gridPos.x - 1, gridPos.y)) {
        const leftWall = this.CreateWall(
            new THREE.Vector3(centrePoint.x - floorSize/1.67, centrePoint.y, centrePoint.z),
            0, Math.PI / 2,Math.PI/2, wallSize, floorSize
        );
        walls.push(leftWall);
    }
    if (!isAdjacentWall(gridPos.x + 1, gridPos.y)) {
        const rightWall = this.CreateWall(
            new THREE.Vector3(centrePoint.x + floorSize/2.8, centrePoint.y, centrePoint.z),
            0, Math.PI / 2,Math.PI/2, wallSize, floorSize
        );
        walls.push(rightWall);
    }
    if (!isAdjacentWall(gridPos.x, gridPos.y - 1)) {
        const frontWall = this.CreateWall(
            new THREE.Vector3(centrePoint.x, centrePoint.y, centrePoint.z - floorSize/1.67),
            0, 0,0, wallSize, floorSize
        );
        walls.push(frontWall);
    }
    if (!isAdjacentWall(gridPos.x, gridPos.y + 1)) {
        const backWall = this.CreateWall(
            new THREE.Vector3(centrePoint.x, centrePoint.y, centrePoint.z + floorSize/2.8),
            0, 0,0, wallSize, floorSize 
        );
        walls.push(backWall);
    }

    // Create floor and ceiling
    const floor = this.CreateWall(new THREE.Vector3(centrePoint.x, centrePoint.y - floorSize/2.5, centrePoint.z), Math.PI / 2, 0,0, 1000, floorSize);
    const ceiling = this.CreateWall(new THREE.Vector3(centrePoint.x, centrePoint.y + floorSize/2, centrePoint.z), Math.PI / 2, 0,0, 1000, floorSize);

    const room = {
        walls: walls.map(w => w.mesh),
        colliders: walls.map(w => w.body),
        floor: floor,
        ceiling: ceiling,
    };
    return room;
  }

  UpdatePhysics() {
    for (var i = 0; i < rocks.length; i++) {
      rocks[i].position.copy(rockBodies[i].position);
      rocks[i].quaternion.copy(rockBodies[i].quaternion);
    }
  }

  CreateGrid(grid, floorSize, scene) {

    const rows = grid.length;
    const columns = grid[1].length;
    const roomSpacing = floorSize * 0.95;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        if (grid[i][j] == 1) {
          const xPos = i * roomSpacing;
          const zPos = j * roomSpacing;
          this.CreateRoom(new THREE.Vector3(xPos, 0, zPos), floorSize, grid, new THREE.Vector2(i, j));
          if (i == rows -1 && j == columns - 1) {
            this.SpawnStatue("resources/models/statue.fbx", xPos, zPos,scene);
          }
        }
      }
    }
  }
  
  SpawnStatue(pathToModel,xPos,zPos,scene){
    this.FBXLoader.load(pathToModel, (object) =>{
      object.position.set(xPos-4,-25,zPos+7);
      object.scale.set(2.5,2.5,2.5);
      object.rayHits = 0;
      object.traverse(function (child){
        if (child.isMesh){
          child.material = new THREE.MeshPhongMaterial({color: 0xffffff});
          child.castShadow = true;
          child.receiveShadow = true;
        }
      })
      scene.add(object);
      const spotlight = new THREE.SpotLight(0xffffff, 1000);
      const lightHelper = new THREE.DirectionalLightHelper(spotlight,  10);
      scene.add(lightHelper);
      spotlight.position.set(xPos,19,zPos);
      spotlight.distance = 50;
      spotlight.castShadow = true;
      spotlight.angle = -Math.PI/4;
      spotlight.penumbra = 0.6;
      spotlight.decay = 1;
      spotlight.target.position.set(xPos,-25,zPos);
      spotlight.target.updateMatrixWorld();
      scene.add(spotlight);
    }, (xhr) => {
      console.log((xhr.loaded/xhr.total) * 100 + "% loaded.");
    },(error) => {
      console.log(error);
    });
  }

  RemoveWalls(room) {
    room.walls.forEach((wall, index) => {
      this.scene.remove(wall);
      const collider = room.colliders[index];
      if (collider) {
        this.physicsWorld.removeBody(collider);
      }
    });
  }

    generateMaze(rows, cols) {
    const maze = Array.from({ length: rows }, () => Array(cols).fill(0));
    const directions = [
      [1, 0],  // Down
      [0, 1],  // Right
      [-1, 0], // Up
      [0, -1]  // Left
    ];
  
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
  
    function isValid(x, y) {
      return x >= 0 && y >= 0 && x < rows && y < cols;
    }
  
    function carvePath(x, y) {
      maze[x][y] = 1;
      const shuffledDirections = shuffle(directions.slice());
  
      for (const [dx, dy] of shuffledDirections) {
        const nx = x + dx * 2;
        const ny = y + dy * 2;
  
        if (isValid(nx, ny) && maze[nx][ny] === 0) {
          maze[x + dx][y + dy] = 1; // Mark the cell in between as part of the path
          carvePath(nx, ny);
        }
      }
    }
  
    // Start carving from (0, 0)
    carvePath(0, 0);
  
    // Ensure there is a path from (0, 0) to (rows-1, cols-1)
    if (maze[rows - 1][cols - 1] === 0) {
      maze[rows - 1][cols - 1] = 1;
      maze[rows - 2][cols - 1] = 1;
    }
  
    return maze;
  }
  
}
export default TerrainGeneration;
