import * as THREE from 'three';

const container = document.getElementById('three-canvas-container');
if (container) {
  // 1. Setup Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b130e, 0.035);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 8, 16);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 2. Add Lights
  const ambientLight = new THREE.AmbientLight(0x0e2615, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x4ade80, 1.2);
  dirLight.position.set(10, 15, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 40;
  const d = 10;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // 3. Create Terrain (Low poly ground)
  const groundGroup = new THREE.Group();
  scene.add(groundGroup);

  const groundGeo = new THREE.PlaneGeometry(30, 30, 16, 16);
  // Distort vertices to make low-poly terrain waves
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    // don't distort boundaries too much
    if (Math.abs(x) < 14 && Math.abs(y) < 14) {
      const z = Math.sin(x * 0.4) * Math.cos(y * 0.4) * 0.6 + Math.sin(x * 0.1) * 0.4;
      posAttr.setZ(i, z);
    }
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0f1c12,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  groundGroup.add(ground);

  // 4. Create Trees (scattered)
  const treeTrunkGeo = new THREE.CylinderGeometry(0.1, 0.2, 1.5, 5);
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x2c1d11, roughness: 0.9 });

  const leavesGeo = new THREE.ConeGeometry(0.8, 1.8, 5);
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6, flatShading: true });
  const leavesMatAlt = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.6, flatShading: true });

  const numTrees = 25;
  for (let i = 0; i < numTrees; i++) {
    const tree = new THREE.Group();
    
    // Position on terrain
    const tx = (Math.random() - 0.5) * 18;
    const tz = (Math.random() - 0.5) * 18;
    
    // Simple math approximation of height
    const ty = Math.sin(tx * 0.4) * Math.cos(tz * 0.4) * 0.6 + Math.sin(tx * 0.1) * 0.4;
    
    tree.position.set(tx, ty - 0.1, tz);

    // Trunk
    const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Leaves
    const mat = Math.random() > 0.4 ? leavesMat : leavesMatAlt;
    const leaves1 = new THREE.Mesh(leavesGeo, mat);
    leaves1.position.y = 1.8;
    leaves1.castShadow = true;
    tree.add(leaves1);

    const leaves2 = new THREE.Mesh(leavesGeo, mat);
    leaves2.position.y = 2.4;
    leaves2.scale.set(0.7, 0.7, 0.7);
    leaves2.castShadow = true;
    tree.add(leaves2);

    // Randomize scaling slightly
    const scale = 0.7 + Math.random() * 0.6;
    tree.scale.set(scale, scale, scale);

    groundGroup.add(tree);
  }

  // 5. Floating Dust Particles
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 100;
  const posArray = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    posArray[i] = (Math.random() - 0.5) * 25; // X
    posArray[i + 1] = Math.random() * 6 + 1; // Y
    posArray[i + 2] = (Math.random() - 0.5) * 25; // Z
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  
  // Custom round particle texture using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(16, 185, 129, 1)');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 16);
  
  const particleTexture = new THREE.CanvasTexture(canvas);

  const particleMat = new THREE.PointsMaterial({
    size: 0.15,
    map: particleTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // 6. Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Rotate the ground slow
    groundGroup.rotation.y = elapsedTime * 0.03;

    // Gentle camera sway
    camera.position.x = Math.sin(elapsedTime * 0.1) * 2;
    camera.position.z = 16 + Math.cos(elapsedTime * 0.1) * 2;
    camera.lookAt(0, 1, 0);

    // Animate particles
    const positions = particles.geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
      // Move Y up
      positions[i] += Math.sin(elapsedTime + i) * 0.002 + 0.002;
      if (positions[i] > 7) {
        positions[i] = 1;
      }
    }
    particles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();

  // 7. Handle Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
