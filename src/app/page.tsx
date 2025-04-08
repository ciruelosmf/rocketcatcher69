"use client"

import React, { Suspense, useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Text, View, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import AxesHelperComponent from './AxesHelperComponent';


import Flame from './FlameComponent'; // Import the Flame component



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
console.log(CAPTURE_TARGET_Y,CAPTURE_ZONE_MIN_Y,CAPTURE_ZONE_MAX_Y  ,"CAPTURE_TARGET_Y...");



// --- Capture Time ---
const REQUIRED_CAPTURE_TIME = 2.1; // Seconds required inside the zone


// Rocket Physics & Control
const ROCKET_START_Y = 1;
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
const ROCKET_MAIN_THRUST = 1.0;
const ROCKET_MAX_FALL_SPEED = 4.0;
const ROCKET_MAX_RISE_SPEED = 2.5;
const ROCKET_DRAG_VERTICAL = 0.15;

// Horizontal Plane Physics (XZ-Axis)
const ROCKET_MANEUVER_THRUST = 2.0;
const ROCKET_MAX_XZ_SPEED = 1.8;
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

// Wind
const WIND_MAX_STRENGTH = 0.001; // 0 orginal
const getRandomWindVector = (): THREE.Vector3 => {
    const angle = Math.random() * Math.PI * 2;
    const strength = Math.random() * WIND_MAX_STRENGTH;
    const windX = Math.cos(angle) * strength;
    const windZ = Math.sin(angle) * strength;
    return new THREE.Vector3(windX, 0, windZ);
}

// Camera Names

// --- Components ---

/**
 * Landing Floor Component
 */
const LandingFloor = () => {
  return (
    <mesh position={[0, PLATFORM_Y, 0]} receiveShadow name="floor">
      <boxGeometry args={[64, FLOOR_HEIGHT, 64]} />
      <meshStandardMaterial color="#3aa2f6" metalness={4.8} roughness={2.3} />
    </mesh>
  );
};

/**
 * Landing Platform Component (Tall Tower Structure)
 */
const LandingPlatform = () => {
    // Position the center of the tall platform mesh correctly
    // Its center Y will be halfway between PLATFORM_Y and PLATFORM_TOP_Y
    const platformCenterY = PLATFORM_Y + PLATFORM_HEIGHT / 2;
    const platformPosition = new THREE.Vector3(PLATFORM_CENTER_X, platformCenterY, PLATFORM_CENTER_Z);

    return (
      <mesh
        position={platformPosition}
        receiveShadow
        name="platform"
        userData={{
            isLandingPlatform: true,
            width: PLATFORM_WIDTH,
            depth: PLATFORM_DEPTH,
            height: PLATFORM_HEIGHT, // Store height
            topY: PLATFORM_TOP_Y, // Store calculated top Y (-2.0)
            minX: PLATFORM_CENTER_X - PLATFORM_WIDTH / 2,
            maxX: PLATFORM_CENTER_X + PLATFORM_WIDTH / 2,
            minZ: PLATFORM_CENTER_Z - PLATFORM_DEPTH / 2,
            maxZ: PLATFORM_CENTER_Z + PLATFORM_DEPTH / 2,
        }}
      >
        {/* Geometry uses full height */}
        <boxGeometry args={[PLATFORM_WIDTH, PLATFORM_HEIGHT, PLATFORM_DEPTH]} />
        <meshStandardMaterial color="darkblue" metalness={0.8} roughness={0.3}/>
      </mesh>
    );
  };




  

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
    // return new THREE.Vector3(randomX, ROCKET_START_Y, randomZ); original
    return new THREE.Vector3(-2, 2, 1); // set to easy to start to debug

};


/**
 * Player Controlled Rocket Component
 */
const FallingRocket = ({ rocketName }: { rocketName: string }) => {
  const rocketRef = useRef<THREE.Mesh>(null!);
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const keysPressed = useRef(new Set<string>());
  const windVector = useRef<THREE.Vector3>(getRandomWindVector());
 
  // --- State ---
  const [initialPosition, setInitialPosition] = useState<THREE.Vector3>(getRandomStartPosition);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [statusMessage, setStatusMessage] = useState<string>('');


  const timeInCaptureZoneRef = useRef<number>(0);


  // --- Reset Game Function ---
  const resetGame = () => {
    console.log("Resetting game...");
    setGameState('resetting'); // Intermediate state to prevent updates during reset
    const newStartPosition = getRandomStartPosition();
    const newWind = getRandomWindVector();


    // Reset capture timer on game reset
    timeInCaptureZoneRef.current = 0;
    
    // Use setTimeout to ensure state update propagates before resetting physics
    setTimeout(() => {
      if (rocketRef.current) {
        rocketRef.current.position.copy(newStartPosition);
        rocketRef.current.rotation.set(0, 0, 0);
      }
      velocity.current.set(0, 0, 0);
      windVector.current.copy(newWind);
      keysPressed.current.clear(); // Clear any stuck keys
      setInitialPosition(newStartPosition); // Update state if needed elsewhere
      setStatusMessage('');
      setGameState('playing');
      console.log("Game reset complete. New Wind:", newWind);
    }, 10); // Short delay
  };


  // --- Create the Cockpit Camera ---
  const [cockpitCamera] = useState(() => {
    const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    cam.name = COCKPIT_CAMERA_NAME;
    cam.position.set(0, ROCKET_CENTER_TO_TOP - 0.5, 0); // Position inside, near the top, looking forward
    cam.rotation.set(THREE.MathUtils.degToRad(-15), 0, 0); // Slight downward tilt
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

  // --- Keyboard Event Handling ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === RESET_KEY && gameState !== 'playing') {
        resetGame();
        return;
      }
      if (gameState === 'playing') {
           keysPressed.current.add(event.key);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current.delete(event.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    console.log("Initial Wind:", windVector.current);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, resetGame]);













  // --- Frame Update Logic (Physics, Collision, Animation) ---
  useFrame((state, delta) => {
    if (!rocketRef.current || gameState === 'resetting') return;

    const dt = Math.min(delta, 0.05);
    const rocket = rocketRef.current;
    const currentPosition = rocket.position;
    const currentVelocity = velocity.current;
    const currentRotation = rocket.rotation;

    // Only update physics and rotation if playing
    if (gameState === 'playing') {

        // --- 1. Determine Forces/Acceleration ---
        let inputAccelerationX = 0;
        let inputAccelerationZ = 0;
        if (keysPressed.current.has(LEFT_KEY))  inputAccelerationX -= ROCKET_MANEUVER_THRUST;
        if (keysPressed.current.has(RIGHT_KEY)) inputAccelerationX += ROCKET_MANEUVER_THRUST;
        if (keysPressed.current.has(UP_KEY))    inputAccelerationZ -= ROCKET_MANEUVER_THRUST;
        if (keysPressed.current.has(DOWN_KEY))  inputAccelerationZ += ROCKET_MANEUVER_THRUST;

        let verticalAcceleration = -ROCKET_FALL_ACCELERATION;
        if (keysPressed.current.has(THRUST_KEY)) {
            verticalAcceleration += ROCKET_MAIN_THRUST;
        }

        const totalAccelerationX = inputAccelerationX + windVector.current.x;
        const totalAccelerationZ = inputAccelerationZ + windVector.current.z;

        // --- 2. Update Velocity ---
        currentVelocity.x += totalAccelerationX * dt;
        currentVelocity.z += totalAccelerationZ * dt;
        currentVelocity.x *= (1 - ROCKET_DRAG_XZ * dt);
        currentVelocity.z *= (1 - ROCKET_DRAG_XZ * dt);

        currentVelocity.y += verticalAcceleration * dt;
        currentVelocity.y *= (1 - ROCKET_DRAG_VERTICAL * dt);

        // --- 3. Clamp Velocity ---
        currentVelocity.x = THREE.MathUtils.clamp(currentVelocity.x, -ROCKET_MAX_XZ_SPEED, ROCKET_MAX_XZ_SPEED);
        currentVelocity.z = THREE.MathUtils.clamp(currentVelocity.z, -ROCKET_MAX_XZ_SPEED, ROCKET_MAX_XZ_SPEED);
        currentVelocity.y = THREE.MathUtils.clamp(currentVelocity.y, -ROCKET_MAX_FALL_SPEED, ROCKET_MAX_RISE_SPEED);

        // --- 4. Update Position ---
        currentPosition.x += currentVelocity.x * dt;
        currentPosition.y += currentVelocity.y * dt;
        currentPosition.z += currentVelocity.z * dt;

        // --- 5. Handle Rotation Animation ---
        let targetRotationZ = 0;
        if (keysPressed.current.has(LEFT_KEY))  targetRotationZ = ROCKET_TILT_ANGLE_Z;
        else if (keysPressed.current.has(RIGHT_KEY)) targetRotationZ = -ROCKET_TILT_ANGLE_Z;

        let targetRotationX = 0;
        if (keysPressed.current.has(UP_KEY))    targetRotationX = -ROCKET_TILT_ANGLE_X;
        else if (keysPressed.current.has(DOWN_KEY)) targetRotationX = ROCKET_TILT_ANGLE_X;
        currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotationX, dt * ROCKET_ROTATION_SPEED * 5);
        currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotationZ, dt * ROCKET_ROTATION_SPEED * 5);
        currentRotation.y = 0;


      // --- 3. Capture Zone Logic & Timer ---
      let isInCaptureZone = false; // Flag to track if conditions are met this frame
      const isInVerticalZone = currentPosition.y >= CAPTURE_ZONE_MIN_Y && currentPosition.y <= CAPTURE_ZONE_MAX_Y;


      //console.log(isInVerticalZone, "if (isInVerticalZone)_____________");
     // console.log(currentPosition.y , " (currentPosition.y ");
     // console.log( CAPTURE_ZONE_MIN_Y, "CAPTURE_ZONE_MIN_Y");
     //console.log(CAPTURE_ZONE_MAX_Y, " CAPTURE_ZONE_MAX_Y");
      //console.log( "");


















      if (isInVerticalZone) {

        // Check if rocket's CENTER is horizontally within the capture zone bounds



        const isInHorizontalZoneX = Math.abs(currentPosition.x - PLATFORM_CENTER_X +1 ) <= CAPTURE_ZONE_WIDTH / 2;

        //console.log( currentPosition.x,"currentPosition.x");
        //console.log( PLATFORM_CENTER_X,"PLATFORM_CENTER_X");
        //console.log( CAPTURE_ZONE_WIDTH,"CAPTURE_ZONE_WIDTH");
        //console.log( isInHorizontalZoneX,"isInHorizontalZoneX");
        //console.log(( currentPosition.x - PLATFORM_CENTER_X +1),"=currentPosition.x - PLATFORM_CENTER_X +1", "CAPTURE_ZONE_WIDTH / 2=",CAPTURE_ZONE_WIDTH / 2);

       // console.log( "");



        const isInHorizontalZoneZ = Math.abs(currentPosition.z - PLATFORM_CENTER_Z) <= CAPTURE_ZONE_DEPTH / 2;



         // console.log(Math.abs(currentPosition.x - PLATFORM_CENTER_X -1 ), "abs / CAPTURE_ZONE_WIDTH div 2", CAPTURE_ZONE_WIDTH / 2);

          //console.log( "");
         // console.log( currentPosition.z ,",,,", PLATFORM_CENTER_Z,"currentPosition.z ,,,,,, PLATFORM_CENTER_Z");
 

          //console.log(Math.abs(currentPosition.z - PLATFORM_CENTER_Z ), "abs / CAPTURE_ZONE_WIDTH div 2", CAPTURE_ZONE_DEPTH / 2);

        // --- Placeholder for future checks ---
        // TODO: Add speed and tilt checks here later
        const verticalSpeedOK = true; // Math.abs(currentVelocity.y) <= MAX_LANDING_SPEED_VERTICAL;
        const horizontalSpeedOK = true; // Math.sqrt(currentVelocity.x**2 + currentVelocity.z**2) <= MAX_LANDING_SPEED_HORIZONTAL;
        const tiltOK = true; // Math.sqrt(currentRotation.x**2 + currentRotation.z**2) <= MAX_LANDING_TILT_RADIANS;
        // --- End Placeholder ---

        // Check if ALL conditions are met (currently just position)
        if (isInHorizontalZoneX && isInHorizontalZoneZ && verticalSpeedOK && horizontalSpeedOK && tiltOK) {
            isInCaptureZone = true; // All conditions met this frame
            timeInCaptureZoneRef.current += dt; // Increment timer

            // Update status message to show timer progress
            setStatusMessage(`In capture zone... Holding for ${timeInCaptureZoneRef.current.toFixed(1)} / ${REQUIRED_CAPTURE_TIME.toFixed(1)}s`);
            console.log(statusMessage);
 

            // Check if required time has been reached
            if (timeInCaptureZoneRef.current >= REQUIRED_CAPTURE_TIME) {
                // Successful Capture!
                setGameState('landed');
                setStatusMessage(`Captured! Held position for ${REQUIRED_CAPTURE_TIME.toFixed(1)}s. Press R.`);
                console.log("SUCCESSFUL CAPTURE");

                // Snap to final "caught" position/orientation (centered in the zone)
                currentPosition.y = CAPTURE_TARGET_Y;
                currentPosition.x = PLATFORM_CENTER_X;
                currentPosition.z = PLATFORM_CENTER_Z;
                currentRotation.x = 0;
                currentRotation.z = 0;
                currentRotation.y = 0;
                currentVelocity.set(0, 0, 0);
                // No return here yet, let fallback checks run (though they shouldn't trigger if landed)
            }
        }
    }

    // If not meeting *all* capture conditions this frame, reset the timer
    if (!isInCaptureZone) {
        // Only reset the message if it was showing timer progress
        if (timeInCaptureZoneRef.current > 0) {
             setStatusMessage(''); // Clear timer message if leaving zone/failing conditions
        }
        timeInCaptureZoneRef.current = 0;
    }


    // --- 4. Fallback Collision Checks (Platform Surface / Floor) ---
    // These checks run *after* the capture logic. They only matter if not already landed/crashed.
    // Use rocket base for physical collision checks.
    const rocketBottomY = currentPosition.y - ROCKET_BASE_OFFSET;
    const isMovingDown = currentVelocity.y < 0; // Check if moving downwards

    // Check Platform Surface Collision (Only if moving down and missed capture)
    if (isMovingDown && rocketBottomY <= PLATFORM_TOP_Y) {
         // Check horizontal position relative to the *physical* platform (wider than capture zone maybe)
        const onPlatformX = Math.abs(currentPosition.x - PLATFORM_CENTER_X) <= PLATFORM_WIDTH / 2;
        const onPlatformZ = Math.abs(currentPosition.z - PLATFORM_CENTER_Z) <= PLATFORM_DEPTH / 2;

        if (onPlatformX && onPlatformZ) {
            console.log("Contact with platform surface (missed capture).");
            setGameState('crashed');
            setStatusMessage(`CRASHED! Hit platform surface. Aim for the capture zone! Press R.`);
            // Snap to surface, stop motion
            currentPosition.y = PLATFORM_TOP_Y + ROCKET_BASE_OFFSET;
            currentVelocity.set(0, 0, 0);
            // Optional crash rotation?
            return; // Exit frame update after crash
        }
         // If vertically at platform level but horizontally off, continue falling to floor check
    }

    // Check Floor Collision (Only if moving down)
    if (isMovingDown && rocketBottomY <= FLOOR_TOP_Y) {
        console.log("Contact with floor!");
        setGameState('crashed');
        setStatusMessage(`CRASHED on floor! Missed everything. Press R.`);
        // Snap to floor, stop motion
        currentPosition.y = FLOOR_TOP_Y + ROCKET_BASE_OFFSET;
        currentVelocity.set(0, 0, 0);
        // Optional crash rotation?
        return; // Exit frame update after crash
    }

    // --- 5. Fall Off Bottom Check --- (unchanged)
    if (currentPosition.y < SCENE_BOUNDS_BOTTOM) {
        console.log("Fell off bottom.");
        setGameState('crashed');
        setStatusMessage('Lost in space... Press R to reset.');
        // Stop velocity to prevent further updates after falling off
        currentVelocity.set(0, 0, 0);
    }

} else {
    // If landed or crashed, ensure velocity stays zero
    currentVelocity.set(0, 0, 0);
}

});


  // --- Visual Feedback based on State ---
   const rocketColor = gameState === 'landed' ? 'lime' : gameState === 'crashed' ? 'red' : '#ADD8E6';
   const rocketEmissive = gameState === 'landed' ? 'green' : gameState === 'crashed' ? 'darkred' : '#4682B4';

  return (
    <mesh ref={rocketRef} name={rocketName}   position={initialPosition} castShadow>
     
      <boxGeometry args={[ROCKET_WIDTH, ROCKET_HEIGHT, ROCKET_WIDTH]} />
      <meshStandardMaterial color={rocketColor} emissive={rocketEmissive} metalness={0.5} roughness={0.5} />
      {/* Cockpit camera is added via useLayoutEffect */}
    </mesh>
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
          // Calculate desired camera position relative to rocket's current world matrix
          // Position inside, near the top, slightly forward for view
          const cameraPosition = new THREE.Vector3(0, ROCKET_CENTER_TO_TOP - 0.5, 0.1);
          cameraPosition.applyMatrix4(rocket.matrixWorld); // Transform local offset to world space
          cockpitCam.position.copy(cameraPosition);

          // Calculate look-at point relative to rocket
          // Look slightly down and forward from camera's new position
          const lookAtOffset = new THREE.Vector3(0, -0.5, -2); // Adjust Z to look further/closer
          const lookAtPosition = lookAtOffset.applyMatrix4(rocket.matrixWorld); // Transform local offset to world space
          // OR simpler: look forward along rocket's negative Z axis, slightly tilted down
          // const lookDirection = new THREE.Vector3(0, -0.2, -1); // Local direction
          // lookDirection.transformDirection(rocket.matrixWorld); // Convert direction to world space
          // lookAtPosition.copy(cameraPosition).add(lookDirection);

          cockpitCam.lookAt(lookAtPosition);

          // View component might handle aspect ratio updates based on portal size,
          // but manual update can be safer if needed.
          // cockpitCam.updateProjectionMatrix();
      }
  });

  return null; // This component doesn't render anything itself
};















const MultiViewRenderer = () => {
  const { gl, scene, camera, size } = useThree();

  useFrame(() => {
    const cockpitCam = scene.getObjectByName(COCKPIT_CAMERA_NAME) as THREE.PerspectiveCamera | undefined;

    // Define viewports
    const mainViewport = { x: 0, y: 0, width: size.width, height: size.height };
    const pipWidth = Math.floor(size.width / 4);
    const pipHeight = Math.floor(size.height / 4);
    const pipX = size.width - pipWidth - 10;
    const pipY = size.height - pipHeight - 10; // Dynamic Y position
    const pipViewport = { x: pipX, y: pipY, width: pipWidth, height: pipHeight };

    gl.autoClear = false;
    gl.clear(); // Clears color and depth buffers for the entire canvas

    // Render Main View
    gl.setViewport(mainViewport.x, mainViewport.y, mainViewport.width, mainViewport.height);
    gl.setScissor(mainViewport.x, mainViewport.y, mainViewport.width, mainViewport.height);
    gl.setScissorTest(true);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = mainViewport.width / mainViewport.height;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      // Since makeDefault is used with @react-three/fiber, resizing is handled automatically
    }
    gl.render(scene, camera);

    // Render Cockpit View
    if (cockpitCam) {
      cockpitCam.aspect = pipViewport.width / pipViewport.height;
      cockpitCam.updateProjectionMatrix();

      // Set scissor for PiP area and clear depth buffer
      gl.setScissor(pipViewport.x, pipViewport.y, pipViewport.width, pipViewport.height);
      gl.setScissorTest(true);
      gl.clear(gl.DEPTH_BUFFER_BIT); // Clear depth buffer in PiP area only

      // Set viewport and render PiP view
      gl.setViewport(pipViewport.x, pipViewport.y, pipViewport.width, pipViewport.height);
      gl.render(scene, cockpitCam);
    }

    gl.setScissorTest(false);
    gl.autoClear = true;
  }, 1); // Priority 1 ensures rendering after scene updates

  return null;
};











/**
 * Main Scene Component
 */
const RocketLandingScene = () => {


  const rocketBodyHeight = 8;
  const rocketBodyRadius = 0.5;
  const flameEmitterY = -rocketBodyHeight / 2; // Position flame below the body
  const pipViewRef = useRef<HTMLDivElement>(null!);
  const [pipCamera] = useState(() => {
    const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 100); // Initial aspect ratio (1), View/Updater will adjust
    cam.name = COCKPIT_CAMERA_NAME; // Assign the name for the updater to find it
    // Set initial position - will be controlled by CockpitCameraUpdater
    cam.position.set(0, 5, 5);
    // Optional: Set initial rotation/lookAt if needed before updater takes over
    // cam.lookAt(0, 0, 0);
    return cam;
});
  


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
        <OrthographicCamera
            makeDefault
            position={[-4, 8, 15]} // Adjusted position slightly for better view of tall platform
            zoom={30} // Zoomed in slightly more
            near={0.1}
            far={1000}
            // Optional: Adjust frustum bounds if needed for aspect ratio
            // left={-aspect * frustumSize / 2}
            // right={aspect * frustumSize / 2}
            // top={frustumSize / 2}
            // bottom={-frustumSize / 2}
        />

<Flame
  position={[0, 12, 0]} // Emitter position
  particleCount={800}             // More particles = denser flame
  flameHeight={7}                 // How long the plume is
  emitterRadius={0.3}             // Width at the nozzle
  particleSize={2.2}              // Adjust particle size2
  colorStart={new THREE.Color(0xfff0b0)} // Brighter core
  colorEnd={new THREE.Color(0xff6600)}   // Orange/red edges
  opacity={0.7}
/>


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

      {/* Scene Content */}
      <Suspense fallback={null}>
        <LandingPlatform />
        {/* Add the capture zone visualizer */}
        <CaptureZoneVisualizer />
        < CubeStackVisualizer/>
        <FallingRocket /> {/* Contains game state logic */}
        <LandingFloor/>
        {/* <Text> component could be added here for status messages if state is lifted */}
      </Suspense>

      {/* Controls */}
      <OrbitControls enableRotate={true} enablePan={true} enableZoom={true} />

      {/* Custom Renderer for PiP */}
      <MultiViewRenderer />

    </Canvas>
  );
};

export default RocketLandingScene;