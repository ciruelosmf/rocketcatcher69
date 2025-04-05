"use client"

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// --- Constants ---
// Scene
const PLATFORM_Y = -6.5;
const SCENE_BOUNDS_BOTTOM = -8;

// Rocket Physics & Control
const ROCKET_START_Y = 6;
const ROCKET_FALL_ACCELERATION = 0.3; // Gravity effect (units/sec^2) - Start with simple speed first
const ROCKET_BASE_FALL_SPEED = 0.1; // Initial downward speed (units/sec)
const ROCKET_MAX_FALL_SPEED = 3.0; // Terminal velocity (units/sec)
const ROCKET_HORIZONTAL_THRUST = 2.5; // How much force/acceleration sideways (units/sec^2)
const ROCKET_MAX_HORIZONTAL_SPEED = 2.0; // Max sideways speed (units/sec)
const ROCKET_DRAG = 0.2; // Simple linear drag/friction factor (slows horizontal speed)

// Rocket Animation
const ROCKET_TILT_ANGLE = Math.PI / 12; // Max tilt angle (radians) - slightly more tilt
const ROCKET_TILT_SPEED = 6; // How quickly the rocket tilts (higher is faster)

// Controls
const LEFT_KEY = 'ArrowLeft';
const RIGHT_KEY = 'ArrowRight';
// Add UP_KEY for potential main thruster later
// const UP_KEY = 'ArrowUp';

/**
 * Represents the landing platform.
 */
const LandingPlatform = () => {
  return (
    <mesh position={[0, PLATFORM_Y, 0]} receiveShadow> {/* Allow platform to receive shadows */}
      <boxGeometry args={[4, 0.2, 2]} />
      <meshStandardMaterial color="grey" />
    </mesh>
  );
};

/**
 * Represents the falling rocket with tilting controls and movement.
 */
const FallingRocket = () => {
  const rocketRef = useRef<THREE.Mesh>(null!);
  // State for physics
  const velocity = useRef(new THREE.Vector3(0, -ROCKET_BASE_FALL_SPEED, 0)); // Use a ref for velocity Vector3
  // State to track which directional keys are currently pressed
  const [activeTilt, setActiveTilt] = useState<'left' | 'right' | 'none'>('none');

  // --- Keyboard Event Handling ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === LEFT_KEY) {
        setActiveTilt('left');
      } else if (event.key === RIGHT_KEY) {
        setActiveTilt('right');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === LEFT_KEY && activeTilt === 'left') {
        setActiveTilt('none');
      } else if (event.key === RIGHT_KEY && activeTilt === 'right') {
        setActiveTilt('none');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTilt]); // Dependency array ensures listeners are correctly updated

  // --- Frame Update Logic ---
  useFrame((_state, delta) => {
    if (!rocketRef.current) return;

    // Clamp delta to prevent physics explosions on frame drops/tab resume
    const dt = Math.min(delta, 0.05); // Clamp delta to max 50ms (equiv. 20fps)

    // 1. Calculate Forces/Acceleration for this frame
    let horizontalAcceleration = 0;
    if (activeTilt === 'left') {
      horizontalAcceleration = -ROCKET_HORIZONTAL_THRUST; // Apply thrust to the left
    } else if (activeTilt === 'right') {
      horizontalAcceleration = ROCKET_HORIZONTAL_THRUST; // Apply thrust to the right
    }

    // Apply simple gravity (constant acceleration downwards)
    const verticalAcceleration = -ROCKET_FALL_ACCELERATION; // Acting downwards

    // 2. Update Velocity
    // Horizontal velocity update with thrust and drag
    velocity.current.x += horizontalAcceleration * dt;
    // Apply drag only when not actively thrusting in that direction or always? Let's apply always for simplicity.
    velocity.current.x *= (1 - ROCKET_DRAG * dt); // Linear drag approximation

    // Vertical velocity update
    velocity.current.y += verticalAcceleration * dt;

    // 3. Clamp Velocity (Apply Limits)
    velocity.current.x = THREE.MathUtils.clamp(velocity.current.x, -ROCKET_MAX_HORIZONTAL_SPEED, ROCKET_MAX_HORIZONTAL_SPEED);
    velocity.current.y = Math.max(velocity.current.y, -ROCKET_MAX_FALL_SPEED); // Clamp max downward speed

    // 4. Update Position based on Velocity
    rocketRef.current.position.x += velocity.current.x * dt;
    rocketRef.current.position.y += velocity.current.y * dt;
    // rocketRef.current.position.z remains 0 (or update if needed later)

    // 5. Handle Tilting Animation (based on active input, not velocity directly for responsiveness)
    let targetRotationZ = 0;
    if (activeTilt === 'left') {
        // Optional: Could scale tilt slightly based on horizontal velocity?
        // const tiltScale = Math.abs(velocity.current.x) / ROCKET_MAX_HORIZONTAL_SPEED;
        targetRotationZ = ROCKET_TILT_ANGLE; // * tiltScale;
    } else if (activeTilt === 'right') {
        // const tiltScale = Math.abs(velocity.current.x) / ROCKET_MAX_HORIZONTAL_SPEED;
        targetRotationZ = -ROCKET_TILT_ANGLE; // * tiltScale;
    }
    // Smoothly interpolate rotation
    rocketRef.current.rotation.z = THREE.MathUtils.lerp(
      rocketRef.current.rotation.z,
      targetRotationZ,
      dt * ROCKET_TILT_SPEED
    );

    // --- Reset Logic ---
    if (rocketRef.current.position.y < SCENE_BOUNDS_BOTTOM) {
        // Reset position
        rocketRef.current.position.y = ROCKET_START_Y;
        rocketRef.current.position.x = (Math.random() - 0.5) * 4; // Random horizontal start
        // Reset physics state
        velocity.current.set(0, -ROCKET_BASE_FALL_SPEED, 0); // Reset velocity
        // Reset visual state
        rocketRef.current.rotation.z = 0;
        setActiveTilt('none');
    }
  });

  return (
    // Make rocket cast shadows
    <mesh ref={rocketRef} position={[0, ROCKET_START_Y, 0]} castShadow>
      {/* Geometry offset needed? Only if you want pivot at the absolute bottom */}
      <boxGeometry args={[0.5, 1.5, 0.5]} />
      <meshStandardMaterial color="red" emissive="darkred" />
    </mesh>
  );
};


/**
 * Main scene component
 */
const RocketLandingScene = () => {
  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: '#101020' }}
      orthographic
      camera={{
        position: [0, 0, 15],
        zoom: 55,
        near: 0.1,
        far: 1000
      }}
      shadows // Enable shadows globally for the canvas
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      {/* Configure directional light for shadows */}
      <directionalLight
        position={[5, 10, 8]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024} // Increase shadow map resolution
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />


      <Suspense fallback={null}>
        <LandingPlatform />
        <FallingRocket />
      </Suspense>

      <OrbitControls enableRotate={true} enablePan={true} enableZoom={true} />
    </Canvas>
  );
};

export default RocketLandingScene;