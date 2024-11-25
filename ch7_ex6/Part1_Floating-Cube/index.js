import * as THREE from 'three';
    // global scene values
var btn, gl, glCanvas, camera, scene, renderer, cube;

// global xr value
var xrSession = null;

loadScene();
init();

function loadScene() {
    // setup WebGL
    glCanvas = document.createElement('canvas');
    gl = glCanvas.getContext('webgl', { antialias: true });
    
    // setup Three.js scene
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        1000
    );



    scene = new THREE.Scene();

    var light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
				light.position.set( 0.5, 1, 0.25 );
                light.castShadow = true; // **Schatten für das Licht aktivieren**
                scene.add( light );

    var geometry = new THREE.BoxBufferGeometry(0.2, 0.2, 0.2);
    var material = new THREE.MeshPhongMaterial({color: 0x89CFF0});
    cube = new THREE.Mesh( geometry, material );
    cube.position.y = 0.2;
    cube.castShadow = true; // **Wirft Schatten**
    scene.add( cube );

    // setup Three.js WebGL renderer
    renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        context: gl
    });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    // Renderer Schatten aktivieren
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Optionale Einstellung für weichere Schatten
    renderer.xr.enabled = true;
    document.body.appendChild( renderer.domElement );
}
// Directional Light hinzufügen
var dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(3, 5, 2); // Position über der Szene
dirLight.castShadow = true;    // Schatten aktivieren

// Konfiguriere den Schattenwurf des Lichts
dirLight.shadow.mapSize.width = 1024; // Auflösung des Schattenmaps
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;    // Nahe Grenze des Schattens
dirLight.shadow.camera.far = 50;      // Entfernte Grenze des Schattens
dirLight.shadow.camera.left = -5;     // Grenzen für den Schattenbereich
dirLight.shadow.camera.right = 5;
dirLight.shadow.camera.top = 5;
dirLight.shadow.camera.bottom = -5;

scene.add(dirLight);

// Boden hinzufügen
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);

// Bodenrotation und Position
plane.rotation.x = -Math.PI / 2; // Flach auf den Boden legen
plane.position.y = 0;           // Boden auf y=0 setzen
plane.receiveShadow = true;     // Schatten empfangen

scene.add(plane);


/*

// Konfiguriere den Schattenwurf des Lichts
light.shadow.mapSize.width = 1024; // Auflösung des Schattenmaps (je höher, desto detaillierter)
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.5; // Nahe Grenze für den Schatten
light.shadow.camera.far = 50;  // Entfernte Grenze für den Schatten

// **Boden hinzufügen (empfängt Schatten)**
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Flach auf den Boden legen
plane.position.y = -1; // Unterhalb des Objekts
plane.receiveShadow = true; // **Empfängt Schatten**
scene.add(plane);

*/
function init() {
        navigator.xr.isSessionSupported('immersive-ar')
            .then((supported) => {
                if (supported) {
                    btn = document.createElement("button");
                    btn.addEventListener('click', onRequestSession);
                    btn.innerHTML = "Enter XR";
                    var header = document.querySelector("header");
                    header.appendChild(btn);
                }
                else {
                    navigator.xr.isSessionSupported('inline')
                        .then((supported) => {
                            if (supported) {
                                console.log('inline session supported')
                            }
                            else {console.log('inline not supported')};
                        })
                }
            })
            .catch((reason) => {
                console.log('WebXR not supported: ' + reason);
            });
}

function onRequestSession() {
    console.log("requesting session");
    navigator.xr.requestSession('immersive-ar', {requiredFeatures: ['viewer', 'local']})
        .then(onSessionStarted)
        .catch((reason) => {
            console.log('request disabled: ' + reason);
        });
}

function onSessionStarted(session) {
    console.log('starting session');
    btn.removeEventListener('click', onRequestSession);
    btn.addEventListener('click', endXRSession);
    btn.innerHTML = "STOP AR";
    xrSession = session;
    xrSession.addEventListener("end", onSessionEnd);
    setupWebGLLayer()
        .then(()=> {
            renderer.xr.setReferenceSpaceType('local');
            renderer.xr.setSession(xrSession);
            animate();
        })
}

function setupWebGLLayer() {
    return gl.makeXRCompatible().then(() => {
        xrSession.updateRenderState( {baseLayer: new XRWebGLLayer(xrSession, gl) });
    });
}




function animate() {
    renderer.setAnimationLoop(render);
}

function render(time) {
    if (!xrSession) {
        renderer.clear(true, true, true);
        return;
    } else {
        time *= 0.001;
        cube.translateY(0.2 * Math.sin(time) / 100);
        cube.rotateY(Math.PI / 180);
        renderer.render(scene, camera);
        //renderer.render(scene, camera);
    }
}

function endXRSession() {
    if (xrSession) {
        console.log('ending session...');
        xrSession.end().then(onSessionEnd);
    }
}

function onSessionEnd() {
    xrSession = null;
    console.log('session ended');
    btn.innerHTML = "START AR";
    btn.removeEventListener('click', endXRSession);
    btn.addEventListener('click', onRequestSession);
}