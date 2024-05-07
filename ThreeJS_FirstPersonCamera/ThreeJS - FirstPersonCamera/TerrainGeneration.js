
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import * as CANNON from 'cannon-es';


class TerrainGeneration{
    constructor(scene,physicsWorld,texture,normalTexture,definitionLevel){
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.floorDefinition = definitionLevel;
        this.texture = texture;
        this.normalTexture = normalTexture;

    }
}
  function AccessGrid(x,y,definition)
    {
      var index = x*definition+y;
      return index;
    }

  function CreateWall(position, rotationX, rotationY, noiseDivisor, floorSize){
    const newGeom = new THREE.BufferGeometry();
    const noise = createNoise2D();
    const step = floorSize/floorDefinition;
    const indices = [];
    const vertices = [];
    const divisor = noiseDivisor;

    for(var i = 0; i < floorDefinition; i++){
      for(var j = 0; j < floorDefinition; j++){
        var pos = new THREE.Vector3(i*step,j*step,0);
        pos.x -= floorSize/2;
        pos.y -= floorSize/2;

        var noiseValue = noise(i/divisor,j/divisor);
        var height = (noiseValue + 1) /2;
        pos.z = height * 10;

        vertices.push(pos.x,pos.y,pos.z);

      }
    }

    for(var i = 0; i < floorDefinition - 1; i++){
      for(var j = 0; j < floorDefinition -1; j++){
        var Idx0=AccessGrid(i,j,floorDefinition);
        var Idx1=AccessGrid(i+1,j,floorDefinition);
        var Idx2=AccessGrid(i+1,j+1,floorDefinition);
        var Idx3=AccessGrid(i,j+1,floorDefinition);
        indices.push( Idx1, Idx0, Idx2);
        indices.push( Idx2, Idx0, Idx3);
        
      }
    } 

    const uv = [];
      for (let i = 0; i < floorDefinition; i++) {
        for (let j = 0; j < floorDefinition; j++) {
            uv.push(i / (floorDefinition - 1), j / (floorDefinition - 1));
        }
        }

    newGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));

    newGeom.setIndex(indices);
    newGeom.setAttribute('position', new THREE.Float32BufferAttribute( vertices, 3));
    newGeom.computeVertexNormals();
    newGeom.computeVertexNormals();

    const floorMat = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        map: this.texture,
        normalMap: this.normalTexture,
      });
      
    const floor = new THREE.Mesh(newGeom, floorMat);
    
    floor.position.copy(position);
    
    const euler = new THREE.Euler(rotationX,rotationY,0);
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    floor.quaternion.copy(quaternion);
    const terrainBody = GenerateTriMesh(floor, quaternion);
    scene.add(floor);
    physicsWorld.addBody(terrainBody);

    return {mesh: floor, body: terrainBody};
  }

  function GenerateTriMesh(mesh, quaternion){
    var vertices = mesh.geometry.attributes.position.array;
    var indices = mesh.geometry.index.array;

    var terrainTriMesh = new CANNON.Trimesh(vertices,indices);
    terrainBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: terrainTriMesh,
    })
    terrainBody.position.copy(mesh.position);
    terrainBody.quaternion.copy(quaternion);
    return terrainBody;
  }

  function CreateRoom(centrePoint, floorSize){
    const walls = [];
    //const floor = InitTerrain(new THREE.Vector3(centrePoint.x,centrePoint.y - floorSize/2,centrePoint.z), Math.PI / 2, 0, floorSize/5, floorSize);
    //const ceiling = InitTerrain(new THREE.Vector3(centrePoint.x,centrePoint.y + floorSize/2,centrePoint.z), Math.PI / 2, 0, floorSize/5,floorSize);
    
    var wall1 = CreateWall(new THREE.Vector3(centrePoint.x - floorSize/2, centrePoint.y,centrePoint.z), 
    0, Math.PI/2, floorSize/2,
    floorSize);
    
    var wall2 = CreateWall(new THREE.Vector3(centrePoint.x + floorSize/2, centrePoint.y,centrePoint.z), 
    0, Math.PI/2, floorSize/2,
    floorSize);
    
    var wall3 = CreateWall(new THREE.Vector3(centrePoint.x,centrePoint.y,centrePoint.z - floorSize/2), 
    0, 0, floorSize/2,
    floorSize);
    
    var wall4 = CreateWall(new THREE.Vector3(centrePoint.x,centrePoint.y,centrePoint.z + floorSize/2), 0, 0,
     floorSize/2,
     floorSize);

    walls.push(wall1,wall2,wall3,wall4);


    const room = {
      walls: walls.map(w => w.mesh),
      colliders: walls.map(w => w.body),
      //floor: floor,
      //ceiling: ceiling,
    }
    return room;
  }

  function UpdatePhysics(){
    for(var i = 0; i < rocks.length; i++){
      rocks[i].position.copy(rockBodies[i].position);
      rocks[i].quaternion.copy(rockBodies[i].quaternion);
    }
  }

  function CreateGrid(rows,columns, floorSize){
    for(let i = 0; i < rows; i++){
      for(let j = 0; j < columns; j++){
        const xPos = i * floorSize;
        const zPos = j * floorSize;
        CreateRoom(new THREE.Vector3(xPos,0, zPos), floorSize);
      }
    }
  }

  

  function RemoveWalls(room){
    room.walls.forEach((wall,index) => {
      scene.remove(wall);
      const collider = room.colliders[index];
      if(collider){
        physicsWorld.removeBody(collider);
      }
    });
  }

  export default TerrainGeneration;
  