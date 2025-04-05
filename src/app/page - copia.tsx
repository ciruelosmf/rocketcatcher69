"use client"
"use client"

import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text3D, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const Cube = () => {
  const cubeRef = React.useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += 0.01;
      cubeRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={cubeRef} position={[0, 0, 0]}>
      <boxGeometry args={[2, 1, 1]} />
      <meshBasicMaterial color="green" />
    </mesh>
  );
};

const ThreeJSFiberScene = () => {
  return (
    <Canvas style={{ width: '100vw', height: '100vh' }} camera={{ position: [0, 0, 5], fov: 75 }}>
      <color attach="background" args={['#dcdcdc']} />
      <ambientLight />
      <Suspense fallback={null}>
        <Cube />
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={1.1}
          height={1.2}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.05}
          position={[-2, 1, 0]}
        >
          Hello, ThreeJaaaaaaaaaaaS!
          <meshBasicMaterial color="red" />
        </Text3D>

        <RoundedBox
  args={[2,  2, 0.2]} // Width, height, depth. Default is [1, 1, 1]
  radius={0.05} // Radius of the rounded corners. Default is 0.05
  smoothness={4} // The number of curve segments. Default is 4
  bevelSegments={4} // The number of bevel segments. Default is 4, setting it to 0 removes the bevel, as a result the texture is applied to the whole geometry.
  creaseAngle={0.4} // Smooth normals everywhere except faces that meet at an angle greater than the crease angle
  position={[0, -2, 0]}
>
  <meshPhongMaterial color="#f3f3f3" wireframe />
</RoundedBox>

      </Suspense>
      <OrbitControls />
    </Canvas>
  );
};

export default ThreeJSFiberScene;
