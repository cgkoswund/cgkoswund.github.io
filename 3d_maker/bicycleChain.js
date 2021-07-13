import * as THREE from './three.module.js';
import { leftGearPoints,rightGearPoints,GearGenerator } from "./GearGenerator.js";
import { OrbitControls } from './OrbitControls.js';
import { Curve, TetrahedronGeometry } from "./three.module.js";


let camera;
let rearTeethCount = 42;
let rearTeethSet = [30,25,20,15,10,5];
let paddleTeethCount = 100;

function main(rearTeethSetArray,frontTeethSetArray){

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
renderer.setClearColor(0xffffff);
renderer.shadowMap.enabled = true;

camera = new THREE.PerspectiveCamera( 40, (0.78* window.innerWidth) / window.innerHeight, 0.1, 1000 );
camera.position.set( - 1.1, 1.9, 20.5 );
camera.position.set(-1, 2, 1.5).multiplyScalar(4);
camera.lookAt(1.8,3.5,2);


const scene = new THREE.Scene();

{
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0,20,0);
    scene.add(light);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    const d = 50;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.bias = 0.001;
}

{
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1,2,4);
    scene.add(light);
}

// const groundGeometry = new THREE.PlaneBufferGeometry(50, 50);
// const groundMaterial = new THREE.MeshPhongMaterial({color: 0xCC8866});
// const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
// groundMesh.rotation.x = Math.PI * -.5;
// groundMesh.receiveShadow = true;
// scene.add(groundMesh);

const carWidth = GearGenerator.carWidth
const carHeight = GearGenerator.carHeight;
const carLength = GearGenerator.carLength;

const chainLink = new THREE.Object3D();
scene.add(chainLink);

const bodyGeometry = new THREE.BoxBufferGeometry(carWidth, carHeight, carLength);
const bodyMaterial = new THREE.MeshStandardMaterial(
    {color: 0x777070,metalness:0,roughness:0.1}
);
const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
bodyMesh.position.y = 0;
// bodyMesh.position.y = 1.4;
bodyMesh.castShadow = true;
chainLink.add(bodyMesh);

const wheelRadius = GearGenerator.wheelRadius;
const wheelThickness = GearGenerator.wheelThickness;
const wheelSegments = GearGenerator.wheelSegments;
const wheelGeometry = new THREE.CylinderBufferGeometry(
    wheelRadius, //top rad
    wheelRadius, //bottom rad
    wheelThickness,
    wheelSegments

);
const wheelMaterial = new THREE.MeshStandardMaterial(
    {color: 0x666060,metalness:0,roughness:0.1}
);
const wheelPositions = [
    [-carWidth/2 - wheelThickness/2, - 0*carHeight/2, 0],
    [carWidth/2 + wheelThickness/2, - 0*carHeight/2, 0],
];

/*const wheelMeshes =*/ wheelPositions.map((position) => {
    let mesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
    mesh.position.set(...position);
    mesh.rotation.z = Math.PI/2;
    mesh.castShadow =  true;
    bodyMesh.add(mesh);
    return mesh;
});

// let leftGearTeeth = GearGenerator.leftTeethCount;
// let rightGearTeeth = GearGenerator.rightTeethCount;
let leftGearTeeth = rearTeethCount;
let rightGearTeeth = paddleTeethCount;
// let radiusL = GearGenerator.radius(leftGearTeeth);//RL
let radiusL = GearGenerator.radius(rearTeethSetArray[0]);//RL
let radiusR = GearGenerator.radius(frontTeethSetArray[0]);//Rr

let sprocketCentreHeight = Math.max(radiusL,radiusR)+wheelRadius*1.5;
const sprocketCentreInterval= GearGenerator.sprocketCentreInterval;  //d

let shape = new THREE.Shape();

//small gear (Left) from circle
let gearParams = [];

let extrudeSettings;
let geometry;
let material;
let mesh;
for(let j = 0;j < rearTeethSetArray.length; j++){ 
    gearParams = [];   
    shape = new THREE.Shape();
    gearParams=leftGearPoints(rearTeethSetArray[j],0,0,0,sprocketCentreHeight);

    shape.moveTo(gearParams[0][2],gearParams[0][3]);

    for (let i = 1; i < gearParams.length; i++){
        shape.quadraticCurveTo(
            ...gearParams[i]
            );
    }
    


extrudeSettings = GearGenerator.extrudeSettings;

geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
material = new THREE.MeshStandardMaterial( { color: 0x848080,roughness:0.05, metalness: 0} );
mesh = null;
mesh = new THREE.Mesh( geometry, material ) ;
mesh.position.z = -carWidth/4 + j*GearGenerator.rearSprocketZSpacing;
scene.add( mesh );
}//end of rear sprocket set for loop
//test large gear (Right) from circle
shape = new THREE.Shape();
gearParams = [];
gearParams=rightGearPoints(frontTeethSetArray[0],0,0,0,sprocketCentreHeight);
shape.moveTo(gearParams[0][2],gearParams[0][3]);

for (let i = 1; i < gearParams.length; i++){
    shape.quadraticCurveTo(
        ...gearParams[i]
        );
}

geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
mesh = new THREE.Mesh( geometry, material ) ;
mesh.position.z = -carWidth/4-GearGenerator.rightSprocketCentreZOffset;
scene.add( mesh );

let noOfLinks = GearGenerator.noOfLinks;
let linkMeshes = [];

for(let i = 0; i<noOfLinks;i++){
    linkMeshes.push(chainLink.clone());
    scene.add(linkMeshes[i]);
}

bodyMesh.position.y = 200;
const arrayGenPoint = [];

const aMax = Math.atan((radiusR-radiusL)/sprocketCentreInterval);
const curveResolution = 15;//number of curve "handles"
let interval = (Math.PI-2*aMax)/(curveResolution/2); //angle interval for arcs during spline generation
let aRanger = aMax;
let chainTheta = 0;
let xPoint = 0;
let yPoint = 0;

////chain points
//smaller sprocker half points
for (let i = 0; i < (curveResolution/2); i++){
    
    chainTheta = Math.PI/2 + aRanger + interval*i;
    xPoint = radiusL*Math.cos(chainTheta);
    yPoint = -1 * radiusL*Math.sin(chainTheta) - sprocketCentreHeight;

    arrayGenPoint.push(new THREE.Vector3(xPoint,0,yPoint));//append
}

chainTheta = 0;
interval = (Math.PI+2*aMax)/(curveResolution/2); 
aRanger = Math.PI/2 - aMax;

//larger sprocker half points
for (let j = 0; j < (curveResolution/2); j++){
    chainTheta = Math.PI + aRanger + interval*(j);
    xPoint = sprocketCentreInterval + radiusR*Math.cos(chainTheta);
    yPoint = -1*radiusR*Math.sin(chainTheta) - sprocketCentreHeight;

    arrayGenPoint.push(new THREE.Vector3(xPoint,0-GearGenerator.rightSprocketCentreZOffset,yPoint));//append
}

arrayGenPoint.push(arrayGenPoint[0]);//append

const chainCurve = new THREE.CatmullRomCurve3(arrayGenPoint);

const chainPoints = chainCurve.getPoints(curveResolution);
const chainGeometry = new THREE.BufferGeometry().setFromPoints(chainPoints);
const chainMaterial = new THREE.LineBasicMaterial({color:0xff0000});
const chainSplineObject =  new THREE.Line(chainGeometry, chainMaterial);
chainSplineObject.rotation.x = Math.PI * .5;
chainSplineObject.position.y = 0.05;
// scene.add(chainSplineObject);

////Resize canvas according to window size
function resizeRendererToDisplaySize(renderer){
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const needResize = canvas.width !== width || canvas.height !== height;
    if(needResize){
        renderer.setSize(width*2.2, height*2.2, false);
    }
    return needResize
}


function render(time) {
        
    time *= 0.001;

    if(resizeRendererToDisplaySize(renderer)){
        const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
    }


    let tankXPosition = new THREE.Vector3();
    let tankXTarget = new THREE.Vector3();

    //move tank
    for(let k = 0;k<noOfLinks;k++){
    let tankXTime = ((time + k*0.15) * .05);
    chainCurve.getPointAt(tankXTime % 1, tankXPosition);
    chainCurve.getPointAt((tankXTime + 0.01) % 1, tankXTarget);
    linkMeshes[k].position.set(tankXPosition.x, tankXPosition.z * -1, tankXPosition.y);
    chainLink.rotation.x=Math.PI;
    linkMeshes[k].lookAt(tankXTarget.x, tankXTarget.z *-1, tankXTarget.y);
    }
    
    // const controls = new OrbitControls( camera, renderer.domElement );
    // controls.addEventListener( 'change', render ); // use if there is no animation loop
    // controls.minDistance = 2;
    // controls.maxDistance = 1000;
    // controls.target.set( 0.1, 0.1, 0.2 );
    // controls.update();

    renderer.render(scene, camera);

    requestAnimationFrame(render);
    }

    requestAnimationFrame(render);



}

// main(42,105);
// main();

function getTeethCount(rearTeethCount,paddleTeethCount){

    //remove "None" strings, change to number
    let rearTeethCorrected = [];
    let frontTeethCorrected = [];
    for(let i=0;i<rearTeethCount.length;i++){
        if(rearTeethCount[i]=="None"){}
        else{
             rearTeethCorrected.push(parseInt(rearTeethCount[i]));
        }
    }
    for(let i=0;i<paddleTeethCount.length;i++){
        if(paddleTeethCount[i]=="None"){}
        else{
            frontTeethCorrected.push(parseInt(paddleTeethCount[i]));
        }
    }

    // console.log(rearTeethCorrected);
    // console.log(frontTeethCorrected);


    main(rearTeethCorrected,frontTeethCorrected);



}

// getTeethCount(45,100);

window.getTeethCount = getTeethCount;