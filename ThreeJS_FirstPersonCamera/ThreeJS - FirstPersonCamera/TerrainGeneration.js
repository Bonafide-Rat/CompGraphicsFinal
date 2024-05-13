
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import * as CANNON from 'cannon-es';


class TerrainGeneration {
  constructor(scene, physicsWorld, texture, normalTexture, definitionLevel) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.floorDefinition = definitionLevel;
    this.texture = texture;
    this.normalTexture = normalTexture;

  }

  PrintToConsole() {
    console.log("success")
  }

  AccessGrid(x, y, definition) {
    var index = x * definition + y;
    return index;
  }

  CreateWall(position, rotationX, rotationY, noiseDivisor, floorSize) {
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

        var noiseValue = noise(i / divisor, j / divisor) * falloff(i * step, j * step, 10);
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

    const euler = new THREE.Euler(rotationX, rotationY, 0);
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    floor.quaternion.copy(quaternion);
    const terrainBody = this.GenerateTriMesh(floor, quaternion);
    this.scene.add(floor);
    this.physicsWorld.addBody(terrainBody);

    return { mesh: floor, body: terrainBody };
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
    const floor = this.CreateWall(new THREE.Vector3(centrePoint.x, centrePoint.y - floorSize / 4, centrePoint.z), Math.PI / 2, 0, 1000, floorSize);
    const ceiling = this.CreateWall(new THREE.Vector3(centrePoint.x, centrePoint.y + floorSize / 2, centrePoint.z), Math.PI / 2, 0, 1000, floorSize);
    this.CreateWall(4, 4, 4,)
    console.log(gridPos)

    if (gridPos.x > 1 && grid[gridPos.x - 1][gridPos.y] == 1) {
      console.log("adjacentWallWest")
    }
    else if(gridPos.x > 1){
      var wall1 = this.CreateWall(new THREE.Vector3(centrePoint.x - floorSize / 2, centrePoint.y, centrePoint.z),
        0, Math.PI / 2, floorSize / 3,
        floorSize);
      walls.push(wall1);
    }
    else {
      var wall1 = this.CreateWall(new THREE.Vector3(centrePoint.x - floorSize / 2, centrePoint.y, centrePoint.z),
        0, Math.PI / 2, floorSize / 3,
        floorSize);
      walls.push(wall1);
    }

    if (gridPos.x < grid[0].length - 1 && grid[gridPos.x + 1][gridPos.y] == 1) {
      console.log("adjacentWallEast")
    }

    else if(gridPos.x < grid[0].length - 1){
      var wall2 = this.CreateWall(new THREE.Vector3(centrePoint.x + floorSize / 2, centrePoint.y, centrePoint.z),
        0, Math.PI / 2, floorSize / 3,
        floorSize);
      walls.push(wall2);
    }
    else {
      var wall2 = this.CreateWall(new THREE.Vector3(centrePoint.x + floorSize / 2, centrePoint.y, centrePoint.z),
        0, Math.PI / 2, floorSize / 3,
        floorSize);
      walls.push(wall2);
    }



    if (gridPos.y > 0 && grid[gridPos.x][gridPos.y - 1] == 1) {
      console.log("adjacentWallSouth")
    }

    else if(gridPos.y > 0){
      var wall3 = this.CreateWall(new THREE.Vector3(centrePoint.x, centrePoint.y, centrePoint.z - floorSize / 2),
        0, 0, floorSize / 3,
        floorSize);
      walls.push(wall3);
    }
    else {
      var wall3 = this.CreateWall(new THREE.Vector3(centrePoint.x, centrePoint.y, centrePoint.z - floorSize / 2),
        0, 0, floorSize / 3,
        floorSize);
      walls.push(wall3);
    }



    if (gridPos.y < grid[1].length - 1 && grid[gridPos.x][gridPos.y + 1] == 1) {
      console.log("adjacentWallNorth")
    }
    else if(gridPos.y < grid[1].length - 1){
      var wall4 = this.CreateWall(new THREE.Vector3(centrePoint.x, centrePoint.y, centrePoint.z + floorSize / 2), 0, 0,
        floorSize / 3,
        floorSize);
      walls.push(wall4);
    }
    else {
      var wall4 = this.CreateWall(new THREE.Vector3(centrePoint.x, centrePoint.y, centrePoint.z + floorSize / 2), 0, 0,
        floorSize / 3,
        floorSize);
      walls.push(wall4);
    }

    const room = {
      walls: walls.map(w => w.mesh),
      colliders: walls.map(w => w.body),
      floor: floor,
      ceiling: ceiling,
    }
    return room;
  }

  UpdatePhysics() {
    for (var i = 0; i < rocks.length; i++) {
      rocks[i].position.copy(rockBodies[i].position);
      rocks[i].quaternion.copy(rockBodies[i].quaternion);
    }
  }

  CreateGrid(grid, floorSize) {

    const rows = grid.length;
    const columns = grid[1].length;
    const roomSpacing = floorSize * 0.9;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        if (grid[i][j] == 1) {
          const xPos = i * roomSpacing;
          const zPos = j * roomSpacing;
          this.CreateRoom(new THREE.Vector3(xPos, 0, zPos), floorSize, grid, new THREE.Vector2(i, j));
        }

      }
    }
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
}
export default TerrainGeneration;
