import * as THREE from 'three';
// global scene values
var btn, gl, glCanvas, camera, scene, renderer;
var controller, reticle;

// global xr value
var xrSession = null;
var xrViewerPose;
var hitTestSource = null;
var hitTestSourceRequested = false;

loadScene();

function loadScene() {
    // setup WebGL
    glCanvas = document.createElement('canvas');
    gl = glCanvas.getContext('webgl', { antialias: true });

    // setup Three.js scene
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    scene = new THREE.Scene();
    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // setup Three.js WebGL renderer
    renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        context: gl
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    var geometry = new THREE.CylinderBufferGeometry(0.1, 0.1, 0.2, 32).translate(0, 0.1, 0);

    function onSelect() {
        console.log("on select fired...");
        var material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random() });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.applyMatrix4(reticle.matrix);
        mesh.scale.y = Math.random() * 2 + 1;
        scene.add(mesh);
    }

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    reticle = new THREE.Mesh(
        new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: "#00FF00" })
    );

    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
    
    // Begin AR query
    navigator.xr.isSessionSupported('immersive-ar')
        .then((arSupported) => {
            if (arSupported) {
                const arBtn = document.createElement("button");
                arBtn.innerHTML = "Enter AR";
                arBtn.addEventListener('click', () => onRequestSession('immersive-ar'));
                document.querySelector("#button-container").appendChild(arBtn);
            }
        });

    navigator.xr.isSessionSupported('immersive-vr')
        .then((vrSupported) => {
            if (vrSupported) {
                const vrBtn = document.createElement("button");
                vrBtn.innerHTML = "Enter VR";
                vrBtn.addEventListener('click', () => onRequestSession('immersive-vr'));
                document.querySelector("#button-container").appendChild(vrBtn);
            }
        })
        .catch((reason) => {
            console.log('WebXR not supported: ' + reason);
        });
}

function onRequestSession(mode) {
    console.log(`requesting ${mode} session`);
    const options = mode === 'immersive-ar' 
        ? { requiredFeatures: ['hit-test'], optionalFeatures: ['local-floor'] }
        : {};

    navigator.xr.requestSession(mode, options)
        .then((session) => onSessionStarted(session, mode))
        .catch((reason) => {
            console.log(`request for ${mode} disabled: ${reason}`);
        });
}

function onSessionStarted(session, mode) {
    console.log(`starting ${mode} session`);

    const container = document.querySelector("#button-container");
    if (container) {
        container.style.display = "none"; 
    } else {
        console.log("Button container not found.");
    }

    xrSession = session;
    xrSession.addEventListener("end", () => onSessionEnd(mode));

    setupWebGLLayer()
        .then(() => {
            renderer.xr.setReferenceSpaceType('local');
            renderer.xr.setSession(xrSession);
            animate();
        });
}

function setupWebGLLayer() {
    return gl.makeXRCompatible().then(() => {
        xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });
    });
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(time, frame) {
    if (frame) {
        var referenceSpace = renderer.xr.getReferenceSpace('local');
        var session = frame.session;
        xrViewerPose = frame.getViewerPose(referenceSpace);
        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace("viewer").then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace })
                    .then((source) => {
                        hitTestSource = source;
                    });
            });

            session.addEventListener("end", () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });
        }

        if (hitTestSource) {
            var hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                var hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
            } else {
                reticle.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
}

function endXRSession() {
    if (xrSession) {
        xrSession.end()
            .then(() => {
                xrSession.ended = true;
                onSessionEnd();
            })
            .catch((reason) => {
                console.log('Session not ended because ' + reason);
                onSessionEnd();
            });
    } else {
        onSessionEnd();
    }
}

function onSessionEnd(mode) {
    console.log(`${mode} session ended`);
    xrSession = null;

    const container = document.querySelector("#button-container");
    if (container) {
        container.style.display = "flex";  
    } else {
        console.log("Button container not found.");
    }
}
