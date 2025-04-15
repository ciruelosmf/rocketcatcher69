"use client"

import React, { Suspense, useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Text, View, PerspectiveCamera, useProgress  } from '@react-three/drei';
import * as THREE from 'three';
import AxesHelperComponent from './AxesHelperComponent';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody, CollisionPayload } from '@react-three/rapier'; // Import types

import Flame from './FlameComponent'; // Import the Flame component
 
 


import { useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

// --- Constants ---
// Scene
const PLATFORM_Y = -16.5;
const FLOOR_HEIGHT = 0.5; // Define floor height
const FLOOR_TOP_Y = PLATFORM_Y + FLOOR_HEIGHT / 2; // Calculate top surface Y of the floor
const SCENE_BOUNDS_BOTTOM = -25; // Lowered bounds slightly

// Landing Platform Dimensions & Position
const PLATFORM_WIDTH = 1; // Narrow tower platform
const PLATFORM_DEPTH = 1; // Narrow tower platform
const PLATFORM_HEIGHT = 14.5; // Tall tower
const PLATFORM_CENTER_X = 0; // Centered platform X
const PLATFORM_CENTER_Z = 0; // Centered platform Z
// PLATFORM_TOP_Y is the Y coordinate of the very top surface of the platform structure
const PLATFORM_TOP_Y = PLATFORM_Y + PLATFORM_HEIGHT; // Result: -16.5 + 14.5 = -2.0

// --- Capture Zone Definition ---
// This defines the target *volume* where the rocket needs to be for a successful catch
const CAPTURE_ZONE_WIDTH = 1.0; // Must be within this horizontal width (centered)
const CAPTURE_ZONE_DEPTH = 1.0; // Must be within this horizontal depth (centered)
// CAPTURE_TARGET_Y is the *ideal* Y coordinate for the ROCKET'S CENTER during capture.
// Let's align it with the top of the platform structure for now.
const CAPTURE_TARGET_Y = PLATFORM_TOP_Y; // Target Y = -2.0
// CAPTURE_VERTICAL_TOLERANCE allows the rocket center to be slightly above/below the target Y
const CAPTURE_VERTICAL_TOLERANCE = 1.0; // Rocket center can be from -2.5 to -1.5
// Min/Max Y coordinates for the rocket's CENTER to be in the zone
const CAPTURE_ZONE_MIN_Y =   -9.0  // CAPTURE_TARGET_Y - CAPTURE_VERTICAL_TOLERANCE;  -2.5
const CAPTURE_ZONE_MAX_Y = -2.8 ; // -1.5



// --- Capture Time ---
const REQUIRED_CAPTURE_TIME = 2.1; // Seconds required inside the zone


// Rocket Physics & Control
const ROCKET_START_Y = 31;
const ROCKET_START_XZ_RANGE = 8;
const ROCKET_HEIGHT = 7.1;
const ROCKET_WIDTH = 0.5;
const ROCKET_BASE_OFFSET = ROCKET_HEIGHT / 2; // Distance from center to base (3.0)
const ROCKET_CENTER_TO_TOP = ROCKET_HEIGHT / 2; // Distance from center to top (3.0)




// Landing Criteria (Existing - will be adapted later)
const MAX_LANDING_SPEED_VERTICAL = 0.5; // Max vertical speed for safe landing (units/sec)
const MAX_LANDING_TILT_RADIANS = Math.PI / 18; // Approx 10 degrees max tilt allowed
// Add Horizontal speed check constant (will be used later)
const MAX_LANDING_SPEED_HORIZONTAL = 0.2; // Placeholder+



// Vertical Physics (Y-Axis)
const ROCKET_FALL_ACCELERATION = 0.5;
const ROCKET_MAIN_THRUST = 0.9;
 
 
const ROCKET_DRAG_VERTICAL = 0.05;

// Horizontal Plane Physics (XZ-Axis)
const ROCKET_MANEUVER_THRUST = 2.0;
 
const ROCKET_DRAG_XZ = 0.35;

// Rocket Animation
const ROCKET_TILT_ANGLE_Z = Math.PI / 14;
const ROCKET_TILT_ANGLE_X = Math.PI / 14;
const ROCKET_ROTATION_SPEED = 0.4;

// Controls
const LEFT_KEY = 'ArrowLeft';
const RIGHT_KEY = 'ArrowRight';
const UP_KEY = 'ArrowUp';
const DOWN_KEY = 'ArrowDown';
const THRUST_KEY = ' ';
const RESET_KEY = 'r';

const ROCKET_MESH_NAME = "playerRocket"; // Name for the rocket mesh
const COCKPIT_CAMERA_NAME = "cockpitCamera";
 


// Game States
type GameState = 'playing' | 'landed' | 'crashed' | 'resetting';



// Vertical Physics (Y-Axis) - Using FORCE now
const EFFECTIVE_GRAVITY_MAGNITUDE = Math.abs(-9.81 * 0.8 * 1.5); // Calculated from worldGravity * gravityScale (approx 11.77)
const THRUST_ACCELERATION_FACTOR = 0.6; // How much stronger than gravity is the thrust? (e.g., 1.0 = hover, 1.5 = 50% more force) - **TUNE THIS**
const ROCKET_THRUST_FORCE = EFFECTIVE_GRAVITY_MAGNITUDE * THRUST_ACCELERATION_FACTOR; // Total upward force when thrusting
// const ROCKET_FALL_ACCELERATION = 0.5; // Less relevant now, gravity handles fall
// const ROCKET_MAIN_THRUST = 0.9; // REMOVE or repurpose this (old impulse value)
const ROCKET_MAX_FALL_SPEED = 1.0; // Keep for clamping if desired
const ROCKET_MAX_RISE_SPEED = 1.1; // Keep for clamping if desired
const ROCKET_VERTICAL_DAMPING = 1.1; // Damping factor specifically for vertical - **TUNE THIS** (Value for RigidBody prop)

// Horizontal Plane Physics (XZ-Axis) - Using FORCE now
const ROCKET_MANEUVER_FORCE = 6.0; // Force applied for maneuvering - **TUNE THIS**
// const ROCKET_MANEUVER_THRUST = 2.0; // REMOVE or repurpose (old impulse value)
const ROCKET_MAX_XZ_SPEED = 2.0; // Keep for clamping if desired
const ROCKET_XZ_DAMPING = 1.2; // Damping factor for horizontal - **TUNE THIS** (Value for RigidBody prop)

// Combined Damping for RigidBody prop (Start with similar values, might need adjustment)
const ROCKET_LINEAR_DAMPING = 51.0005; // **TUNE THIS** - Applies to X, Y, Z

// Wind
const WIND_FORCE_SCALE = 5.0; // Adjust scale for force application - **TUNE THIS**
 
const THRUST_INCREMENT = 0.05; // How much additional thrust is added per second
const MAX_THRUST_FACTOR = 1.1; // Maximum thrust can reach 150% of gravity
const MIN_THRUST_FACTOR = THRUST_ACCELERATION_FACTOR; // Minimum is the base factor

// In your FallingRocket component, add a ref to track current thrust level






















// Wind
const WIND_MAX_STRENGTH = 0.001; // 0 orginal
const getRandomWindVector = (): THREE.Vector3 => {
    const angle = Math.random() * Math.PI * 2;
    const strength = Math.random() * WIND_MAX_STRENGTH;
    const windX = Math.cos(angle) * strength;
    const windZ = Math.sin(angle) * strength;
    return new THREE.Vector3(windX, 0, windZ);
}

 

// --- Components ---

/**
 * Landing Floor Component (Physics Enabled)
 */
const LandingFloor = () => {
  // Collider dimensions are half-extents (width/2, height/2, depth/2)
  const floorColliderArgs: [number, number, number] = [32, FLOOR_HEIGHT / 2, 32];

  return (
    // RigidBody is fixed, position matches the visual mesh center
    <RigidBody type="fixed" position={[0, PLATFORM_Y, 0]} colliders={false} userData={{ type: 'floor' }}>
      <CuboidCollider args={floorColliderArgs} />
      <mesh receiveShadow name="floor">
        {/* Geometry matches collider FULL size */}
        <boxGeometry args={[64, FLOOR_HEIGHT, 64]} />
        <meshStandardMaterial color="#613d36" metalness={4.8} roughness={2.3} />
      </mesh>
    </RigidBody>
  );
};














/**
 * Landing Platform Component (Tall Tower Structure - Physics Enabled)
 */
const LandingPlatform = () => {
  const platformCenterY = PLATFORM_Y + PLATFORM_HEIGHT / 2;
  const platformPosition: [number, number, number] = [PLATFORM_CENTER_X, platformCenterY, PLATFORM_CENTER_Z];
  // Collider dimensions are half-extents
  const platformColliderArgs: [number, number, number] = [PLATFORM_WIDTH / 2, PLATFORM_HEIGHT / 2, PLATFORM_DEPTH / 2];

  return (
    <RigidBody
      type="fixed"
      position={platformPosition}
      colliders={false} // We define our own collider
      userData={{ type: 'platform_tower' }} // Identify this body
    >
      {/* Define the physical shape */}
      <CuboidCollider args={platformColliderArgs} />

      {/* The visual mesh - its position is handled by the RigidBody */}
      <mesh
        receiveShadow
        name="platform"
        // UserData on mesh is less critical now, but can keep for other logic
        userData={{
            isLandingPlatform: true,
            width: PLATFORM_WIDTH,
            depth: PLATFORM_DEPTH,
            height: PLATFORM_HEIGHT,
            topY: PLATFORM_TOP_Y,
            minX: PLATFORM_CENTER_X - PLATFORM_WIDTH / 2,
            maxX: PLATFORM_CENTER_X + PLATFORM_WIDTH / 2,
            minZ: PLATFORM_CENTER_Z - PLATFORM_DEPTH / 2,
            maxZ: PLATFORM_CENTER_Z + PLATFORM_DEPTH / 2,
        }}
      >
        <boxGeometry args={[PLATFORM_WIDTH, PLATFORM_HEIGHT, PLATFORM_DEPTH]} />
        <meshStandardMaterial color="darkblue" metalness={0.8} roughness={1.0}/>
      </mesh>
    </RigidBody>
  );
};




// --- PlatformArm1 ---
// --- PlatformArm1 (Refactored) ---
const PlatformArm1 = ({
  isDeployingArms = false,
  // Pass rotation values, ensure parent component memoizes if needed
  initialRotation = { x: 0, y: Math.PI / -12, z: 0 },
  deployedRotation = { x: 0, y: 0, z: Math.PI / 3 }
}) => {
  const armApi = useRef<RapierRigidBody>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);

  const armSize: [number, number, number] = [3, 0.4, 0.2];
  const armColliderArgs: [number, number, number] = [armSize[0] / 2, armSize[1] / 2, armSize[2] / 2];
  const platformPosition: [number, number, number] = [PLATFORM_CENTER_X - 2, -3, PLATFORM_CENTER_Z - 0.9];

  // Memoize the Euler objects if props might change identity but not value
  // Note: If the parent guarantees stable object refs (e.g., via useMemo/useState),
  // this internal useMemo might be slightly redundant but adds safety.
  const targetInitialEuler = useMemo(() => new THREE.Euler(initialRotation.x, initialRotation.y, initialRotation.z, 'XYZ'), [initialRotation]);
  const targetDeployedEuler = useMemo(() => new THREE.Euler(deployedRotation.x, deployedRotation.y, deployedRotation.z, 'XYZ'), [deployedRotation]);

  useFrame((state, delta) => {
    if (armApi.current) {
      // Determine the target Euler DIRECTLY based on the prop
      const targetEuler = isDeployingArms ? targetDeployedEuler : targetInitialEuler;

      // Convert target Euler to Quaternion
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      // Get current physics rotation
      const currentQuat = armApi.current.rotation();

      // Interpolate using Slerp
      const step = delta * 4.0; // Adjust interpolation speed
      const interpolatedQuat = new THREE.Quaternion()
        .copy(currentQuat)
        .slerp(targetQuat, step);

      // Set the NEXT kinematic rotation
      armApi.current.setNextKinematicRotation(interpolatedQuat);
    }
  });

  // Set the initial physics rotation ONLY ONCE when the RigidBody mounts
  // Note: The 'rotation' prop on RigidBody handles the initial setting.
  const initialEulerForRigidBody = useMemo(() => new THREE.Euler(initialRotation.x, initialRotation.y, initialRotation.z, 'XYZ'), [initialRotation]);


  return (
    <RigidBody
      ref={armApi}
      type="kinematicPosition"
      position={platformPosition}
      rotation={initialEulerForRigidBody} // Use the memoized initial Euler here
      colliders={false}
      userData={{ type: 'arm', id: 'arm1' }}
    >
      <CuboidCollider args={armColliderArgs} />
      <mesh
        ref={meshRef}
        receiveShadow
        name="platformArm1"
      >
        <boxGeometry args={armSize} />
        <meshStandardMaterial color="darkblue" metalness={0.8} roughness={0.3}/>
      </mesh>
    </RigidBody>
  );
};

// Apply the EXACT SAME refactoring logic to PlatformArm2
// --- PlatformArm1 (Refactored) ---
const PlatformArm2 = ({
  isDeployingArms = false,
  // Pass rotation values, ensure parent component memoizes if needed
  initialRotation = { x: 0, y: Math.PI / 12, z: 0 },
  deployedRotation = { x: 0, y: 0, z: Math.PI / 3 }
}) => {
  const armApi = useRef<RapierRigidBody>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);

  const armSize: [number, number, number] = [3, 0.4, 0.2];
  const armColliderArgs: [number, number, number] = [armSize[0] / 2, armSize[1] / 2, armSize[2] / 2];
  const platformPosition: [number, number, number] = [PLATFORM_CENTER_X - 2, -3, PLATFORM_CENTER_Z + 0.9];

  // Memoize the Euler objects if props might change identity but not value
  // Note: If the parent guarantees stable object refs (e.g., via useMemo/useState),
  // this internal useMemo might be slightly redundant but adds safety.
  const targetInitialEuler = useMemo(() => new THREE.Euler(initialRotation.x, initialRotation.y, initialRotation.z, 'XYZ'), [initialRotation]);
  const targetDeployedEuler = useMemo(() => new THREE.Euler(deployedRotation.x, deployedRotation.y, deployedRotation.z, 'XYZ'), [deployedRotation]);

  useFrame((state, delta) => {
    if (armApi.current) {
      // Determine the target Euler DIRECTLY based on the prop
      const targetEuler = isDeployingArms ? targetDeployedEuler : targetInitialEuler;

      // Convert target Euler to Quaternion
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      // Get current physics rotation
      const currentQuat = armApi.current.rotation();

      // Interpolate using Slerp
      const step = delta * 4.0; // Adjust interpolation speed
      const interpolatedQuat = new THREE.Quaternion()
        .copy(currentQuat)
        .slerp(targetQuat, step);

      // Set the NEXT kinematic rotation
      armApi.current.setNextKinematicRotation(interpolatedQuat);
    }
  });

  // Set the initial physics rotation ONLY ONCE when the RigidBody mounts
  // Note: The 'rotation' prop on RigidBody handles the initial setting.
  const initialEulerForRigidBody = useMemo(() => new THREE.Euler(initialRotation.x, initialRotation.y, initialRotation.z, 'XYZ'), [initialRotation]);


  return (
    <RigidBody
      ref={armApi}
      type="kinematicPosition"
      position={platformPosition}
      rotation={initialEulerForRigidBody} // Use the memoized initial Euler here
      colliders={false}
      userData={{ type: 'arm', id: 'arm1' }}
    >
      <CuboidCollider args={armColliderArgs} />
      <mesh
        ref={meshRef}
        receiveShadow
        name="platformArm1"
      >
        <boxGeometry args={armSize} />
        <meshStandardMaterial color="darkblue" metalness={0.8} roughness={0.3}/>
      </mesh>
    </RigidBody>
  );
};

// Apply the EXACT SAME refactoring logic to PlatformArm2

























  

/**
 * NEW: Capture Zone Visualizer Component
 * Renders a semi-transparent box representing the target landing volume.
 */
const CaptureZoneVisualizer = () => {
    // The visualizer box should represent the entire vertical tolerance range.
    // Its height is therefore `CAPTURE_VERTICAL_TOLERANCE * 2`.
    const visualizerHeight = CAPTURE_VERTICAL_TOLERANCE * 6; // 6.0

    // The box needs to be centered vertically at CAPTURE_TARGET_Y.
    const visualizerPosition = new THREE.Vector3(
        PLATFORM_CENTER_X-1,
        CAPTURE_TARGET_Y-3.8, // Center the visual box at the target Y
        PLATFORM_CENTER_Z
    );

    return (
        <mesh position={visualizerPosition} name="captureZoneVisualizer">
            <boxGeometry args={[CAPTURE_ZONE_WIDTH, visualizerHeight, CAPTURE_ZONE_DEPTH]} />
            <meshStandardMaterial
                color="yellow" // Use a distinct color
                transparent={true}
                opacity={0.45} // Make it semi-transparent
                depthWrite={false} // Optional: prevent writing to depth buffer if it causes Z-fighting
            />
        </mesh>
    );
};

























const CUBE_SIZE = 1; // Size of each side of the cube
const CUBE_GEOMETRY_ARGS = [CUBE_SIZE, CUBE_SIZE, CUBE_SIZE];
const CUBE_MATERIAL_PROPS = {
    color: "red",
    transparent: true,
    opacity: 0.45,
    depthWrite: false, // Keep original material properties
};
const MAX_CUBES = 10;

/**
 * Creates a vertical stack of semi-transparent cubes.
 * @param {object} props - Component props.
 * @param {number} [props.count=5] - The number of cubes to stack (capped at 10).
 * @param {THREE.Vector3 | [number, number, number]} [props.position=[0, 0, 0]] - The base position for the bottom cube's center.
 */
const CubeStackVisualizer = ({ count = 5, position = [0, 0, 0] }) => {
    // Ensure count is an integer between 1 and MAX_CUBES
    const actualCount = Math.max(1, Math.min(MAX_CUBES, Math.floor(count)));

    // Calculate positions for each cube
    const cubes = [];
    for (let i = 0; i < actualCount; i++) {
        // Calculate the Y position for the center of the current cube
        // The first cube's center (i=0) is at Y = CUBE_SIZE / 2
        // Each subsequent cube is CUBE_SIZE higher
        const yPosition = (CUBE_SIZE / 2) + (i * CUBE_SIZE);

        // Create the position vector relative to the group's position
        // We use a group so the 'position' prop applies to the whole stack base
        const cubePosition = [-0.1, yPosition-5, 0]; // X and Z are relative to the group

        cubes.push(
            <mesh
                key={i} // Important: Unique key for list rendering
                position={cubePosition}
                name={`CubeUnitVisualizer_${i}`} // Optional: Unique name per cube
            >
                <boxGeometry args={CUBE_GEOMETRY_ARGS} />
                <meshStandardMaterial {...CUBE_MATERIAL_PROPS} />
            </mesh>
        );
    }

    // Render all cubes within a group, applying the overall position prop to the group
    return (
        <group position={position}>
            {cubes}
        </group>
    );
};






















/**
 * Helper function to generate a random starting position for the rocket.
 */
const getRandomStartPosition = (): THREE.Vector3 => {
    const range = ROCKET_START_XZ_RANGE;
    const randomX = Math.random() * range * 2 - range;
    const randomZ = Math.random() * range * 2 - range;
     return new THREE.Vector3(randomX, ROCKET_START_Y, randomZ);  
   // return new THREE.Vector3(-2, 12, 1); // set to easy to start to debug

};

























function Loaderr() {
  const { progress } = useProgress();
  return <Text>{`Loading Model: ${progress.toFixed(0)}%`}</Text>; // Basic text loader
}























const FallingRocket = ({ rocketName }: { rocketName: string }) => {
  // --- Refs ---
  const rocketApi = useRef<RapierRigidBody>(null!); // Ref for Rapier API
  const rocketRef = useRef<THREE.Mesh>(null!); // Ref for visual mesh (for tilt)
  // Remove the old velocity ref: const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const keysPressed = useRef(new Set<string>());
  const flameRef = useRef<THREE.Object3D>(null!);
  const windVector = useRef<THREE.Vector3>(getRandomWindVector());
  const flameOpacityRef = useRef(0);
  const timeInCaptureZoneRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>('playing'); // Ref to hold current game state for callbacks

  // --- State ---
  const [initialPosition] = useState<THREE.Vector3>(getRandomStartPosition); // Keep initial position state
  const [gameState, _setGameState] = useState<GameState>('playing');
  const [statusMessage, setStatusMessage] = useState<string>('');
 

  const thrustFactorRef = useRef(THRUST_ACCELERATION_FACTOR);





 



  const rocketColliderArgs: [number, number, number] = [
      ROCKET_WIDTH / 2,
      ROCKET_HEIGHT / 2,
      ROCKET_WIDTH / 2
  ];

  // --- Calculate Box Geometry Args for the VISUAL bounding box ---
  // BoxGeometry takes FULL dimensions (width, height, depth)
  const visualBoundingBoxArgs = useMemo<[number, number, number]>(() => [
      rocketColliderArgs[0] * 2, // Full width = half-width * 2
      rocketColliderArgs[1] * 2 , // Full height = half-height * 2
      rocketColliderArgs[2] * 2, // Full depth = half-depth * 2
  ], [rocketColliderArgs]); // Recalculate if collider args change (they don't here, but good practice)








  useEffect(() => {
    // Initialize flame properties on mount
    flameOpacityRef.current = 0;
    if (flameRef.current) {
        flameRef.current.visible = false;
    }
}, []);


  
  // --- Game State Setter ---
  // Function to update both state and ref simultaneously
  const setGameState = (newState: GameState) => {
    gameStateRef.current = newState;
    _setGameState(newState);
  };
  // --- Rocket Visuals ---
  const rocketColor = gameState === 'landed' ? 'lime' : gameState === 'crashed' ? 'red' : '#ADD8E6';
  const rocketEmissive = gameState === 'landed' ? 'green' : gameState === 'crashed' ? 'darkred' : '#4682B4';

  const obj = useLoader(OBJLoader, '/booster_obj_1.obj'); // Or '/models/rocket.obj' etc.


  // Create a memoized material instance
  const rocketMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    metalness: 0.6,
    roughness: 0.4,
    // side: THREE.DoubleSide // Optional: If some faces are invisible
}), []);

// Effect to apply material and shadows dynamically to all meshes in the loaded OBJ
useEffect(() => {
    if (!obj) return;

    // Update material properties based on game state
    rocketMaterial.color.set(rocketColor);
    rocketMaterial.emissive.set(rocketEmissive);

    obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = false; // Usually false for the rocket itself
            // *** IMPORTANT: Decide if you want to OVERWRITE existing materials ***
            // If your OBJ/MTL has materials you like, you might comment this out
            // or selectively apply based on child.material.name
            child.material = rocketMaterial;
        }
    });
}, [obj, rocketColor, rocketEmissive, rocketMaterial]); // Re-run if these change



  // --- Calculate Scale (Crucial Step!) ---
  // You MUST adjust the scale to match your physics collider size (ROCKET_HEIGHT, ROCKET_WIDTH)
// Inside FallingRocket component

const modelScale = useMemo(() => {
  // *** ADD THIS CHECK ***
  if (!obj) {
    console.warn("Attempted to calculate scale before model loaded or loader failed.");
    // Return a default scale to prevent crashing, though ideally Suspense prevents this state.
    return new THREE.Vector3(0.001, 0.001, 0.001);
  }
  // *********************

  // 1. Measure your model
  const modelBoundingBox = new THREE.Box3().setFromObject(obj); // This line should now be safe
  const modelSize = new THREE.Vector3();
  modelBoundingBox.getSize(modelSize);
 

  // Ensure modelSize components are not zero to avoid division by zero
  if (modelSize.x === 0 || modelSize.y === 0 || modelSize.z === 0) {
      console.error("Model has zero dimensions, cannot calculate scale automatically. Check export/model.", modelSize);
      return new THREE.Vector3(1, 1, 1); // Default scale
  }


  const scaleY = ROCKET_HEIGHT / modelSize.y;
  return new THREE.Vector3(scaleY, scaleY, scaleY);

}, [obj]); // Dependency array remains the same



  const handleCollision = (event: CollisionPayload) => {
    // Only process collisions if playing or resetting (to allow snapping)
    if (gameStateRef.current !== 'playing' && gameStateRef.current !== 'resetting') {
         // If landed, ignore further collisions
         if(gameStateRef.current === 'landed') return;
         // If crashed, maybe ignore specific collisions if needed
         // return;
    }

    const otherUserData = event.other.collider.userData as { type?: string }; // More specific typing



    // Check if collided with floor, platform tower, or arms
    if (otherUserData?.type === 'floor' || otherUserData?.type === 'platform_tower' || otherUserData?.type === 'arm') {
        // Prevent switching from landed to crashed
        if (gameStateRef.current !== 'landed') {
            setGameState('crashed');
            setStatusMessage(`CRASHED on ${otherUserData.type}! Press R.`);
            // Physics engine handles stopping/resting, no need to snap manually here usually.
            // We can explicitly zero velocity if we want an immediate stop on crash.
             if (rocketApi.current) {
                 rocketApi.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                 rocketApi.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
             }
        }
    }
     // Add more specific collision logic if needed (e.g., different sounds/effects)
  };



  const resetGame = () => {
    setGameState('resetting');
    const newStartPosition = getRandomStartPosition();
    const newWind = getRandomWindVector();
    timeInCaptureZoneRef.current = 0;
    if (flameRef.current) flameRef.current.visible = false;
    flameOpacityRef.current = 0;
    setStatusMessage('');

    if (rocketApi.current) {
        console.log("Resetting physics body...");
        // Teleport the rigid body to the start position
        rocketApi.current.setTranslation(newStartPosition, true);
        // Reset rotation
        rocketApi.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        // Reset velocities
        rocketApi.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rocketApi.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        // Ensure it's dynamic if it was changed
        // rocketApi.current.raw().setBodyType(RapierPhysics.RigidBodyType.Dynamic); // Need import if using this
    } else {
        console.warn("Rocket API not available during reset attempt.");
    }

    // Reset keys and wind *after* physics reset
    keysPressed.current.clear();
    windVector.current.copy(newWind);

    // Short delay before setting state back to playing allows physics state to settle
    setTimeout(() => {
      setGameState('playing');
      console.log("Game reset complete.");
    }, 50); // Increased delay slightly
  };




  // Effect to apply material and shadows dynamically to all meshes in the loaded OBJ
  useEffect(() => {
    
    if (!obj) return;

    // Update material properties based on game state
    rocketMaterial.color.set(rocketColor);
    rocketMaterial.emissive.set(rocketEmissive);

    obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = false; // Usually false for the rocket itself
            // *** IMPORTANT: Decide if you want to OVERWRITE existing materials ***
            // If your OBJ/MTL has materials you like, you might comment this out
            // or selectively apply based on child.material.name
            child.material = rocketMaterial;
        }
    });
}, [obj, rocketColor, rocketEmissive, rocketMaterial]); // Re-run if these change


  // --- Create the Cockpit Camera ---
  const [cockpitCamera] = useState(() => {
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 20000);
    cam.name = COCKPIT_CAMERA_NAME;
    cam.position.set(0, ROCKET_CENTER_TO_TOP - 131.5, 0); // Position inside, near the top, looking forward
    cam.rotation.set(THREE.MathUtils.degToRad(0), THREE.MathUtils.degToRad( 0), THREE.MathUtils.degToRad(0)); // Slight downward tilt
    return cam;
  });

  // --- Attach Camera to Rocket ---
  useLayoutEffect(() => {
    if (rocketRef.current && !rocketRef.current.getObjectByName(COCKPIT_CAMERA_NAME)) {
      rocketRef.current.add(cockpitCamera);
    }
    return () => {
      if (rocketRef.current) rocketRef.current.remove(cockpitCamera);
    };
  }, [cockpitCamera]); 





  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent holding down key from firing continuously if not desired
      // (Set handles uniqueness automatically)
        
       keysPressed.current.add(event.key);

      // Handle Reset Key directly here
      if (event.key.toLowerCase() === RESET_KEY && gameStateRef.current !== 'resetting') {
           resetGame();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === THRUST_KEY) { // Check specifically for space
        console.log("Spacebar UP detected");
    }
      keysPressed.current.delete(event.key);
    };

    // Add listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup listeners on component unmount
    return () => {
      console.log("Removing key listeners");
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysPressed.current.clear(); // Clear keys on unmount/cleanup
    };
  }, [resetGame]);






  const wasThrustingRef = useRef(false);

  useFrame((state, delta) => {
    if (!rocketApi.current || !rocketRef.current || gameStateRef.current === 'resetting') return;

    const dt = Math.min(delta, 0.05); // Clamp delta time
    const isPlaying = gameStateRef.current === 'playing';
    const isThrusting = isPlaying && keysPressed.current.has(THRUST_KEY);
  
    // --- Handle Flame Visibility ---
    const fadeSpeed = 3.0;
    if (isThrusting) {
      flameOpacityRef.current = 1;
    } else {
      flameOpacityRef.current = Math.max(0, flameOpacityRef.current - dt * fadeSpeed);
    }
    if (flameRef.current) {
      flameRef.current.visible = flameOpacityRef.current > 0.01;
    }
  
    // --- Apply Forces if Playing ---
    if (isPlaying) {
      const body = rocketApi.current;
      const force = { x: 0, y: 0, z: 0 }; // Use force vector
  
      // Apply Thrust Force
      if (isThrusting) {
        force.y += ROCKET_THRUST_FORCE; // Apply thrust force
      } else {
        // Apply gravity when not thrusting
        force.y -= EFFECTIVE_GRAVITY_MAGNITUDE;
      }
  
      // Maneuvering Forces
      let maneuverForceX = 0;
      let maneuverForceZ = 0;
      if (keysPressed.current.has(LEFT_KEY)) maneuverForceX -= ROCKET_MANEUVER_FORCE;
      if (keysPressed.current.has(RIGHT_KEY)) maneuverForceX += ROCKET_MANEUVER_FORCE;
      if (keysPressed.current.has(UP_KEY)) maneuverForceZ -= ROCKET_MANEUVER_FORCE;
      if (keysPressed.current.has(DOWN_KEY)) maneuverForceZ += ROCKET_MANEUVER_FORCE;
      force.x += maneuverForceX;
      force.z += maneuverForceZ;
  
      // Wind Force
      force.x += windVector.current.x * WIND_FORCE_SCALE;
      force.z += windVector.current.z * WIND_FORCE_SCALE;
  
      // Apply ALL calculated forces to the Physics Body
      body.addForce(force, true);
  
      // --- Handle Visual Tilt Animation (Separate from Physics Rotation) ---
      const rocketMesh = rocketRef.current;
      let targetRotationZ = 0;
      if (keysPressed.current.has(LEFT_KEY)) targetRotationZ = ROCKET_TILT_ANGLE_Z;
      else if (keysPressed.current.has(RIGHT_KEY)) targetRotationZ = -ROCKET_TILT_ANGLE_Z;
  
      let targetRotationX = 0;
      if (keysPressed.current.has(UP_KEY)) targetRotationX = -ROCKET_TILT_ANGLE_X;
      else if (keysPressed.current.has(DOWN_KEY)) targetRotationX = ROCKET_TILT_ANGLE_X;
  
      const tiltLerpFactor = dt * ROCKET_ROTATION_SPEED * 5;
      rocketMesh.rotation.x = THREE.MathUtils.lerp(rocketMesh.rotation.x, targetRotationX, tiltLerpFactor);
      rocketMesh.rotation.z = THREE.MathUtils.lerp(rocketMesh.rotation.z, targetRotationZ, tiltLerpFactor);
  


    // ----- REMOVED VELOCITY CLAMPING BLOCK -----
    /*
    // --- Clamp Velocity (Optional Safeguard) --- REMOVED ---
    const linVel = body.linvel();
    const clampedVelY = THREE.MathUtils.clamp(linVel.y, -ROCKET_MAX_FALL_SPEED, ROCKET_MAX_RISE_SPEED);
    const clampedVelX = THREE.MathUtils.clamp(linVel.x, -ROCKET_MAX_XZ_SPEED, ROCKET_MAX_XZ_SPEED);
    const clampedVelZ = THREE.MathUtils.clamp(linVel.z, -ROCKET_MAX_XZ_SPEED, ROCKET_MAX_XZ_SPEED);

    if(Math.abs(linVel.y - clampedVelY) > 0.01 || Math.abs(linVel.x - clampedVelX) > 0.01 || Math.abs(linVel.z - clampedVelZ) > 0.01) {
         body.setLinvel({ x: clampedVelX, y: clampedVelY, z: clampedVelZ }, true);
    }
    */
    // ----- END REMOVED BLOCK -----


    // --- Capture Zone Logic (Should work similarly) ---
    // This part remains the same
    const currentPosition = body.translation(); // Get position from physics
    let isInCaptureZone = false;
    const isInVerticalZone = currentPosition.y >= CAPTURE_ZONE_MIN_Y && currentPosition.y <= CAPTURE_ZONE_MAX_Y;

    if (isInVerticalZone) {
      const isInHorizontalZoneX = Math.abs(currentPosition.x - (PLATFORM_CENTER_X - 1)) <= CAPTURE_ZONE_WIDTH / 2;
      const isInHorizontalZoneZ = Math.abs(currentPosition.z - PLATFORM_CENTER_Z) <= CAPTURE_ZONE_DEPTH / 2;
      // TODO: Add speed/tilt checks using physics body data (linvel, angvel, rotation)
      const currentLinVel = body.linvel(); // Re-fetch if needed after clamping - Now safe to fetch here
      // const verticalSpeedOK = Math.abs(currentLinVel.y) <= MAX_LANDING_SPEED_VERTICAL;
      // const horizontalSpeedOK = Math.sqrt(currentLinVel.x**2 + currentLinVel.z**2) <= MAX_LANDING_SPEED_HORIZONTAL;
      // Check tilt using body.rotation() quaternion

      const conditionsMet = isInHorizontalZoneX && isInHorizontalZoneZ; // Add other conditions here

      if (conditionsMet) {
          isInCaptureZone = true;
          timeInCaptureZoneRef.current += dt;
          setStatusMessage(`In capture zone... ${timeInCaptureZoneRef.current.toFixed(1)} / ${REQUIRED_CAPTURE_TIME.toFixed(1)}s`);

          if (timeInCaptureZoneRef.current >= REQUIRED_CAPTURE_TIME) {
              console.log("SUCCESSFUL CAPTURE");
              setGameState('landed');
              setStatusMessage(`Captured! Press R.`);
              // Snap physics body (setLinvel is OK here for an instantaneous stop)
              body.setTranslation({ x: PLATFORM_CENTER_X - 1, y: CAPTURE_TARGET_Y - 3.8, z: PLATFORM_CENTER_Z }, true);
              body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
              body.setLinvel({ x: 0, y: 0, z: 0 }, true);
              body.setAngvel({ x: 0, y: 0, z: 0 }, true);
              // Optionally change body type to kinematic/fixed
          }
      }
  }

  if (!isInCaptureZone) {
      if (timeInCaptureZoneRef.current > 0) setStatusMessage(''); // Clear timer message
      timeInCaptureZoneRef.current = 0;
  }

  // --- Fall Off Bottom Check ---
  // This part remains the same
  if (currentPosition.y < SCENE_BOUNDS_BOTTOM) {
      console.log("Fell off bottom.");
      if (gameStateRef.current !== 'crashed') { // Prevent multiple messages
          setGameState('crashed');
          setStatusMessage('Lost in space... Press R.');
          // Stop physics body (setLinvel is OK here)
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
  }
} else if (gameStateRef.current === 'landed' || gameStateRef.current === 'crashed') {
 // No change needed here, the physics engine should bring it to rest
 // due to damping or being snapped in the capture zone logic.
}
});




 

  const colliderHalfHeight = ROCKET_HEIGHT / 2;
  return (
    <RigidBody
          ref={rocketApi}
          colliders={false} // Use manual collider below
          position={initialPosition}
          linearDamping={ROCKET_LINEAR_DAMPING}
          angularDamping={1.0}
        
          mass={1}
          userData={{ type: 'rocket' }}
      >
          {/* Physical Collider - Stays the same size */}
          <CuboidCollider
              args={rocketColliderArgs}
              onCollisionEnter={handleCollision}
          />





      {/* --- DEBUG: Visual Bounding Box --- */}
      {/* 2. Visual Mesh for the Bounding Box */}
      {/* This mesh uses the FULL dimensions derived from the collider args */}
      {/* It's placed inside the RigidBody, so it automatically follows its position/rotation */}
      <mesh name="physicsBoundingBoxVisualizer">
        <boxGeometry args={visualBoundingBoxArgs} />
        <meshBasicMaterial
            color="lime"      // Bright color for visibility
            wireframe={true}  // Show as wireframe to see the model inside
            transparent={true} // Allow seeing through
            opacity={0.6}     // Make it semi-transparent
            depthWrite={false}// Optional: Prevents potential z-fighting issues
        />
      </mesh>
      {/* ---------------------------------- */}






          {/* Visual Representation: The Loaded Model */}
          {/* We use <primitive> to render an existing THREE object (the loaded group) */}
          {/* The `object` prop takes the result from useLoader */}
          {/* Position/Rotation are automatically handled by the parent RigidBody */}
          <primitive
              ref={rocketRef}     // Attach the ref here
              name={rocketName}   // Assign the name here
              object={obj}        // The loaded OBJ (as a THREE.Group)
              scale={modelScale}  // Apply the calculated scale
              position={[0, -colliderHalfHeight, 0]}
          >
              {/* Cockpit camera is added as a child via useLayoutEffect */}

              {/* Flame Component */}
              {/* *** IMPORTANT: Adjust flame position RELATIVE to the MODEL's base *** */}
              {/* This depends heavily on where the origin (0,0,0) of your model is */}
              {/* and the scaling applied. Start with target height / 2 and tweak. */}

          </primitive>
          <Flame
                  ref={flameRef}
                  // Example: Position below the calculated center point after scaling
                  position={[0, -colliderHalfHeight  , 0]} // ADJUST THIS Y VALUE!
                  particleCount={1500}
                   
                  flameHeight={5.5}
                  emitterRadius={0.2}
                  particleSize={0.18}
                  colorStart={new THREE.Color(0xff2a00)}
                  colorEnd={new THREE.Color(0xfff600)}
                  opacityRef={flameOpacityRef}
              />
      </RigidBody>
  );
};











































/**
 * Component responsible for handling the multi-viewport rendering
 */



const CockpitCameraUpdater = ({ rocketName, cameraName }: { rocketName: string, cameraName: string }) => {
  const { scene } = useThree();

  useFrame(() => {
      const rocket = scene.getObjectByName(rocketName) as THREE.Mesh | undefined;
      const cockpitCam = scene.getObjectByName(cameraName) as THREE.PerspectiveCamera | undefined;

      if (rocket && cockpitCam) {
      // Set camera position in rocket's local space (inside, near the top)
      const localOffset = new THREE.Vector3(1,-162, 1); // ROCKET_CENTER_TO_TOP - 0.5 = 3.55 - 0.5 = 3.05
      cockpitCam.position.copy(localOffset);
      cockpitCam.updateProjectionMatrix(); 

      // Align camera rotation with rocket and add a slight downward tilt
      cockpitCam.quaternion.copy(rocket.quaternion);
      const tiltAngle = THREE.MathUtils.degToRad(-45); // 5 degrees downward tilt
      const tiltAngle2 = THREE.MathUtils.degToRad(-90); // 5 degrees downward tilt
      const tiltAngle3 = THREE.MathUtils.degToRad(-90); // 5 degrees downward tilt

      // cockpitCam.rotateX(tiltAngle);
        cockpitCam.rotateX(tiltAngle2);
      cockpitCam.rotateY(tiltAngle);
      cockpitCam.rotateZ(tiltAngle3);

      // Update projection matrix (optional, handled in MultiViewRenderer, but safe to include)
      cockpitCam.updateProjectionMatrix();
      
    }
  });

  return null; // This component doesn't render anything itself
};














const MultiViewRenderer = () => {
  const { gl, scene, camera, size } = useThree();

  useFrame(() => {
    const cockpitCam = scene.getObjectByName(COCKPIT_CAMERA_NAME) as THREE.PerspectiveCamera | undefined;
    const stationaryCam = scene.getObjectByName(STATIONARY_CAMERA_NAME) as THREE.PerspectiveCamera | undefined;

    // Define viewports
    const mainViewport = { x: 0, y: 0, width: size.width, height: size.height };
    const pipWidth = Math.floor(size.width / 4);
    const pipHeight = Math.floor(size.height / 4);
    const pipX = size.width - pipWidth - 10;
    const pipY = size.height - pipHeight - 10;
    const pipViewport = { x: pipX, y: pipY, width: pipWidth, height: pipHeight };

    gl.autoClear = false;
    gl.clear();

    // Render Main View
    gl.setViewport(mainViewport.x, mainViewport.y, mainViewport.width, mainViewport.height);
    gl.setScissor(mainViewport.x, mainViewport.y, mainViewport.width, mainViewport.height);
    gl.setScissorTest(true);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = mainViewport.width / mainViewport.height;
      camera.updateProjectionMatrix();
    }
    gl.render(scene, camera);

    // Render Cockpit View
    if (cockpitCam) {
      cockpitCam.aspect = pipViewport.width / pipViewport.height;
      cockpitCam.updateProjectionMatrix();

      gl.setScissor(pipViewport.x, pipViewport.y, pipViewport.width, pipViewport.height);
      gl.setScissorTest(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      gl.setViewport(pipViewport.x, pipViewport.y, pipViewport.width, pipViewport.height);
      gl.render(scene, cockpitCam);
    }

    // Render Stationary Camera View
    if (stationaryCam) {
      const stationaryViewport = { x: pipViewport.x , y: pipViewport.y -450, width: pipWidth, height: pipHeight }; // Adjust position as needed
      stationaryCam.aspect = stationaryViewport.width / stationaryViewport.height;
      stationaryCam.updateProjectionMatrix();

      gl.setScissor(stationaryViewport.x, stationaryViewport.y, stationaryViewport.width, stationaryViewport.height);
      gl.setScissorTest(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      gl.setViewport(stationaryViewport.x, stationaryViewport.y, stationaryViewport.width, stationaryViewport.height);
      gl.render(scene, stationaryCam);
    }

    gl.setScissorTest(false);
    gl.autoClear = true;
  }, 1);

  return null;
};














const STATIONARY_CAMERA_NAME = "stationaryCamera";




 

function CockpitCameraDebugger() {
  const { scene } = useThree();
  const cockpitCam = scene.getObjectByName('cockpitCamera') || scene.children.find(obj => obj.isCamera);
  const helperRef = useRef(null);

  useEffect(() => {
    if (cockpitCam && !helperRef.current) {
      const helper = new THREE.CameraHelper(cockpitCam);
      scene.add(helper);
      helperRef.current = helper;
    }

    return () => {
      if (helperRef.current) {
        scene.remove(helperRef.current);
        helperRef.current = null;
      }
    };
  }, [cockpitCam, scene]);

  return null;
}

 












/**
 * Main Scene Component
 */
const RocketLandingScene = () => {

  const [stationaryCamera] = useState(() => {
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    cam.name = STATIONARY_CAMERA_NAME;
    cam.position.set(1, -1, 0); // Position the camera
    cam.lookAt(new THREE.Vector3(-2, PLATFORM_TOP_Y, 0.5)); // Look at the platform
    return cam;
  });



  const rocketBodyHeight = 8;
  const rocketBodyRadius = 0.5;
  const flameEmitterY = -rocketBodyHeight / 2; // Position flame below the body
  const pipViewRef = useRef<HTMLDivElement>(null!);
  const worldGravity: [number, number, number] = [0, -9.81 * 0.8, 0]; // Example: Slightly less than Earth gravity

  const [deployArms, setDeployArms] = useState(false); // State to control arm deployment



 


  // NOTE: Game state is currently managed within FallingRocket.
  // Consider lifting state up here if more components need it.
  // const [gameState, setGameState] = useState<GameState>('playing');
  // const [statusMessage, setStatusMessage] = useState<string>('');

  return (

<Canvas
      style={{ 
        position: 'fixed', // Position it relative to the viewport
        top: 0,
        left: 0,
        width: '100%',    // Fill the width of the viewport
        height: '100%',   // Fill the height of the viewport
        background: '#aaB266',
        touchAction: 'none' 
      
      }}
      shadows
      // Disable default rendering loop if using custom MultiViewRenderer that handles it
      // frameloop="demand" // Or manage manually if MultiViewRenderer isn't rendering every frame
    >
        {/* Main Camera */}
        <PerspectiveCamera
            makeDefault
            position={[-21, 11, 40]} // Adjusted position slightly for better view of tall platform
  
            // Optional: Adjust frustum bounds if needed for aspect ratio
            // left={-aspect * frustumSize / 2}
            // right={aspect * frustumSize / 2}
            // top={frustumSize / 2}
            // bottom={-frustumSize / 2}
        />

<primitive object={stationaryCamera} />




{/* <Flame
  position={[0, 12, 0]} // Emitter position
  particleCount={800}             // More particles = denser flame
  flameHeight={7}                 // How long the plume is
  emitterRadius={0.3}             // Width at the nozzle
  particleSize={2.2}              // Adjust particle size2
  colorStart={new THREE.Color(0xfff0b0)} // Brighter core
  colorEnd={new THREE.Color(0xff6600)}   // Orange/red edges
  opacity={0.7}
/> */}





<AxesHelperComponent size={1} /> {/* Adjust size as needed */}
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 30, 10]} // Adjusted light position
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={60} // Increased shadow distance
        shadow-camera-left={-25} // Wider shadow area
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25} // Deeper shadow area
        />
              <directionalLight position={[-5, -5, -5]} intensity={0.2} />
              <CockpitCameraUpdater rocketName={ROCKET_MESH_NAME} cameraName={COCKPIT_CAMERA_NAME} />
              <CockpitCameraDebugger />

              <Physics gravity={worldGravity} >
      {/* Scene Content */}
      <Suspense fallback={null}>
        <LandingPlatform />
        <PlatformArm1 />
        <PlatformArm2 />

        
        {/* Add the capture zone visualizer */}
        <CaptureZoneVisualizer />
        < CubeStackVisualizer/>
        <FallingRocket rocketName={ROCKET_MESH_NAME} /> {/* Contains game state logic */}
        <LandingFloor/>
        {/* <Text> component could be added here for status messages if state is lifted */}
      </Suspense>
      </Physics>
      {/* Controls */}
      <OrbitControls enableRotate={true} enablePan={true} enableZoom={true} />

      {/* Custom Renderer for PiP */}
      <MultiViewRenderer />

    </Canvas>
  );
};

export default RocketLandingScene;