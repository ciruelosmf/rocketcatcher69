"use client"; // Required for Next.js App Router components using hooks

import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls,  Html, useProgress, Center } from '@react-three/drei';
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three';
 
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
// --- Simple Loading Indicator ---
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'white', fontSize: '1.5em' }}>
        Loading Model: {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

// --- Component to Load and Display the Model ---
function Model({ url }: { url: string }) {
  // Ref for the loaded object group
  const modelRef = useRef<THREE.Group>(null!);

  // Load the OBJ file
 
  const obj = useLoader(OBJLoader, url)
  // Optional: Basic Scaling (adjust if your model is too big or small)
  // Start with 1, 1, 1 and modify if needed.
  const scale = useMemo(() => new THREE.Vector3(0.006, 0.006, 0.006), []);

  // Optional: Apply basic material & enable shadows after loading
  useEffect(() => {
    if (!obj) return;

    const material = new THREE.MeshStandardMaterial({
        color: 0xffc52c, // Light grey
        metalness: 0.5,
        roughness: 0.6,
    });

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true; // Allow receiving shadows on itself
        child.material = material; // Apply a default material
      }
    });
    console.log("obj")
  }, [obj]);

  // Render the loaded object using <primitive>
  // <primitive> is used for existing Three.js objects
  return (
    <primitive
      ref={modelRef}
      object={obj}
      scale={scale}
      // Position/rotation are often handled by parent (<Center> here) or manually
    />
  );
}


// --- Main Test Page Component ---
export default function ModelTestPage() {
  const modelUrl = '/booster_obj_1.obj'; // Make sure this path is correct!
 
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#333' }}>
      <Canvas
        shadows // Enable shadows in the renderer
        camera={{ position: [2, 2, 5], fov: 50 }} // Set initial camera position & FOV
      >
        {/* Basic Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 10, 7]} // Position the light source
          intensity={1.0}
          castShadow // Make this light cast shadows
          shadow-mapSize-width={1024} // Shadow map quality
          shadow-mapSize-height={1024}
        />
        {/* Optional: Add a floor plane to receive shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#444" side={THREE.DoubleSide}/>
        </mesh>


        {/* Use Suspense to handle loading state */}
        <Suspense fallback={<Loader />}>
          {/* Center the model automatically */}
          <Center>
             <Model url={modelUrl} />
          </Center>
        </Suspense>

        {/* Controls to interact with the scene */}
        <OrbitControls />
      </Canvas>
    </div>
  );
}