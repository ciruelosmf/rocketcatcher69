// src/components/Skybox.tsx
"use client"; // Crucial for Next.js App Router to ensure client-side rendering

import React, { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface SkyboxProps {
  imageUrl: string;         // Make imageUrl mandatory for a skybox
 
}

const Skybox: React.FC<SkyboxProps> = ({
  imageUrl,
 
}) => {
  // useTexture will suspend the component until the texture is loaded.
  // It returns an array of textures, so we destructure the first one.
  
  
  const backgroundTexture = useTexture(imageUrl);
 




    // Background Sphere
    const sphereGeometry = useMemo(() => new THREE.SphereGeometry(500, 60, 40), []);
    sphereGeometry.scale(-1, 1, 1);


  return (
    <>
    











 
  
          <mesh geometry={sphereGeometry} material={new THREE.MeshBasicMaterial({ map: backgroundTexture })} rotation-y={Math.PI }/>
          </>
  );
};

export default Skybox;