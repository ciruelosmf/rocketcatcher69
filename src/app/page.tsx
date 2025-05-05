// \src\app\page.tsx
"use client"

import React, { Suspense, useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, useTexture , Text, View, PerspectiveCamera, useProgress, Stats  } from '@react-three/drei';
import * as THREE from 'three';
import AxesHelperComponent from './AxesHelperComponent';
import { Physics, RigidBody, RigidBodyType , CuboidCollider } from '@react-three/rapier';
import   {   TrimeshCollider, ConvexHullCollider, RapierRigidBody } from '@react-three/rapier'; // Import types

import Flame from './FlameComponent'; // Import the Flame component
import InstructionsUI from './Instructions';
 
import RotatingCamera from "./RotatingCamera";

import WinDrawer from "./WinDrawer";

import { useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { GLTFLoader  } from 'three/addons/loaders/GLTFLoader.js'

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
const REQUIRED_CAPTURE_TIME = 0.69; // Seconds required inside the zone


// Rocket Physics & Control
const ROCKET_START_Y = 31;
const ROCKET_START_XZ_RANGE = 8;
const ROCKET_HEIGHT = 7.1;
const ROCKET_WIDTH = 0.5;
const ROCKET_BASE_OFFSET = ROCKET_HEIGHT / 2; // Distance from center to base (3.0)
const ROCKET_CENTER_TO_TOP = ROCKET_HEIGHT / 2; // Distance from center to top (3.0)




// Landing Criteria (Existing - will be adapted later)
const MAX_LANDING_SPEED_VERTICAL = 0.6; // Max vertical speed for safe landing (units/sec)
const MAX_LANDING_TILT_RADIANS = Math.PI / 18; // Approx 10 degrees max tilt allowed
// Add Horizontal speed check constant (will be used later)
const MAX_LANDING_SPEED_HORIZONTAL = 0.2; // Placeholder+



// Vertical Physics (Y-Axis)
const ROCKET_FALL_ACCELERATION = 0.001;
const ROCKET_MAIN_THRUST = 1.3;
 
// ROCKET_DRAG_VERTICAL = 0.05; origi
 
const ROCKET_DRAG_VERTICAL = 7.05;

// Horizontal Plane Physics (XZ-Axis)
const ROCKET_MANEUVER_THRUST = 1.6;
 
const ROCKET_DRAG_XZ = 0.35;

// Rocket Animation
const ROCKET_TILT_ANGLE_Z = Math.PI / 22;
const ROCKET_TILT_ANGLE_X = Math.PI / 22;
const ROCKET_ROTATION_SPEED = 0.45;

// Controls
const LEFT_KEY = 'a';
const RIGHT_KEY = 'd';
const UP_KEY = 'w';
const DOWN_KEY = 's';
const THRUST_KEY = ' ';
const RESET_KEY = 'r';

const ROCKET_MESH_NAME = "playerRocket"; // Name for the rocket mesh
const COCKPIT_CAMERA_NAME = "cockpitCamera";
 


// Game States
type GameState = 'playing' | 'landed' | 'crashed' | 'resetting';



// Vertical Physics (Y-Axis) - Using FORCE now
const EFFECTIVE_GRAVITY_MAGNITUDE = Math.abs(-9.81 * 0.8 * 1.5); // Calculated from worldGravity * gravityScale (approx 11.77)
const THRUST_ACCELERATION_FACTOR = 0.41; // How much stronger than gravity is the thrust? (e.g., 1.0 = hover, 1.5 = 50% more force) - **TUNE THIS**
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
  const floorColliderArgs: [number, number, number] = [132, FLOOR_HEIGHT / 2+0.2, 132];

  const [colorMap, displacementMap] = useTexture([
    '/grass_diffuse.jpg', // Replace with your grass/ground texture path
    '/terrain_heightmap.jpg', // Replace with your heightmap texture path
  ]);
  const textureRepeatFactor = 1; // How many times the texture tiles across the floor
  [colorMap, displacementMap].forEach((texture) => {
    if (texture) { // Check if texture loaded successfully
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(textureRepeatFactor, textureRepeatFactor);
        texture.needsUpdate = true; // Ensure updates are applied
    }
  });
  const floorWidth = 180;
  const floorDepth = 450;
  // Segments: More segments = smoother displacement, but higher GPU cost
  const floorSegments = 1;
  // Displacement Scale: Controls the intensity of the heightmap effect (how bumpy)
  const displacementScaleFactor = 2.1; // Adjust this value to control hill height
  // const floorColliderArgs: [number, number, number] = [floorWidth / 2, 1, floorDepth / 2]; // Half-extents (Width/2, Height/2, Depth/2) - Make it thicker
  const colliderCenterYOffset = 0.1; // Center the collider slightly above PLATFORM_Y

  return (
    // RigidBody remains fixed. Its position defines the base plane level.
    <RigidBody
      type="fixed"
      position={[0-60, PLATFORM_Y-0.5, 0]} // Base Y level for the floor plane
      colliders={false} // We define the collider manually below
      userData={{ type: 'floor' }} // Keep identifying the floor
    >
      {/* Using Option A: Simplified Cuboid Collider */}
      <CuboidCollider
        args={floorColliderArgs}
        // Position the collider relative to the RigidBody's origin
        position={[+30, colliderCenterYOffset+1.05, 0]}
        userData={{ isFloorCollider: true }} // Optional: more specific userData
      />
      {/* --- Visual Mesh --- */}
      <mesh
        receiveShadow // Allow the floor to receive shadows
        name="landscapeFloor"
        // Rotate the plane geometry so it's horizontal (lies flat on XZ plane)
        rotation={[-Math.PI / 2, 0, 0]}
        // Position relative to the RigidBody is [0,0,0] since rotation handles orientation
      >
        {/* Use PlaneGeometry instead of BoxGeometry */}
        <planeGeometry args={[floorWidth, floorDepth, floorSegments, floorSegments]} />
        {/* Material with textures */}
        <meshStandardMaterial
          map={colorMap} // Apply the color texture
          displacementMap={displacementMap} // Apply the heightmap
          displacementScale={displacementScaleFactor} // Control bumpiness
          // Optional enhancements:
          // normalMap={normalMap} // Add if you have a normal map for finer detail
          // roughnessMap={roughnessMap} // Add if you have a roughness map
          metalness={0.1} // Reduce metalness for ground
          roughness={0.8} // Increase roughness for ground
          side={THREE.DoubleSide} // Render both sides, useful for displaced planes
        />
      </mesh>
    </RigidBody>
  );
};













  
// Define dimensions and position for the water plane
const WATER_PLANE_WIDTH = 165; // From your original component
const WATER_PLANE_DEPTH = 455; // From your original component

// Position based on your original RigidBody placement, adjust Y level as desired
const WATER_POSITION_X = 210;
const WATER_POSITION_Z = 0;
const WATER_LEVEL_Y = PLATFORM_Y; // Place it slightly below or at the platform base level

/**
 * Simple visual-only water plane component.
 */
const Waterfloor = () => {
  return (
    <mesh
      // Position the center of the plane in the world
      position={[WATER_POSITION_X-120, WATER_LEVEL_Y, WATER_POSITION_Z]}
      // Rotate the plane geometry to be horizontal (flat on XZ)
      rotation={[-Math.PI / 2, 0, 0]}
      // Optionally receive shadows if other objects cast onto it
      receiveShadow
      name="simpleWaterSurface" // Give it a descriptive name
    >
      {/* Use simple PlaneGeometry, only 1x1 segments needed */}
      <planeGeometry args={[WATER_PLANE_WIDTH, WATER_PLANE_DEPTH, 1, 1]} />
      {/* Use a basic material with a blue color */}
      <meshStandardMaterial
        color="#4682B4" // A water-like blue color (SteelBlue) - adjust as needed
        metalness={0.1}  // Low metalness for water look
        roughness={1.3}  // Relatively smooth, adjust for desired shininess
        // Optional: Add transparency for a better water effect
        transparent={true}
        opacity={0.9}
        // side={THREE.DoubleSide} // Uncomment if the camera might go below the plane
      />
    </mesh>
  );
};

 























/**
 * Landing Platform Component (Tall Tower Structure - Physics Enabled)
 */
const LandingPlatform = () => {
  const platformCenterY = PLATFORM_Y + PLATFORM_HEIGHT / 2;
  const platformPosition: [number, number, number] = [PLATFORM_CENTER_X, platformCenterY+1, PLATFORM_CENTER_Z];
  // Collider dimensions are half-extents
  const platformColliderArgs: [number, number, number] = [PLATFORM_WIDTH / 2, PLATFORM_HEIGHT / 2, PLATFORM_DEPTH / 2];


  const obj = useLoader(GLTFLoader, '/tower.glb'); // Or '/models/rocket.obj' etc.
 // --- Recalculate Scale based on obj.scene ---
 const modelScale = useMemo(() => {
  // Check if obj and its scene are loaded
  if (!obj || !obj.scene) return new THREE.Vector3(1, 1, 1);

  // Clone the scene to avoid modifying the cached version directly for bounding box calculation
  const scene = obj.scene.clone();
  const box = new THREE.Box3().setFromObject(scene); // Use the loaded obj scene
  const modelSize = box.getSize(new THREE.Vector3());

  // Handle potential zero dimensions
  if (modelSize.x === 0 || modelSize.y === 0 || modelSize.z === 0) {
      console.warn("obj model has zero dimensions, using default scale.");
      return new THREE.Vector3(1, 1, 1);
  }

  // Calculate scale factors (same logic as before)
  const scaleX = PLATFORM_WIDTH / modelSize.x;
  const scaleY = PLATFORM_HEIGHT / modelSize.y;
  const scaleZ = PLATFORM_DEPTH / modelSize.z;

  // Uniform scaling based on height is usually best
  const uniformScaleFactor = scaleY;
  return new THREE.Vector3(uniformScaleFactor, uniformScaleFactor, uniformScaleFactor);

}, [obj]); // Recalculate only when obj data changes

// --- Recalculate Visual Offset based on obj.scene ---
const modelPositionOffset = useMemo(() => {
  if (!obj || !obj.scene) return [0, 0, 0];

  const scene = obj.scene.clone();
  const box = new THREE.Box3().setFromObject(scene);
  const modelSize = box.getSize(new THREE.Vector3());
  // Use the calculated scale for the obj model
  const scaledHeight = modelSize.y * modelScale.y;

  // Assume origin is at the base (adjust if your obj origin is different)
  return [0, -scaledHeight / 2, 0];

}, [obj, modelScale]); // Recalculate if obj or scale changes

// --- Apply Shadows to loaded obj meshes ---
useEffect(() => {
  if (obj && obj.scene) {
    obj.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true; // Allow parts of the tower to receive shadows
      }
    });
  }
}, [obj]); // Apply effect when obj data is available

// --- Render ---
// Suspense higher up should handle the loading state provided by useobj
// Optional: Add explicit check if needed, though Suspense is preferred
// if (!obj || !obj.scene) {
//   console.warn("LandingPlatform: obj model not fully loaded yet.");
//   return null; // Or a placeholder
// }

return (
  <RigidBody
    type="fixed"
    position={platformPosition} // Physics body position remains the same
    colliders={false} // Manual collider below
    userData={{ type: 'platform_tower' }}
  >
    {/* 1. Physical Collider (Invisible) - Stays the same */}
    <CuboidCollider args={platformColliderArgs} />

    {/* 2. Visual Representation (Loaded obj Model) */}
    {/*    Use <primitive> and pass the obj.scene */}
    <primitive
      object={obj.scene} // <-- Render the loaded scene graph
      scale={modelScale}
      position={modelPositionOffset} // Apply calculated offset
      name="platformVisualModel"
    />
  </RigidBody>
);
};






















const ROAD_POSITION_X = 0;
// Set Y based on your ground level. If ground is at Y=0, maybe 0.01 to avoid z-fighting
const ROAD_POSITION_Y = 0.01-0.2;
const ROAD_POSITION_Z = 0;

// If your road model isn't sized correctly in Blender, apply scale here.
// Start with [1, 1, 1] if you sized it appropriately during modeling.
const ROAD_SCALE_X = 1;
const ROAD_SCALE_Y = 1;
const ROAD_SCALE_Z = 1;

// --- Road Component ---
const StationRoad = () => {
    // --- Constants ---
    const roadPosition: [number, number, number] = [ROAD_POSITION_X, ROAD_POSITION_Y, ROAD_POSITION_Z];
    // Use useMemo for the Vector3 to avoid recreating it on every render
    const roadScale = useMemo(() => new THREE.Vector3(ROAD_SCALE_X, ROAD_SCALE_Y, ROAD_SCALE_Z), []);

    // --- Load Model ---
    const gltf = useLoader(GLTFLoader, '/buildings.glb'); // Make sure this path is correct!

    // --- Render ---
    // Wait until the GLTF is loaded
    if (!gltf || !gltf.scene) {
        // console.log("StationRoad: GLTF model not ready."); // Optional logging
        return null; // Don't render anything yet
    }

    // Since there's no physics body, we use a simple group to position/scale the model
    return (
        <group
            position={roadPosition}
            scale={roadScale}
            name="StationRoadVisual" // Helpful for debugging
            // rotation={[0, /* Optional Y rotation */, 0]} // Add rotation if needed
        >
            {/* --- Visual Representation (Loaded Model) --- */}
            {/* Render the loaded scene graph */}
            {/* Clone the scene to ensure modifications (like adding to this group)
                don't affect the cached model if it's used elsewhere. */}
            <primitive object={gltf.scene.clone()} />
        </group>
    );
};



























const ARM_TARGET_HEIGHT = 2.0;
const ARM_TARGET_WIDTH = 3.0;
const ARM_TARGET_DEPTH = 0.6;
 
const ROT_SPEED = Math.PI / 61; // 30° / sec

const ARMS_POSITION_X = PLATFORM_CENTER_X + 0.5;
const ARMS_POSITION_Y = 11 + PLATFORM_Y + ARM_TARGET_HEIGHT / 2;
const ARMS_POSITION_Z = PLATFORM_CENTER_Z;

const LandingArmsR: React.FC<{ isLanded: boolean }> = ({ isLanded }) => {
    const armsPosition: [number, number, number] = [ARMS_POSITION_X, ARMS_POSITION_Y, ARMS_POSITION_Z];

    // --- Load Model ---
    // useLoader returns the GLTF structure which contains the scene graph
    const gltf = useLoader(GLTFLoader, '/armR.glb');


    const visualRef = useRef<THREE.Group>(null);

    // rotate when landed
    useFrame((_, dt) => {
      if (isLanded && visualRef.current) {
        visualRef.current.rotation.y = ROT_SPEED  ;
      }
    });


    // --- Scaling ---
    const modelScale = useMemo(() => {
        // Use gltf.scene to calculate bounds
        if (!gltf || !gltf.scene) return new THREE.Vector3(1, 1, 1);

        // Clone the scene to avoid modifying the original loaded object when measuring
        const sceneClone = gltf.scene.clone();
        const box = new THREE.Box3().setFromObject(sceneClone);
        const modelSize = box.getSize(new THREE.Vector3());

        // Using your determined hardcoded scale:
        return new THREE.Vector3(0.014, 0.014, 0.014);

        // OR Calculate dynamically (ensure ARM_TARGET constants are correct & handle zero dimensions)
        // const scaleX = modelSize.x > 1e-6 ? ARM_TARGET_WIDTH / modelSize.x : 1;
        // const scaleY = modelSize.y > 1e-6 ? ARM_TARGET_HEIGHT / modelSize.y : 1;
        // const scaleZ = modelSize.z > 1e-6 ? ARM_TARGET_DEPTH / modelSize.z : 1;
        // Choose scaling strategy (uniform often preferred to avoid distortion)
        // return new THREE.Vector3(scaleY, scaleY, scaleY); // Uniform based on height
        // return new THREE.Vector3(scaleX, scaleY, scaleZ); // Non-uniform

    }, [gltf]); // Recalculate only when gltf loads

    // --- Visual Offset ---
    const modelPositionOffset = useMemo(() => {
        if (!gltf || !gltf.scene) return [0, 0, 0] as [number, number, number];

        // Clone the scene to measure accurately after scaling
        const sceneClone = gltf.scene.clone();
        const box = new THREE.Box3().setFromObject(sceneClone);
        const modelSize = box.getSize(new THREE.Vector3());
        const scaledSize = modelSize.multiply(modelScale); // Size *after* applying modelScale

        // *** IMPORTANT: Verify your model's origin point! ***
        // Assumes origin is at the BASE CENTER of the model.
        // If origin is at GEOMETRIC CENTER, use [0, 0, 0]
        return [0, scaledSize.y / 2, 0] as [number, number, number];
        // return [0, 0, 0]; // Use if origin is geometric center

    }, [gltf, modelScale]); // Recalculate if gltf or scale changes

    // --- Collider Geometry Args ---
    const colliderArgs = useMemo(() => {
        if (!gltf || !gltf.scene) return null;

        const geometries: THREE.BufferGeometry[] = [];
        // Traverse the actual scene graph from the loaded GLTF
        gltf.scene.traverse((child) => {
            // Ensure it's a Mesh with geometry
            if (child instanceof THREE.Mesh && child.geometry) {
                // NOTE: For simplicity, taking the first geometry found.
                // For complex models with multiple meshes, you might need to merge geometries
                // or use compound shapes for accurate colliders.
                if (geometries.length === 0) {
                    geometries.push(child.geometry);
                }
            }
        });

        if (geometries.length === 0) return null;

        const geometry = geometries[0];
        // Check for position attribute which holds vertices
        if (!geometry || !geometry.attributes.position) return null;

        // Get vertices and indices (indices needed for TrimeshCollider)
        const vertices = geometry.attributes.position.array as Float32Array;
        const indices = geometry.index?.array as Uint32Array | Uint16Array;

        // Return data needed for Rapier colliders
        // Note: These vertices are in the local space of the mesh within the GLTF.
        // Scaling/offsetting is handled by the visual <group>, not applied here.
        return { vertices, indices };

    }, [gltf]); // Recalculate only when gltf loads

    // --- Render ---
    // Wait until the GLTF and collider data are ready
    if (!gltf || !gltf.scene || !colliderArgs) {
        // console.warn("LandingArmsR: GLTF model or collider geometry not ready.");
        return null; // Don't render anything yet
    }

    return (
        <RigidBody
            type="fixed"
            position={armsPosition}
            colliders={false} // We define colliders manually below
            userData={{ type: 'platform_arms' }}
            name="LandingArmsPhysicsBody"
        >
            {/* --- Collider --- */}
            {/* Choose ONE appropriate collider type */}

            {/* Option 1: Convex Hull (Good balance) */}
            {/* Uses vertices from the first mesh found 
            <ConvexHullCollider args={[colliderArgs.vertices]} />   */}

            {/* Option 2: Trimesh (Most accurate, higher CPU) */}
            {/* Uses vertices AND indices from the first mesh found */}
            {/* <TrimeshCollider args={[colliderArgs.vertices, colliderArgs.indices]} /> */}
  
            {/* Option 3: Cuboid(s) (Simplest physics, manual setup) */}
            {/* Example:        */}
          <CuboidCollider
              args={[ARM_TARGET_WIDTH / 2-0.3, ARM_TARGET_HEIGHT / 3, ARM_TARGET_DEPTH / 2 ]}
              // Position relative to RigidBody center (adjust if needed)
              position={[0-2.2, 0+0.55, 0-1.24]}
              rotation={[0, -Math.PI / 24, 0]} // Keep your desired rotation

          />
     
           

            {/* --- Visual Representation (Loaded Model) --- */}
            {/* This group handles the scale and offset of the visual model */}
            <group
                 ref={visualRef} 
                scale={modelScale}
                position={modelPositionOffset} // Apply calculated offset
                name="ArmsVisualModelContainer"
                rotation={[0, -Math.PI / 24, 0]} // Keep your desired rotation
            >
                {/* Directly render the loaded scene using primitive */}
                {/* The 'object' prop takes the THREE.Object3D (like gltf.scene) */}
                <primitive object={gltf.scene} />
            </group>

            {/* Optional: Add Debug component during development */}
            {/* <Debug /> */}
        </RigidBody>
    );
};



 

const LandingArmsL: React.FC<{ isLanded: boolean }> = ({ isLanded })  => {
  const armsPosition: [number, number, number] = [ARMS_POSITION_X, ARMS_POSITION_Y, ARMS_POSITION_Z];

  // --- Load Model ---
  // useLoader returns the GLTF structure which contains the scene graph
  const gltf = useLoader(GLTFLoader, '/armL.glb');


  
  const visualRef2 = useRef<THREE.Group>(null);

  // rotate when landed
  useFrame((_, dt) => {
    if (isLanded && visualRef2.current) {
      visualRef2.current.rotation.y = -ROT_SPEED  ;
    }
  });


  // --- Scaling ---
  const modelScale = useMemo(() => {
      // Use gltf.scene to calculate bounds
      if (!gltf || !gltf.scene) return new THREE.Vector3(1, 1, 1);

      // Clone the scene to avoid modifying the original loaded object when measuring
      const sceneClone = gltf.scene.clone();
      const box = new THREE.Box3().setFromObject(sceneClone);
      const modelSize = box.getSize(new THREE.Vector3());

      // Using your determined hardcoded scale:
      return new THREE.Vector3(0.14, 0.14, 0.14);

      // OR Calculate dynamically (ensure ARM_TARGET constants are correct & handle zero dimensions)
      // const scaleX = modelSize.x > 1e-6 ? ARM_TARGET_WIDTH / modelSize.x : 1;
      // const scaleY = modelSize.y > 1e-6 ? ARM_TARGET_HEIGHT / modelSize.y : 1;
      // const scaleZ = modelSize.z > 1e-6 ? ARM_TARGET_DEPTH / modelSize.z : 1;
      // Choose scaling strategy (uniform often preferred to avoid distortion)
      // return new THREE.Vector3(scaleY, scaleY, scaleY); // Uniform based on height
      // return new THREE.Vector3(scaleX, scaleY, scaleZ); // Non-uniform

  }, [gltf]); // Recalculate only when gltf loads

  // --- Visual Offset ---
  const modelPositionOffset = useMemo(() => {
      if (!gltf || !gltf.scene) return [0, 0, 0] as [number, number, number];

      // Clone the scene to measure accurately after scaling
      const sceneClone = gltf.scene.clone();
      const box = new THREE.Box3().setFromObject(sceneClone);
      const modelSize = box.getSize(new THREE.Vector3());
      const scaledSize = modelSize.multiply(modelScale); // Size *after* applying modelScale

      // *** IMPORTANT: Verify your model's origin point! ***
      // Assumes origin is at the BASE CENTER of the model.
      // If origin is at GEOMETRIC CENTER, use [0, 0, 0]
      return [0, scaledSize.y / 2, 0] as [number, number, number];
      // return [0, 0, 0]; // Use if origin is geometric center

  }, [gltf, modelScale]); // Recalculate if gltf or scale changes

  // --- Collider Geometry Args ---
  const colliderArgs = useMemo(() => {
      if (!gltf || !gltf.scene) return null;

      const geometries: THREE.BufferGeometry[] = [];
      // Traverse the actual scene graph from the loaded GLTF
      gltf.scene.traverse((child) => {
          // Ensure it's a Mesh with geometry
          if (child instanceof THREE.Mesh && child.geometry) {
              // NOTE: For simplicity, taking the first geometry found.
              // For complex models with multiple meshes, you might need to merge geometries
              // or use compound shapes for accurate colliders.
              if (geometries.length === 0) {
                  geometries.push(child.geometry);
              }
          }
      });

      if (geometries.length === 0) return null;

      const geometry = geometries[0];
      // Check for position attribute which holds vertices
      if (!geometry || !geometry.attributes.position) return null;

      // Get vertices and indices (indices needed for TrimeshCollider)
      const vertices = geometry.attributes.position.array as Float32Array;
      const indices = geometry.index?.array as Uint32Array | Uint16Array;

      // Return data needed for Rapier colliders
      // Note: These vertices are in the local space of the mesh within the GLTF.
      // Scaling/offsetting is handled by the visual <group>, not applied here.
      return { vertices, indices };

  }, [gltf]); // Recalculate only when gltf loads

  // --- Render ---
  // Wait until the GLTF and collider data are ready
  if (!gltf || !gltf.scene || !colliderArgs) {
      // console.warn("LandingArmsR: GLTF model or collider geometry not ready.");
      return null; // Don't render anything yet
  }

  return (
      <RigidBody
          type="fixed"
          position={armsPosition}
          colliders={false} // We define colliders manually below
          userData={{ type: 'platform_arms' }}
          name="LandingArmsPhysicsBody"
      >
          {/* --- Collider --- */}
          {/* Choose ONE appropriate collider type */}

          {/* Option 1: Convex Hull (Good balance) */}
          {/* Uses vertices from the first mesh found
          <ConvexHullCollider args={[colliderArgs.vertices]} /> 

          {/* Option 2: Trimesh (Most accurate, higher CPU) */}
          {/* Uses vertices AND indices from the first mesh found */}
          {/* <TrimeshCollider args={[colliderArgs.vertices, colliderArgs.indices]} /> */}

          {/* Option 3: Cuboid(s) (Simplest physics, manual setup) */}
          {/* Example:*/}
          <CuboidCollider
              args={[ARM_TARGET_WIDTH / 2-0.3, ARM_TARGET_HEIGHT / 3, ARM_TARGET_DEPTH / 2 ]}
              // Position relative to RigidBody center (adjust if needed)
              position={[0-2.2, 0+0.55, 0+1.24]}
              rotation={[0, Math.PI / 24, 0]} // Keep your desired rotation

          />
          
 

          {/* --- Visual Representation (Loaded Model) --- */}
          {/* This group handles the scale and offset of the visual model */}
          <group
          ref={visualRef2} 
              scale={modelScale}
              position={modelPositionOffset} // Apply calculated offset
              name="ArmsVisualModelContainer"
              rotation={[0, Math.PI / 24, 0]} // Keep your desired rotation
          >
              {/* Directly render the loaded scene using primitive */}
              {/* The 'object' prop takes the THREE.Object3D (like gltf.scene) */}
              <primitive object={gltf.scene} />
          </group>

          {/* Optional: Add Debug component during development */}
          {/* <Debug /> */}
      </RigidBody>
  );
};



























/* 

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


 */





















 
  //  Capture Zone Visualizer Component
 // Renders a semi-transparent box representing the target landing volume.
 
const CaptureZoneVisualizer = () => {
    // The visualizer box should represent the entire vertical tolerance range.
    // Its height is therefore `CAPTURE_VERTICAL_TOLERANCE * 2`.
    const visualizerHeight = 6.2; // 6.0

    // The box needs to be centered vertically at CAPTURE_TARGET_Y.
    const visualizerPosition = new THREE.Vector3(
        PLATFORM_CENTER_X-2,
        CAPTURE_TARGET_Y-3.8, // Center the visual box at the target Y
        PLATFORM_CENTER_Z
    );

    return (
        <mesh position={visualizerPosition} name="captureZoneVisualizer">
            <boxGeometry args={[CAPTURE_ZONE_WIDTH, visualizerHeight, CAPTURE_ZONE_DEPTH]} />
            <meshStandardMaterial
                color="yellow" // Use a distinct color
                transparent={true}
                opacity={0.35} // Make it semi-transparent
                depthWrite={true} // Optional: prevent writing to depth buffer if it causes Z-fighting
            />
        </mesh>
    );
};




/* 

  
 */
























/* 

const CUBE_SIZE = 1; // Size of each side of the cube
const CUBE_GEOMETRY_ARGS = [CUBE_SIZE, CUBE_SIZE, CUBE_SIZE];
const CUBE_MATERIAL_PROPS = {
    color: "red",
    transparent: true,
    opacity: 0.45,
    depthWrite: false, // Keep original material properties
};
const MAX_CUBES = 10;
 */

/**
 * Creates a vertical stack of semi-transparent cubes.
 * @param {object} props - Component props.
 * @param {number} [props.count=5] - The number of cubes to stack (capped at 10).
 * @param {THREE.Vector3 | [number, number, number]} [props.position=[0, 0, 0]] - The base position for the bottom cube's center.
 */

/* 
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
 */





















/**
 * Helper function to generate a random starting position for the rocket.
 */
const getRandomStartPosition = (): THREE.Vector3 => {
    const range = ROCKET_START_XZ_RANGE;
    const randomX = Math.random() * range * 2 - range;
    const randomZ = Math.random() * range * 2 - range;
     // return new THREE.Vector3(randomX, ROCKET_START_Y, randomZ);  
   return new THREE.Vector3(-2, 13, 0); // set to easy to start to debug

};

























function Loaderr() {
  const { progress } = useProgress();
  return <Text>{`Loading Model: ${progress.toFixed(0)}%`}</Text>; // Basic text loader
}






















/**
 * main FallingRocket object that falls from sky with attached flame.
 */
const FallingRocket = ({ rocketName , isGameActive,  onLandedChange }: { rocketName: string, isGameActive: boolean,  onLandedChange: boolean }) => {
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
      ROCKET_WIDTH / 2+0.16,
      ROCKET_HEIGHT / 2,
      ROCKET_WIDTH / 2+0.16
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
    
        // Call the parent callback when landing state changes
        if (newState === 'landed') {
          onLandedChange?.(true); // Rocket has landed
      } else if (newState === 'playing' || newState === 'crashed') {
           // If transitioning back to playing (e.g., reset) or crashed, it's not landed
          onLandedChange?.(false);
      }
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
  // Only process collisions if playing or resetting
  if (gameStateRef.current !== 'playing' && gameStateRef.current !== 'resetting') {
       if(gameStateRef.current === 'landed') return;
       // return; // Keep commented out unless needed for specific crash behavior
  }

  // --- CHANGE HERE: Access the RigidBody's userData ---
  // Use optional chaining (?.) for safety in case userData is missing
  const otherUserData = event.other.rigidBody?.userData as { type?: string };

  // Check if collided with floor, platform tower, or the platform arms
  // --- CHANGE HERE: Match the RigidBody's userData type ---
  if (otherUserData?.type === 'floor' || otherUserData?.type === 'platform_tower' || otherUserData?.type === 'platform_arms') {
      // Prevent switching from landed to crashed
      if (gameStateRef.current !== 'landed') {
          setGameState('crashed');
          // --- CHANGE HERE: Update message to match the type ---
          setStatusMessage(`CRASHED on ${otherUserData.type}! Press R.`);
          // Physics engine handles stopping/resting. Explicitly zeroing velocity is optional.
           if (rocketApi.current) {
               rocketApi.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
               rocketApi.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
           }
      }
  }
   // Add more specific collision logic if needed
};




  const resetGame = () => {
    landedPositionRef.current = null;
landedRotationRef.current = null;
    setGameState('resetting');
    const newStartPosition = getRandomStartPosition();
    const newWind = getRandomWindVector();
    timeInCaptureZoneRef.current = 0;
    if (flameRef.current) flameRef.current.visible = false;
    flameOpacityRef.current = 0;
    setStatusMessage('');

    if (rocketApi.current) {
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
     //keysPressed.current.clear();
    windVector.current.copy(newWind);

    // Short delay before setting state back to playing allows physics state to settle
    setTimeout(() => {
      setGameState('playing');
       
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
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 33100);
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
      if (!isGameActive) return; 
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
   
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysPressed.current.clear(); // Clear keys on unmount/cleanup
    };
  }, [resetGame, isGameActive]);



////////////////                     ////////////////
//////////////   useFrame        ////////////////
/////////////                 ////////////////
  const wasThrustingRef = useRef(false);

  const landedPositionRef = useRef<{ x: number, y: number, z: number } | null>(null);
const landedRotationRef = useRef<{ x: number, y: number, z: number, w: number } | null>(null);


  useFrame((state, delta) => {
    if (!isGameActive || !rocketApi.current || !rocketRef.current || gameStateRef.current === 'resetting') 
  { 
    return;}

    const dt = Math.min(delta, 0.05); // Clamp delta time
    const isPlaying = gameStateRef.current === 'playing';
    const isThrusting = isPlaying && keysPressed.current.has(THRUST_KEY);
  
    // --- Handle Flame Visibility ---
    const fadeSpeed = 0.8;
    if (isThrusting) {
      flameOpacityRef.current = 1;
    } else {
      flameOpacityRef.current = Math.max(0, flameOpacityRef.current - dt * fadeSpeed);
    }
    if (flameRef.current) {
      flameRef.current.visible = flameOpacityRef.current > 0.01;
    }
    console.log(  flameRef.current.visible, "---flameRef.current.visible ");
  
    // --- Apply Forces if Playing ---
    if (isPlaying) {
      const body = rocketApi.current;
      const force = { x: 0, y: 0, z: 0 }; // Use force vector
  
      // Apply Thrust Force
      if (isThrusting ) {
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
      
      const isInHorizontalZoneX = Math.abs(currentPosition.x - (PLATFORM_CENTER_X - 2)) <= CAPTURE_ZONE_WIDTH / 2;
      const isInHorizontalZoneZ = Math.abs(currentPosition.z - PLATFORM_CENTER_Z) <= CAPTURE_ZONE_DEPTH / 2;
      // TODO: Add speed/tilt checks using physics body data (linvel, angvel, rotation)
      //   console.log(isInHorizontalZoneX, "isInHorizontalZoneX"  );
      //   console.log( isInHorizontalZoneZ, "isInHorizontalZoneZ");

      const currentLinVel = body.linvel(); // Re-fetch if needed after clamping - Now safe to fetch here
      // const verticalSpeedOK = Math.abs(currentLinVel.y) <= MAX_LANDING_SPEED_VERTICAL;
      // const horizontalSpeedOK = Math.sqrt(currentLinVel.x**2 + currentLinVel.z**2) <= MAX_LANDING_SPEED_HORIZONTAL;
      // Check tilt using body.rotation() quaternion

      const conditionsMet = isInHorizontalZoneX && isInHorizontalZoneZ; // Add other conditions here
      //   console.log(conditionsMet, "conditions MET");

      if (conditionsMet) {
      console.log(  gameStateRef.current, "gameStateRef.current ");

        isInCaptureZone = true;
        timeInCaptureZoneRef.current += dt;
        setStatusMessage(`In capture zone... ${timeInCaptureZoneRef.current.toFixed(1)} / ${REQUIRED_CAPTURE_TIME.toFixed(1)}s`);
      console.log(  timeInCaptureZoneRef.current, "timeInCaptureZoneRef.current ");
      console.log(  isThrusting, "--      isThrusting      --  ");

    
        if (timeInCaptureZoneRef.current >= REQUIRED_CAPTURE_TIME) {
          console.log("SUCCESSFUL CAPTURE");
          
          // Important: First set the game state to 'landed' before modifying physics

          
    // Snap and freeze the rocket at the landing spot
    const snapPos = { x: PLATFORM_CENTER_X - 2, y: CAPTURE_TARGET_Y - 4.61, z: PLATFORM_CENTER_Z };
    const snapRot = { x: 0, y: 0, z: 0, w: 1 };
    rocketApi.current.setTranslation(snapPos, true);
    rocketApi.current.setRotation(snapRot, true);
    landedPositionRef.current = snapPos;
    landedRotationRef.current = snapRot;
    rocketApi.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rocketApi.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    setGameState('landed');
    setStatusMessage(`Captured! Press R.`);
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


if (gameStateRef.current === 'landed' && rocketApi.current && landedPositionRef.current && landedRotationRef.current) {
  rocketApi.current.setTranslation(landedPositionRef.current, true);
  rocketApi.current.setRotation(landedRotationRef.current, true);
  rocketApi.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
  rocketApi.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
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
      {/*<mesh name="physicsBoundingBoxVisualizer">*/}
       {/* <boxGeometry args={visualBoundingBoxArgs} />*/}
       {/* <meshBasicMaterial*/}
       {/*     color="lime"      // Bright color for visibility*/}
       {/*     wireframe={true}  // Show as wireframe to see the model inside*/}
       {/*     transparent={true} // Allow seeing through*/}
       {/*     opacity={0.6}     // Make it semi-transparent*/}
       {/*     depthWrite={false}// Optional: Prevents potential z-fighting issues*/}
       {/*  />*/}
       {/*</mesh>*/}
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
                  particleCount={4150}
                   
                  flameHeight={5.5}
                  emitterRadius={0.3}
                  particleSize={0.11}
                  colorStart={new THREE.Color(0xff2a00)}
                  colorEnd={new THREE.Color(0xfff600)}
                  opacityRef={flameOpacityRef}
              />
      </RigidBody>
  );
};









































 



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
      const stationaryViewport = { x: pipViewport.x , y: pipViewport.y -300, width: pipWidth, height: pipHeight }; // Adjust position as needed
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

  const [isGameStarted, setIsGameStarted] = useState(true);
  const [isRocketLanded, setIsRocketLanded] = useState(false);

  const [stationaryCamera] = useState(() => {
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    cam.name = STATIONARY_CAMERA_NAME;
    cam.position.set(2, -1.3, -1); // Position the camera
    cam.lookAt(new THREE.Vector3(-2.5, PLATFORM_TOP_Y, 0.5)); // Look at the platform
    return cam;
  });
 
  const worldGravity: [number, number, number] = [0, -9.81 * 0.8, 0]; // Example: Slightly less than Earth gravity

  const handleLandedChange = React.useCallback((landed: boolean) => {
     
    setIsRocketLanded(landed);
}, []); // Empty dependency array means this function identity is stable

  const handleStartGame = () => {
    setIsGameStarted(true);
  };

   // NOTE: Game state is currently managed within FallingRocket.
  // Consider lifting state up here if more components need it.
  // const [gameState, setGameState] = useState<GameState>('playing');
  // const [statusMessage, setStatusMessage] = useState<string>('');

  const InitialPopup = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000, // Ensure it's above the canvas
      color: 'white',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        backgroundColor: '#282c34', // Dark background for the modal content
        padding: '30px',
        borderRadius: '10px',
        textAlign: 'center',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
        maxWidth: '500px', // Max width for the popup
      }}>
        <h2>Welcome to Rocket Lander!</h2>
        {/* Replace with your actual image path in the public folder */}
        <img
          src="/rocket_lander_logo.png" // <<<--- CHANGE THIS TO YOUR IMAGE PATH
          alt="Rocket Lander"
          style={{ maxWidth: '80%', height: 'auto', margin: '20px 0', borderRadius: '5px' }}
        />
        <p style={{ marginBottom: '25px', lineHeight: '1.5' }}>
          Prepare for a challenging landing sequence. Use your thrusters carefully
          to guide the booster onto the catch tower. Good luck!
        </p>
        <button
          onClick={handleStartGame}
          style={{
            padding: '12px 25px',
            fontSize: '18px',
            cursor: 'pointer',
            backgroundColor: '#61dafb', // React-like blue
            color: '#282c34',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#50c3e0'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#61dafb'}
        >
          Start Simulation
        </button>
      </div>
    </div>
  );


  const sendReset = React.useCallback(() => {
    /* simulate “R” key which your rocket already listens to */
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
  }, []);


  return (
 
         <>
<Canvas
      style={{ 
        position: 'fixed', // Position it relative to the viewport
        top: 0,
        left: 0,
        width: '100%',    // Fill the width of the viewport
        height: '100%',   // Fill the height of the viewport
        background: 'linear-gradient(to bottom,rgb(250, 190, 101) 20%,rgb(112, 168, 228) 100%)',
        touchAction: 'none' 
      
      }}
      shadows
      // Disable default rendering loop if using custom MultiViewRenderer that handles it
      // frameloop="demand" // Or manage manually if MultiViewRenderer isn't rendering every frame
    >
  {/*
    <fog attach="fog" args={['#abcdef', 50, 170]} />
    */}    
  
        {/* Main Camera */}
        <PerspectiveCamera
            makeDefault
            position={[-21, 11, 40]} // Adjusted position slightly for better view of tall platform
            near={0.1} // Default near clipping plane - good practice to specify
 
            far={250} 
            // Optional: Adjust frustum bounds if needed for aspect ratio
            // left={-aspect * frustumSize / 2}
            // right={aspect * frustumSize / 2}
            // top={frustumSize / 2}
            // bottom={-frustumSize / 2}
        />

<primitive object={stationaryCamera} />
 
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
             {/*  <CockpitCameraDebugger /> */}

              <Physics gravity={worldGravity}    debug   paused={!isGameStarted}>
              
      {/* Scene Content */}
      <Suspense fallback={null}>

        {/* */}
        <LandingPlatform /> 

        <LandingArmsL  isLanded={isRocketLanded}/>
        <LandingArmsR isLanded={isRocketLanded}/>
        <StationRoad/>
        {/*
        <PlatformArm1 />
        <PlatformArm2 /> 
        */}

        
        {/* Add the capture zone visualizer 
        <CaptureZoneVisualizer />           */}
        {/* < CubeStackVisualizer/>*/}
        <FallingRocket  onLandedChange={handleLandedChange} rocketName={ROCKET_MESH_NAME } isGameActive={isGameStarted} /> {/* Contains game state logic */}
        <LandingFloor/>
        < Waterfloor/>
        {/* <Text> component could be added here for status messages if state is lifted */}
      </Suspense>
      </Physics>
      {/* Controls */}
      <OrbitControls enableRotate={true} enablePan={true} enableZoom={true} />
      {/* Custom Renderer for PiP */}
      <MultiViewRenderer />

       {/*
       <RotatingCamera active={isRocketLanded} />
        */}

    </Canvas>
      <InstructionsUI />
      <WinDrawer open={isRocketLanded} onRestart={sendReset} />

      



      {!isGameStarted && <InitialPopup />}
     </>
  );
};

export default RocketLandingScene;