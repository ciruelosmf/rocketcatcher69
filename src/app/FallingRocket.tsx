// \src\app\page.tsx
"use client"

import React, { Suspense, useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, useTexture , Text, View, PerspectiveCamera, useProgress, Stats  } from '@react-three/drei';
import * as THREE from 'three';
import AxesHelperComponent from './AxesHelperComponent';
import { Physics, RigidBody , CuboidCollider, CollisionPayload,
} from '@react-three/rapier';
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
const FallingRocket = ({
  rocketName,
  isGameActive,
  onLandedChange, // Existing prop
  onCrashedChange // <<< ADD THIS PROP
}: {
  rocketName: string;
  isGameActive: boolean;
  onLandedChange: (landed: boolean) => void; // Keep existing
  onCrashedChange: (crashed: boolean) => void; // <<< ADD THIS TYPE
})  => {
  // --- Refs ---
  const rocketApi = useRef<RapierRigidBody>(null!); // Ref for Rapier API
  const rocketRef = useRef<THREE.Mesh>(null!); // Ref for visual mesh (for tilt)
  // Remove the old velocity ref: const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const keysPressed = useRef(new Set<string>());
  const flameRef = useRef<THREE.Points>(null!);
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

        const previousState = gameStateRef.current;
        gameStateRef.current = newState;
        _setGameState(newState);
    
        // Call the parent callback when landing state changes
        if (newState === 'landed') {
          onLandedChange?.(true); // Rocket has landed
      } else if (newState === 'playing' || newState === 'crashed') {
           // If transitioning back to playing (e.g., reset) or crashed, it's not landed
          onLandedChange?.(false);
      }

      // Landed State
      if (newState === 'landed' && previousState !== 'landed') {
        onLandedChange?.(true);
    } else if (newState !== 'landed' && previousState === 'landed') {
         // If moving AWAY from landed (e.g., reset)
        onLandedChange?.(false);
    }

    // Crashed State <<< ADD THIS LOGIC
    if (newState === 'crashed' && previousState !== 'crashed') {
        onCrashedChange?.(true); // Signal crash start
    } else if (newState !== 'crashed' && previousState === 'crashed') {
         // If moving AWAY from crashed (e.g., reset)
        onCrashedChange?.(false); // Signal crash end
    }

    // Ensure landed/crashed flags are false if resetting or playing
    if (newState === 'playing' || newState === 'resetting') {
        onLandedChange?.(false);
        onCrashedChange?.(false);
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
  const currentGameState = gameStateRef.current; // Get current state for checks

  // --- PRIMARY CHECK: Only detect crashes when actively playing ---
  if (currentGameState === 'playing') {
      const otherUserData = event.other.rigidBody?.userData as { type?: string };

      // Check if the collided object is one that causes a crash
      const isCrashSurface = otherUserData?.type === 'floor' ||
                             otherUserData?.type === 'platform_tower' ||
                             otherUserData?.type === 'platform_arms';

      if (isCrashSurface) {
          // We were playing and hit a crash surface -> transition to crashed state
          setGameState('crashed');
          setStatusMessage(`CRASHED on ${otherUserData.type}! Press R.`);

          // Stop the rocket immediately upon crash
          if (rocketApi.current) {
              rocketApi.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
              rocketApi.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
          }
      }
      // If playing and collided with something else (e.g., another dynamic object if added later),
      // do nothing specific here, let physics handle it.

  } else {
      // If the state is 'landed', 'crashed', or 'resetting', we generally
      // don't need to do anything special on further collisions.
      // console.log(`Collision ignored in state: ${currentGameState}`); // Optional for debugging
      return;
  }
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





























 

export default FallingRocket;