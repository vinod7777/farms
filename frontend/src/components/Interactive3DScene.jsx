import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sky, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function CameraAnimation() {
  const { camera } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    // Initial Camera Position
    camera.position.set(0, 10, 30);
    camera.rotation.set(-0.2, 0, 0);

    const clock = new THREE.Clock();
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#landing-content",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5, // Smooth scrubbing
      }
    });

    // We have a very long page now, so we add more waypoints
    // Section 1: Dive down towards the trees
    tl.to(camera.position, { z: 15, y: 5, ease: "power2.inOut" }, 0)
      .to(camera.rotation, { x: -0.1, ease: "power2.inOut" }, 0);

    // Section 2: Fly forward over the farm (Pillars)
    tl.to(camera.position, { z: -5, y: 3, ease: "power1.inOut" }, 0.2)
      .to(camera.rotation, { x: 0, y: 0.1, ease: "power1.inOut" }, 0.2);

    // Section 3: Pan to the right and descend (Procedures)
    tl.to(camera.position, { z: -10, x: 8, y: 2, ease: "power2.inOut" }, 0.4)
      .to(camera.rotation, { x: 0.1, y: 0.4, ease: "power2.inOut" }, 0.4);

    // Section 4: Pan up to the sky and clouds (Features)
    tl.to(camera.position, { z: -15, x: 0, y: 12, ease: "power2.inOut" }, 0.6)
      .to(camera.rotation, { x: 0.2, y: -0.2, ease: "power2.inOut" }, 0.6);

    // Section 5: Fly through the clouds (Network & Values)
    tl.to(camera.position, { z: -25, y: 18, x: -5, ease: "power1.inOut" }, 0.8)
      .to(camera.rotation, { x: 0.3, y: -0.5, ease: "power1.inOut" }, 0.8);

    // Section 6: Final overview looking down (Contact / Footer)
    tl.to(camera.position, { z: -30, y: 25, x: 0, ease: "power3.out" }, 1)
      .to(camera.rotation, { x: -0.4, y: 0.1, ease: "power3.out" }, 1);

    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      tl.kill();
    };
  }, [camera]);

  // Mouse Parallax effect
  useFrame(() => {
    camera.position.x += (mouseRef.current.x * 2 - camera.position.x) * 0.05;
  });

  return null;
}

// Low-poly Tree Component
function Tree({ position, scale = 1, rotation = [0,0,0] }) {
  return (
    <group position={position} scale={scale} rotation={rotation}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.4, 2, 6]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      
      {/* Leaves */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
        <group position={[0, 2.5, 0]}>
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <icosahedronGeometry args={[1.5, 0]} />
            <meshStandardMaterial color="#4ade80" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0.8, 0.5, 0.5]} castShadow receiveShadow scale={0.8}>
            <icosahedronGeometry args={[1.2, 0]} />
            <meshStandardMaterial color="#22c55e" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[-0.8, 0.2, -0.5]} castShadow receiveShadow scale={0.9}>
            <icosahedronGeometry args={[1.3, 0]} />
            <meshStandardMaterial color="#16a34a" roughness={0.8} flatShading />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

// Procedural Farm Environment
function FarmEnvironment() {
  const trees = useMemo(() => {
    const temp = [];
    // Generate random trees around the map, denser further back
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      // Keep clear path in the middle for camera
      if (Math.abs(x) < 5 && Math.abs(z) < 25) continue;
      
      const scale = 0.5 + Math.random() * 1.5;
      const rotationY = Math.random() * Math.PI;
      temp.push({ id: i, position: [x, 0, z], scale, rotation: [0, rotationY, 0] });
    }
    return temp;
  }, []);

  return (
    <group>
      {/* Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[150, 150, 32, 32]} />
        <meshStandardMaterial color="#14532d" roughness={1} />
      </mesh>

      {/* Path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
        <planeGeometry args={[8, 120]} />
        <meshStandardMaterial color="#78350f" roughness={1} />
      </mesh>

      {/* Render Trees */}
      {trees.map((tree) => (
        <Tree key={tree.id} position={tree.position} scale={tree.scale} rotation={tree.rotation} />
      ))}

      {/* Farm House / Barn (Abstract) */}
      <group position={[-12, 0, -5]} rotation={[0, Math.PI / 3, 0]}>
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[6, 4, 8]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <coneGeometry args={[5, 3, 4]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
      
      {/* Second Barn */}
      <group position={[15, 0, -15]} rotation={[0, -Math.PI / 6, 0]}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 3, 6]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
        <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
          <coneGeometry args={[3.5, 2, 4]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
    </group>
  );
}

// Procedural Clouds
function Clouds() {
  return (
    <group position={[0, 20, -20]}>
      <Float speed={1} floatIntensity={2} rotationIntensity={0.1}>
        <mesh position={[-15, 0, 10]} scale={[3, 2, 2]}>
          <icosahedronGeometry args={[2, 0]} />
          <meshStandardMaterial color="white" flatShading opacity={0.8} transparent />
        </mesh>
        <mesh position={[-10, 2, 15]} scale={[2, 2, 2]}>
          <icosahedronGeometry args={[2, 0]} />
          <meshStandardMaterial color="white" flatShading opacity={0.8} transparent />
        </mesh>
      </Float>
      
      <Float speed={1.5} floatIntensity={1} rotationIntensity={0.2}>
        <mesh position={[20, 8, -10]} scale={[4, 2.5, 2.5]}>
          <icosahedronGeometry args={[2, 0]} />
          <meshStandardMaterial color="white" flatShading opacity={0.8} transparent />
        </mesh>
        <mesh position={[-5, 5, -25]} scale={[5, 3, 3]}>
          <icosahedronGeometry args={[2, 0]} />
          <meshStandardMaterial color="white" flatShading opacity={0.6} transparent />
        </mesh>
      </Float>
    </group>
  );
}

export default function Interactive3DScene() {
  return (
    <Canvas shadows camera={{ fov: 45 }}>
      <color attach="background" args={['#e0f2fe']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 20, 10]} 
        castShadow 
        intensity={1.5} 
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.5} color="#38bdf8" />
      
      <Sky distance={450000} sunPosition={[10, 20, 10]} inclination={0} azimuth={0.25} />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="park" />
      
      <FarmEnvironment />
      <Clouds />
      
      <CameraAnimation />
      
      {/* Add some mist/fog for depth */}
      <fog attach="fog" args={['#e0f2fe', 10, 60]} />
    </Canvas>
  );
}
