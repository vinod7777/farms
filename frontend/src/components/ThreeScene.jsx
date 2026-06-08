import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';

function Tree() {
  const treeRef = useRef();

  useFrame((state, delta) => {
    if (treeRef.current) {
      treeRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group ref={treeRef} position={[0, -1.5, 0]}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.4, 2, 8]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      
      {/* Leaves (multiple overlapping spheres for low-poly look) */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group position={[0, 2.5, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <icosahedronGeometry args={[1.2, 1]} />
            <meshStandardMaterial color="#4ade80" roughness={0.6} flatShading />
          </mesh>
          <mesh position={[0.8, 0.5, 0.5]} castShadow>
            <icosahedronGeometry args={[0.8, 1]} />
            <meshStandardMaterial color="#22c55e" roughness={0.6} flatShading />
          </mesh>
          <mesh position={[-0.8, 0.2, -0.5]} castShadow>
            <icosahedronGeometry args={[0.9, 1]} />
            <meshStandardMaterial color="#16a34a" roughness={0.6} flatShading />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

export default function ThreeScene() {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas shadows camera={{ position: [0, 2, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 5, 5]} 
          castShadow 
          intensity={1.5} 
          shadow-mapSize={1024}
        />
        <Environment preset="forest" />
        <Tree />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
