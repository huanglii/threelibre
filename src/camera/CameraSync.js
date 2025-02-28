/**
 * @author peterqliu / https://github.com/peterqliu
 * @author jscastro / https://github.com/jscastro76
 */
const THREE = require("../three.js");
const utils = require("../utils/utils.js");
const ThreeboxConstants = require("../utils/constants.js");

function CameraSync(map, camera, world) {
    //    console.log("CameraSync constructor");
    this.map = map;
    this.camera = camera;
    this.active = true;

    this.camera.matrixAutoUpdate = false; // We're in charge of the camera now!

    // Postion and configure the world group so we can scale it appropriately when the camera zooms
    this.world = world || new THREE.Group();
    this.world.position.x = this.world.position.y = ThreeboxConstants.WORLD_SIZE / 2
    this.world.matrixAutoUpdate = false;

    // set up basic camera state
    this.state = {
        translateCenter: new THREE.Matrix4().makeTranslation(ThreeboxConstants.WORLD_SIZE / 2, -ThreeboxConstants.WORLD_SIZE / 2, 0),
        worldSizeRatio: ThreeboxConstants.TILE_SIZE / ThreeboxConstants.WORLD_SIZE,
        worldSize: ThreeboxConstants.TILE_SIZE * this.map.transform.scale
    };

    // Listen for move events from the map and update the Three.js camera
    let _this = this; // keep the function on _this
    this.map.on('move', function () {
        _this.updateCamera();
    })
    this.map.on('resize', function () {
        _this.setupCamera();
    })

    this.setupCamera();
}

CameraSync.prototype = {
    setupCamera: function () {
        //console.log("setupCamera");
        const t = this.map.transform;
        this.camera.aspect = t.width / t.height; //bug fixed, if aspect is not reset raycast will fail on map resize
        this.camera.updateProjectionMatrix();

        this.state.cameraTranslateZ = new THREE.Matrix4().makeTranslation(0, 0, t.cameraToCenterDistance);
        this.updateCamera();
    },

    updateCamera: function (ev) {
        if (!this.camera) {
            console.log('nocamera')
            return;
        }

        const t = this.map.transform;
        const projectionMatrix = new THREE.Matrix4();
        projectionMatrix.elements = t.projectionMatrix;
        this.camera.projectionMatrix = projectionMatrix
        // Unlike the Mapbox GL JS camera, separate camera translation and rotation out into its world matrix
        // If this is applied directly to the projection matrix, it will work OK but break raycasting
        let cameraWorldMatrix = this.calcCameraMatrix(t.pitchInRadians, -t.bearingInRadians);
        this.camera.matrixWorld.copy(cameraWorldMatrix);

        let zoomPow = t.scale * this.state.worldSizeRatio;
        // Handle scaling and translation of objects in the map in the world's matrix transform, not the camera
        let scale = new THREE.Matrix4();
        let translateMap = new THREE.Matrix4();
        let rotateMap = new THREE.Matrix4();

        scale.makeScale(zoomPow, zoomPow, zoomPow);

        let x = t.cameraPosition[0];
        let y = t.cameraPosition[1];
        
        translateMap.makeTranslation(-x, y, 0);
        rotateMap.makeRotationZ(Math.PI);

        this.world.matrix = new THREE.Matrix4()
            .premultiply(rotateMap)
            .premultiply(this.state.translateCenter)
            .premultiply(scale)
            .premultiply(translateMap)

    },


    calcCameraMatrix(pitch, angle, trz) {
        const t = this.map.transform;
        const _pitch = (pitch === undefined) ? t.pitchInRadians : pitch;
        const _angle = (angle === undefined) ? -t.bearingInRadians : angle;
        const _trz = (trz === undefined) ? this.state.cameraTranslateZ : trz;

        return new THREE.Matrix4()
            .premultiply(_trz)
            .premultiply(new THREE.Matrix4().makeRotationX(_pitch))
            .premultiply(new THREE.Matrix4().makeRotationZ(_angle));
    }
}

module.exports = exports = CameraSync;