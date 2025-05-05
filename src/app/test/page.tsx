/*


"use client"; // Required for Next.js App Router components using hooks

import React, { Suspense, useMemo, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useProgress, Center, Text3D } from '@react-three/drei';
import { useLoader, useFrame } from '@react-three/fiber'
import * as THREE from 'three';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

// --- Simple Loading Indicator ---
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'white', fontSize: '1.5em' }}>
        Loading: {progress.toFixed(0)}%
      </div>
    </Html>
  );
}



const SimpleParticleSystem = ({ count = 5000, shape = 'box', size = 0.05 }) => {
  const pointsRef = useRef();
  const bufferRef = useRef();

  // Create initial particle data only once
  const particles = useMemo(() => {
    const temp = [];
    const velocities = [];
    const lifetimes = [];
    const initialPositions = new Float32Array(count * 3);

    const spawnRadius = 3; // How far particles can spawn from the center
    const maxLifetime = 5; // Max seconds a particle lives
    const initialSpeed = 0.5; // Base speed factor

    for (let i = 0; i < count; i++) {
      let x, y, z;

      // Initial Positions (randomly within a shape)
      if (shape === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = Math.random() * spawnRadius;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else { // Default to 'box'
        x = (Math.random() - 0.5) * spawnRadius * 2;
        y = (Math.random() - 0.5) * spawnRadius * 2;
        z = (Math.random() - 0.5) * spawnRadius * 2;
      }

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      // Initial Velocities (random direction)
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * initialSpeed,
          (Math.random() - 0.5) * initialSpeed,
          (Math.random() - 0.5) * initialSpeed
        )
      );

      // Initial Lifetimes
      lifetimes.push(Math.random() * maxLifetime);
    }

    return { positions: initialPositions, velocities, lifetimes, spawnRadius, maxLifetime };
  }, [count, shape]); // Recalculate if count or shape changes

  // Update particles each frame
  useFrame((state, delta) => {
    if (!bufferRef.current || !pointsRef.current) return;

    const positions = bufferRef.current.array;
    const { velocities, lifetimes, spawnRadius, maxLifetime } = particles;

    for (let i = 0; i < count; i++) {
      lifetimes[i] -= delta;

      // If lifetime expired, reset particle
      if (lifetimes[i] <= 0) {
        // Reset position (randomly within spawn shape again)
         if (shape === 'sphere') {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = Math.random() * spawnRadius * 0.1; // Spawn closer to center after reset
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
          } else { // Default to 'box'
            positions[i * 3] = (Math.random() - 0.5) * spawnRadius * 0.2;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spawnRadius * 0.2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spawnRadius * 0.2;
          }

        // Reset lifetime
        lifetimes[i] = Math.random() * maxLifetime;

        // Optional: Reset velocity slightly if needed
        // velocities[i].set(...)

      } else {
        // Update position based on velocity
        positions[i * 3] += velocities[i].x * delta;
        positions[i * 3 + 1] += velocities[i].y * delta;
        positions[i * 3 + 2] += velocities[i].z * delta;

        // Optional: Add some simple force (e.g., gravity or drag)
         // velocities[i].y -= 0.1 * delta; // Simple gravity example
         // velocities[i].multiplyScalar(0.99); // Simple drag
      }
    }

    // Tell Three.js that the position attribute needs updating
    bufferRef.current.needsUpdate = true;

    // Optional: Rotate the whole system slowly
    // pointsRef.current.rotation.y += delta * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        
        
        <bufferAttribute
          ref={bufferRef}
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
          usage={THREE.DynamicDrawUsage} // Important for updates
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color="#5786F5" // Example blue color
        sizeAttenuation={true} // Points get smaller further away
        transparent={true}
        opacity={0.3}
        blending={THREE.AdditiveBlending} // Nice glowy effect
        depthWrite={false} // Prevents particles sorting issues when transparent
      />
    </points>
  );
};

 











function wrapTextByChars(text, maxCharsPerLine) {
  if (!text) return '';
  const words = text.split(' ');
  let lines = [];
  let currentLine = '';

  for (const word of words) {
    // Check if adding the next word (plus a space) exceeds the limit
    if (currentLine.length === 0) {
        // If the word itself is longer than the limit, force break it (or handle differently)
         if (word.length > maxCharsPerLine) {
            // Simple forced break:
            let remainingWord = word;
            while (remainingWord.length > 0) {
                if (currentLine.length > 0) lines.push(currentLine); // Push previous partial line if any
                const chunk = remainingWord.substring(0, maxCharsPerLine);
                currentLine = chunk;
                remainingWord = remainingWord.substring(maxCharsPerLine);
            }
             lines.push(currentLine); // Push the last chunk
             currentLine = ''; // Reset for next word

         } else {
            currentLine = word; // Start line with this word
         }

    } else if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += ' ' + word; // Add word to current line
    } else {
      // Push the completed line and start a new one
      lines.push(currentLine);
      currentLine = word; // Start new line with this word (handle very long words if needed)
       // If the word itself is too long for a new line handle it here too
       if (word.length > maxCharsPerLine) {
            // This logic might need refinement based on desired breaking behavior for single long words
            lines.pop(); // remove the word we just added as currentLine
            let remainingWord = word;
            while (remainingWord.length > 0) {
                const chunk = remainingWord.substring(0, maxCharsPerLine);
                lines.push(chunk); // Push chunks as separate lines
                remainingWord = remainingWord.substring(maxCharsPerLine);
            }
            currentLine = ''; // Word was fully processed
       }
    }
  }

  // Add the last remaining line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Join lines with newline characters, which Text3D understands
  return lines.join('\n');
}


// --- Updated Component for 3D Text ---
function DynamicText({
  textContent,
  maxChars = 20, // *** New prop: Max characters per line ***
  // maxWidth is now less relevant if using maxChars, but can keep for safety/fallback
  lineHeight = 1,
  fontSize = 0.6,
  position = [-4, 1.5, 0],
  font = "/fonts/helvetiker_regular.typeface.json",
  ...props
}) {
  const textRef = useRef();

  // *** Wrap the text using the helper function ***
  const wrappedText = useMemo(
    () => wrapTextByChars(textContent, maxChars),
    [textContent, maxChars] // Recalculate only when text or limit changes
  );

  const displayText = wrappedText || ' '; // Use the wrapped text

 

  return (
    <group   {...props}>
      <Text3D
        ref={textRef}
        font={font}
        size={fontSize}
        height={0.15}
        curveSegments={12}
        bevelEnabled
        bevelThickness={0.02}
        bevelSize={0.02}
        lineHeight={lineHeight}
        // Remove or ignore maxWidth if relying solely on maxChars wrapping
        // maxWidth={maxWidth}
         
      >
        {displayText}  
        <meshStandardMaterial color="aqua" emissive="darkblue" emissiveIntensity={0.5} />
      </Text3D>
    </group>
  );
}














// --- Main Test Page Component ---
export default function ModelTestPage() {
  const modelUrl = '/booster_obj_1.obj'; // Make sure this path is correct!

  // --- State for the text input ---
  const [inputText, setInputText] = useState('Hello Three.js!'); // Initial text

  return (
    // Use position: relative on the main container to allow absolute positioning of the input
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#111' }}>

   
      <div style={{
          position: 'absolute', // Position over the canvas
          top: '20px',          // Adjust position as needed
          left: '20px',
          zIndex: 10,           // Ensure it's above the canvas
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
          borderRadius: '5px',
          color: 'white'
       }}>
        <label htmlFor="sceneText" style={{ marginRight: '10px' }}>Scene Text:</label>
        <input
          type="text"
          id="sceneText"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)} // Update state on change
          style={{ padding: '5px' }}
        />
      </div>
 
      <Canvas
        shadows
        camera={{ position: [2, 3, 8], fov: 50 }}
      >
        
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 7]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />


     Floor 

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#333" side={THREE.DoubleSide}/>
        </mesh>

 


   
        <Suspense fallback={<Loader />}>
        
          <Center>
            
          </Center>



          
<SimpleParticleSystem count={1000} size={0.04} shape="sphere" rotation={[0, -1, 10]}/>

           
           <DynamicText textContent={inputText} position={[10, 2, 10]}  />
    

        </Suspense>

       
        <OrbitControls />
      </Canvas>
    </div>
  );
} 


*/