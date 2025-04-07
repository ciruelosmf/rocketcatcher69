import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Flame = ({
  position = [0, 0, 0], // Position of the flame emitter (e.g., engine nozzle)
  particleCount = 500,  // Number of particles
  flameHeight = 5,      // How long the flame appears
  emitterRadius = 0.2,  // Width of the flame base
  particleSize = 0.15,   // Base size of each particle
  colorStart = new THREE.Color(0xffddaa), // Bright yellow/orange start
  colorEnd = new THREE.Color(0xff4400),   // Deeper orange/red end
  opacity = 0.8,
}) => {
  const pointsRef = useRef();
  const materialRef = useRef();

  // Store particle data (more efficient than state for per-frame updates)
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < particleCount; i++) {
      temp.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        age: 0,
        lifetime: 0,
      });
    }
    return temp;
  }, [particleCount]);

  // Geometry buffers
  const positions = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);
  const colors = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);

  // Function to reset a particle when it dies
  const resetParticle = (p) => {
    p.age = 0;
    // Lifetime determines how far down it goes roughly
    p.lifetime = Math.random() * 1.0 + 0.5; // Random lifetime between 0.5 and 1.5 seconds

    // Start position within the emitter radius
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * emitterRadius;
    p.position.set(
      position[0] + Math.cos(angle) * radius,
      position[1], // Start at the emitter Y
      position[2] + Math.sin(angle) * radius
    );

    // Initial velocity - mostly downwards, slight outward spread & randomness
    p.velocity.set(
      (Math.random() - 0.5) * 1.0,        // Sideways turbulence
      -(Math.random() * 1.5 + flameHeight / (p.lifetime)), // Strong downward velocity related to height/lifetime
      (Math.random() - 0.5) * 1.0
    );

    // Set initial color
    p.color.copy(colorStart);
  };

  // Initialize all particles
  useMemo(() => {
      particles.forEach(resetParticle);
      // Set initial buffer values (important!)
       particles.forEach((p, i) => {
           positions[i * 3 + 0] = p.position.x;
           positions[i * 3 + 1] = p.position.y;
           positions[i * 3 + 2] = p.position.z;
           colors[i * 3 + 0] = p.color.r;
           colors[i * 3 + 1] = p.color.g;
           colors[i * 3 + 2] = p.color.b;
       });
  }, [particles, position, flameHeight, emitterRadius, colorStart]); // Re-run if key params change

  useFrame((state, delta) => {
    if (!pointsRef.current || !pointsRef.current.geometry) return;

    const posAttribute = pointsRef.current.geometry.getAttribute('position');
    const colAttribute = pointsRef.current.geometry.getAttribute('color');

    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];
      p.age += delta;

      // If particle is dead, reset it
      if (p.age > p.lifetime) {
        resetParticle(p);
      }

      // Update position based on velocity
      p.position.addScaledVector(p.velocity, delta);

      // Add simple upward drift/turbulence simulation (optional, adjust multipliers)
      // p.velocity.y += delta * 0.5; // Counteract gravity slightly or simulate buoyant force
      p.position.x += Math.sin(p.age * 15 + i) * delta * 0.3; // Add some waving motion
      p.position.z += Math.cos(p.age * 15 + i) * delta * 0.3;

      // Update buffer position
      posAttribute.setXYZ(i, p.position.x, p.position.y, p.position.z);

      // Update color based on age (lerp from start to end color)
      const lifeRatio = p.age / p.lifetime;
      p.color.lerpColors(colorStart, colorEnd, lifeRatio);

      // Update buffer color
      colAttribute.setXYZ(i, p.color.r, p.color.g, p.color.b);
    }

    // Tell Three.js that the buffers have changed
    posAttribute.needsUpdate = true;
    colAttribute.needsUpdate = true;

    // Optional: you could fade the material's overall opacity over time too,
    // but fading individual particle colors often looks better.
    // materialRef.current.opacity = ...
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
          normalized={false} // Colors are 0.0 to 1.0
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        attach="material"
        size={particleSize}
        vertexColors={true}       // Use the color attribute from the geometry
        sizeAttenuation={true}    // Particles shrink with distance (perspective)
        transparent={true}
        opacity={opacity}         // Base overall opacity
        blending={THREE.AdditiveBlending} // Makes colors add up - good for bright glows like fire/plasma
        depthWrite={false}        // Prevents particles writing to depth buffer, helps with sorting artifacts
      />
    </points>
  );
};

export default Flame;