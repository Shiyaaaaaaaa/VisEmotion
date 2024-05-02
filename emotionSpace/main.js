import * as THREE from 'three';
import { color, depth, depthTexture, toneMapping, viewportSharedTexture, viewportMipTexture, viewportTopLeft, checker, uv, modelScale, MeshBasicNodeMaterial } from 'three/nodes';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import WebGPU from 'three/addons/capabilities/WebGPU.js';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer;
let mixer, clock;
let scrollPosition = 0;  // Add a global variable to keep track of scroll position
let textContent; // Add a global variable to hold the text content element


// This part is new
// Set initial obstacle level and inner pressure
let obstacleLevel = 2.5;
let innerPressure = 2.5;

// Add an initial emotion
let emotion = 'neutral';

init();

function init() {

    if ( WebGPU.isAvailable() === false ) {

        document.body.appendChild( WebGPU.getErrorMessage() );

        throw new Error( 'No WebGPU support' );

    }

    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.25, 25 );
    camera.position.set( 3, 2, 3 );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xD5E9D5 );// 初始背景颜色
    camera.lookAt( 0, 1, 0 );

    clock = new THREE.Clock();

    // model
    const loader = new GLTFLoader();
    loader.load( 'models/gltf/Michelle.glb', function ( gltf ) {

        const object = gltf.scene;
        mixer = new THREE.AnimationMixer( object );

        const action = mixer.clipAction( gltf.animations[ 0 ] );
        action.play();

        scene.add( object );

    } );

    // volume
    const depthDistance = depthTexture().distance( depth );
    const depthAlphaNode = depthDistance.oneMinus().smoothstep( .90, 2 ).mul( 20 ).saturate();
    const depthBlurred = viewportMipTexture().bicubic( depthDistance.smoothstep( 0, .6 ).mul( 40 * 5 ).clamp( 0, 5 ) );

    const blurredBlur = new MeshBasicNodeMaterial();
    blurredBlur.backdropNode = depthBlurred.add( depthAlphaNode.mix( color( 0x0066ff ), 0 ) );
    blurredBlur.transparent = true;
    blurredBlur.side = THREE.DoubleSide;

    const transparentMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true, // 设置材质为透明
        opacity: 0.1, // 设置透明度，1为完全不透明，0为完全透明
    });

    const transparentMaterialN = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true, 
        opacity: 0.5, 
    });

    const volumeMaterial = new MeshBasicNodeMaterial();
    volumeMaterial.colorNode = color( 0x0066ff );
    volumeMaterial.backdropNode = viewportSharedTexture();
    volumeMaterial.backdropAlphaNode = depthAlphaNode;
    volumeMaterial.transparent = true;
    volumeMaterial.side = THREE.DoubleSide;


    // box / floor

    // Modify box size according to the obstacle level and inner pressure
    const box = new THREE.Mesh( new THREE.BoxGeometry( obstacleLevel, 2, innerPressure ), transparentMaterialN );
    box.position.set( 0, 1, 0 );
    scene.add( box );

    const floor = new THREE.Mesh( new THREE.BoxGeometry( 2.49, .01, 2.49 ), new MeshBasicNodeMaterial( { color: 0xFFFFFF } ) );
    floor.position.set( 0, 0, 0 );
    scene.add( floor );

    // renderer    
    renderer = new WebGPURenderer();
    renderer.stencil = false;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( animate );
    renderer.toneMappingNode = toneMapping( THREE.LinearToneMapping, .15 );
    document.body.appendChild( renderer.domElement );

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.target.set( 0, 1, 0 );
    controls.update();

    window.addEventListener( 'resize', onWindowResize );

    // gui
    const materials = {
        'blurred': blurredBlur,
        'transparent': transparentMaterial 
    };

    const gui = new GUI();

    // Add dropdown for emotion
    gui.add({ emotion: emotion }, 'emotion', ['positive', 'neutral', 'negative']).name("Emotion Category").onChange(value => {
        emotion = value;
        let colorValue;
        switch(emotion) {
            case 'positive':
                //colorValue = 0xffa500; // orange
                //scene.background = new THREE.Color(0xF9A663);
                updateBackgroundColor(0.5); // 每次改变情绪时重置情绪强度为0.5
                box.material = transparentMaterial; // Change to a material that represents 'positive'
                break;
            case 'neutral':
                //colorValue = 0xd3d3d3; // grey
                updateBackgroundColor(0.5); 
                box.material = transparentMaterialN; 
                break;
            case 'negative':
                //colorValue = 0x333333; // black
                //scene.background = new THREE.Color(0xADD8E6);
                updateBackgroundColor(0.5); 
                box.material = blurredBlur; 
                break;
        }
        scene.background.set(colorValue);
    });

    // Add sliders for obstacle level and inner pressure
    gui.add({ intensity: 0.5 }, 'intensity', 0, 1, 0.01).name("Low ← Emotion Intensity → High").onChange(value => {
        updateBackgroundColor(value);
    });
    gui.add({ level: innerPressure }, 'level', 0, 5, 0.01).name("Low ← Obstacle Level → High").onChange(value => {
        obstacleLevel = value;
        box.scale.z = obstacleLevel*2/5;
    });

    gui.add({ pressure: obstacleLevel }, 'pressure', 0, 5, 0.01).name("Low ← Inner Pressure → High").onChange(value => {
        innerPressure = value;
        box.scale.x = innerPressure*2/5
    });

    
    function updateBackgroundColor(intensity) {
        let baseColor;
        let newColor;
        switch(emotion) {
            case 'positive':
                baseColor = new THREE.Color(0xFFB732); // orange
                newColor = baseColor.lerp(new THREE.Color(0xFFFFFF), 1 - intensity);
                break;
            case 'neutral':
                baseColor = new THREE.Color(0xD5E9D5); // green
                newColor = baseColor.lerp(new THREE.Color(0xFFFFFF), 1 - intensity);
                break;
            case 'negative':
                baseColor = new THREE.Color(0xADD8E6); // light blue
                newColor = baseColor.lerp(new THREE.Color(0x000000), intensity);
                break;
        }

        scene.background = newColor;
    }



    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    }

    //修改控制板尺寸
    // 在页面加载完成后执行
    window.onload = function() {
    // 获取GUI元素
    const guiElement = document.querySelector('.lil-gui');
  
    // 如果元素存在，就修改其样式
    if (guiElement) {
      guiElement.style.width = '25%';  // 控制面板的宽度
    }
  
    // 获取所有的数值输入框元素和选项输入框元素
    const controllers = document.querySelectorAll('.lil-gui .controller');
  
    // 遍历所有元素，修改它们的样式
    controllers.forEach(function(controller) {
      controller.style.width = '100%';  // 数值输入框和选项输入框的宽度
    });
  
    // 获取所有的内部元素和滑块元素
    const widgets = document.querySelectorAll('.lil-gui .widget, .lil-gui .slider');
  
    // 遍历所有元素，修改它们的样式
    widgets.forEach(function(widget) {
      widget.style.width = '100%';  // 内部元素和滑块的宽度
    });
  }
  

/*改变的是camera.position.z（相机的z位置）控制菜单打开和关闭*/
/*使用OrbitControls来操作一个Three.js场景中的相机时，实际上是在改变相机的位置以围绕一个固定的点（默认为场景的原点，也就是(0, 0, 0)坐标）旋转。
    具体来说，这是通过改变相机的极坐标（即距离、方位角和仰角）来完成的。*/
 /*对于极坐标，想象一个球体，其中中心点为原点，相机在球体的表面上移动。方位角（azimuthal angle）决定了相机在水平平面上（x-y平面）的位置
    而仰角（polar angle）则决定了相机在垂直平面上（y-z平面或x-z平面）的位置。
    使用OrbitControls来旋转相机，实际上是在改变相机的方位角（azimuthal angle）和极角（polar angle）以在一个球体（即轨道）上移动相机。
    这个球体的中心就是场景的中心（默认为原点）。因此，当围绕一个物体旋转相机时，实际上是在围绕这个物体的轨道上移动相机。
    即使鼠标动作主要在屏幕的水平方向（通常对应于相机的Y轴旋转），由于是在球面上移动，相机的Z坐标也会有所变化。
    因此，即使只是“旋转模型”，也就是在屏幕上拖动鼠标来改变相机的方位角和/或仰角，实际上也会改变相机的三维位置（x, y, z）。
    因为相机在球体表面上的运动会导致它的所有三个坐标（x、y和z）改变。*/
/*更具体地说，当使用鼠标滚轮或者触摸手势进行缩放的时候，OrbitControls 会改变相机的 position，使其在其当前的轨道上更接近或者更远离其围绕的点。这个行为也就改变了相机的 position.z。
    相似地，当旋转模型的时候，OrbitControls 会在相机的当前轨道上移动相机，这也会改变其 position 属性。
    但是因为你的轨道是围绕原点的，所以即使相机的 position.z 改变了，它与原点的距离（camera.position.length())没有变化*/

  controls.minDistance = 1;  // 允许相机最近到目标的距离
  controls.maxDistance = 10; // 允许相机最远离目标的距离

  function checkAndUpdateMenu() {
    // 检查相机位置是否改变
    let cameraChanged = previousCameraZ !== null && camera.position.z !== previousCameraZ;
    previousCameraZ = camera.position.z;
    
    /*检查三个条件
    1. 相机的 z 坐标是否小于 1。（相机打开菜单的条件）
    2. 页面的 body 元素是否不包含 'manual-open' 这个类。（是否打开菜单）
    3. 是否不应该忽略相机的位置，或者相机的位置是否已经改变。（相机打开之后忽视相机位置否则点关闭会再次打开）
    */
   
    if (camera.position.z < 3 && !document.body.classList.contains('manual-open') && (!ignoreCamera || cameraChanged)) {
      document.body.classList.add('manual-open');
      openedBy = 'camera';
      ignoreCamera = false;  // 当相机位置改变时，我们不再忽略它的位置
    } else if (camera.position.z >= 3 && document.body.classList.contains('manual-open') && openedBy === 'camera') {
      document.body.classList.remove('manual-open');
      openedBy = null;
    }
  }
  
  function animate() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
  
    checkAndUpdateMenu();
  
    renderer.render(scene, camera);
  }
}

