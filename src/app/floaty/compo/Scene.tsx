
"use client"


import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text3D, OrbitControls, PerspectiveCamera, Environment,  useGLTF, useTexture, Text } from '@react-three/drei';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import {  TextGeometry  } from 'three/addons/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useLoader } from '@react-three/fiber';

import gsap from 'gsap';


const dict_positions_According_len_sociallinks = {
  1:  [0],
  2:  [7.5, -7.5],
  3:  [15, 0, -15],
  4:  [22.5, 7.5, -7.5, -22.5],
  5:  [30, 15, 0, -15, -30],
  6:  [37.5, 22.5, 7.5, -7.5, -22.5, -37.5],
  7:  [37.5, 22.5, 7.5, -7.5, -22.5, -37.5 , 0],
  8:  [37.5, 22.5, 7.5, -7.5, -22.5, -37.5 , 7.5, -7.5],
  9:  [37.5, 22.5, 7.5, -7.5, -22.5, -37.5 , 15, 0, -15],
  10: [37.5, 22.5, 7.5, -7.5, -22.5, -37.5 , 22.5, 7.5, -7.5, -22.5],
  11: [37.5, 22.5, 7.5, -7.5, -22.5, -37.5 , 30, 15, 0, -15, -30],
  12: [37.5, 22.5, 7.5, -7.5, -22.5, -37.5 , 37.5, 22.5, 7.5, -7.5, -22.5, -37.5],
  13: [37.5, 22.5, 7.5, -7.5, -22.5, -37.5 , 37.5, 22.5, 7.5, -7.5, -22.5, -37.5, 0]

};


const user_username_Placeholder = "Matías Federico Ciruelos";
const user_bio_Placeholder = ['Hello, I made this website, which intends' ,'to be a 3D link in bio.', 'Click on the pills to open link.' ];
const user_profile_pic_placeholder = "../../image_profile_pic_matias-ciruelos.JPG";
const user_labels_link = ['LinkedIn', 'Resume', 'GitHub', 'Side Project: AI directory' ];
const links_list = [['https://www.linkedin.com/in/mat%C3%ADas-federico-ciruelos/'], ['https://drive.google.com/file/d/18RwIXdBY1fATHbjO0xndVMYZrrEhmT34/view?usp=sharing'] ,['https://github.com/ciruelosmf'], ['https://aiimageandvideogenerators.xyz']];
const user_selected_background = "../../backgrounds/image_background_10.jpg";
const user_social_media_links = [  ['mailto:ciruelosmf@gmail.com', 'emailadress']];










// Define your types
type Position = {
    x: number;
    y: number;
    z: number;
}
type Scale = {
    x: number;
    y: number;
    z: number;
}
































function Scene() {
  const [isTabActive, setIsTabActive] = useState(true);
  const orbitControlsRef = useRef<THREE.OrbitControls | null>(null);
  const { camera, gl } = useThree();
  const screenWidth = useMemo(() => window.innerWidth, []);
  const [textWidth, setTextWidth] = useState(0);
  const text_handle_Ref = useRef<THREE.Mesh>(null);




    // Global Vars
    let image_social_media_hei = 10;
    let  image_social_media_wid = 10;
    let z_dist_to_camera = 65,  y_dist_to_caCmera = 67;

    let  y_position_prof_pic = 27;
    let  y_position_handle = 19;
    let  y_position_bio = 10;
    let  z_position_handle = 1;
    let  y_position_image_extra_link_1 = -12;
    let  z_position_extra_link_1 = 0;
    let  x_position_extra_link_1 = 49;
    let  y_position_extra_link_1 = -20;

    let  y_position_image_extra_link_2 = 8;
    let  z_position_extra_link_2 = 0;
    let  x_position_extra_link_2 = 49;
    let  y_position_extra_link_2 = 0;

    let  y_position_image_extra_link_3 = 28;
    let  z_position_extra_link_3 = 0;
    let  x_position_extra_link_3 = 49;
    let  y_position_extra_link_3 = 20;

     let  z_position_x_link_image = 0;
    let  x_position_x_link_image = -39;
    let  y_position_x_link_image = -1;

    let  z_position_x_link_geo = 0;
    let  x_position_x_link_geo = -39.5;
    let  y_position_x_link_geo = -1;
    let  y_rotation_x_link_geo = .5;

    let  offset_y_position_x_link_geo_inner = 0.6;
    let  offset_y_position_x_link_geo_outer = 0.85;

    let  x_scale_x_link_geo_outer = 0.63;
    let  y_scale_x_link_geo_outer = 0.63;
    let  z_scale_x_link_geo_outer = 0.63;

    let  x_scale_x_link_geo_inner = 0.56;
    let  y_scale_x_link_geo_inner = 0.56;
    let  z_scale_x_link_geo_inner = 0.56;
    
    let  z_position_email_link_image = 0;
    let  x_position_email_link_image = -49;
    let  y_position_email_link_image = -21;
    let  z_position_email_link_geo = 0;
    let  x_position_email_link_geo = -49.5;
    let  y_position_email_link_geo = -21;
    let  y_rotation_email_link_geo = .5;
    let  offset_y_position_email_link_geo_inner = 0.6;
    let  offset_y_position_email_link_geo_outer = 0.85;
    let  x_scale_email_link_geo_outer = 0.75;
    let  y_scale_email_link_geo_outer = 0.75;
    let  z_scale_email_link_geo_outer = 0.75;
    let  x_scale_email_link_geo_inner = 0.68;
    let  y_scale_email_link_geo_inner = 0.68;
    let  z_scale_email_link_geo_inner = 0.68;
    let  z_position_ig_link_image = 0;
    let  x_position_ig_link_image = -49;
    let  y_position_ig_link_image = 19;
    let  z_position_ig_link_geo = 0;
    let  x_position_ig_link_geo = -49.5;
    let  y_position_ig_link_geo = 19;
    let  y_rotation_ig_link_geo = .5;
    let  offset_y_position_ig_link_geo_inner = 0.6;
    let  offset_y_position_ig_link_geo_outer = 0.85;
    let  x_scale_ig_link_geo_outer = 0.75;
    let  y_scale_ig_link_geo_outer = 0.75;
    let  z_scale_ig_link_geo_outer = 0.75;
    let  x_scale_ig_link_geo_inner = 0.68;
    let  y_scale_ig_link_geo_inner = 0.68;
    let  z_scale_ig_link_geo_inner = 0.68;
     const Y_position_image_link_1_texture = -3
     const Y_position_image_link_2_texture = -11
     const Y_position_image_link_3_texture = -19
    const Y_position_image_link_4_texture = -27
    const Y_position_image_link_5_texture = -35
    const Y_position_image_link_6_texture = -43
    const Y_position_image_link_7_texture = -51
    const Y_position_image_link_8_texture = -59
    const Y_position_image_link_9_texture = -67
    const Y_position_image_link_10_texture = -75
     let zcool = 0,
     X_POS_icon = 19,
        X_POS_cardsfeatures = -19,
        X_POS_ctaexplorer = 0,
        X_POS_ctadescription = -15,
        X_POS_ctaform = 15,
        y_POS_icon = 5,
        y_POS_cardsfeatures1 = 18,
        y_POS_cardsfeatures2 = 9.8,
        y_POS_cardsfeatures3 = 0,
        y_POS_ctaexplorer = -11,
        y_POS_ctadescription = -21,
        y_POS_ctaform = -29,
        z_POS_ctaexplorer = 0;




        useEffect(() => {
             screenWidth < 768 ? (

                y_position_prof_pic = 24,
              y_position_bio = 9,
              y_position_handle = 17,

              z_dist_to_camera = 53, zcool = 24, z_POS_ctaexplorer = 0,

              X_POS_icon = 0,
              y_POS_icon = 22, 

               //y_rotation_x_link_geo = 0,

               z_position_x_link_image = 0,
               x_position_x_link_image = -29,
               y_position_x_link_image = 0,



               z_position_x_link_geo = 0,
               x_position_x_link_geo = -29,
               y_position_x_link_geo = 0,

              offset_y_position_x_link_geo_inner = 0.4,
              offset_y_position_x_link_geo_outer = 0.4,

               x_scale_x_link_geo_inner = 0.53,
               y_scale_x_link_geo_inner = 0.53,

               y_scale_x_link_geo_outer = 0.60,  
               x_scale_x_link_geo_outer = 0.60,
                   z_position_ig_link_image = 0,
                    x_position_ig_link_image = -29,
                    y_position_ig_link_image = 19,

                    z_position_ig_link_geo = 0,
                    x_position_ig_link_geo = -29,
                    y_position_ig_link_geo = 19,

                    y_rotation_ig_link_geo = .5,

                    offset_y_position_ig_link_geo_inner = 0.4,
                    offset_y_position_ig_link_geo_outer = 0.4,

                    x_scale_ig_link_geo_outer = 0.60,
                    y_scale_ig_link_geo_outer = 0.60,
                    //z_scale_ig_link_geo_outer = 0.75,

                    x_scale_ig_link_geo_inner = 0.53,
                    y_scale_ig_link_geo_inner = 0.53,
                    //z_scale_ig_link_geo_inner = 0.68,
                    x_position_email_link_image = -29,
                    x_position_email_link_geo = -29,
                    y_position_email_link_geo = -19,
                    y_position_email_link_image = -19,

                    x_scale_email_link_geo_outer = 0.60,
                    y_scale_email_link_geo_outer = 0.60,
                    //z_scale_ig_link_geo_outer = 0.75,

                    x_scale_email_link_geo_inner = 0.53,
                    y_scale_email_link_geo_inner = 0.53,
                   image_social_media_hei = 8,
                    image_social_media_wid = 8,
               X_POS_ctadescription = 0, 
               X_POS_ctaform = 0, X_POS_cardsfeatures = 0, y_POS_cardsfeatures1 = 8,
               y_POS_cardsfeatures2 = 0.45, 
               y_POS_cardsfeatures3 = -9.1, y_POS_ctaexplorer = -19.4, y_POS_ctadescription = -29, y_POS_ctaform = -37) 
        
                 : screenWidth > 768 && screenWidth < 1366 && (z_dist_to_camera = 79.5);


        }, [screenWidth])



  const numGeometries = user_social_media_links.length;
  const positions = dict_positions_According_len_sociallinks[numGeometries] || [];



  const backgroundTexture = useTexture(user_selected_background);
  const profilePicTexture = useTexture(user_profile_pic_placeholder);


  const font = "/fonts/Super_Corn_Regular_JSON.json";
  // const font =  useLoader(FontLoader, font_path)  as THREE.Font;




 
  useEffect(() => {
    if (text_handle_Ref.current) {
      const box = new THREE.Box3().setFromObject(text_handle_Ref.current);
      const width = box.max.x - box.min.x; // Width of the text
      setTextWidth(width); // Store the width in state
    }
  }, [font, user_username_Placeholder, user_bio_Placeholder]);




  useEffect(() => {
    if (text_handle_Ref.current) {
      const box = new THREE.Box3().setFromObject(text_handle_Ref.current);
      const width = box.max.x - box.min.x; // Width of the text
      setTextWidth(width); // Store the width in state
    }
  }, [font,  user_bio_Placeholder]);











  const cardCapsuleFeature = useGLTF("../../geometries/geometry_card_capsule_feature_size_3.glb") as any;
  const cardSquareCta = useGLTF("../../geometries/geometry_card_square_cta_form.glb") as any;
  const cardCapsuleSize1 = useGLTF("../../geometries/geometry_capsule_size_1_roundedXL.glb") as any;
  const cardCapsuleFeature2 = useGLTF("../../geometries/geometry_card_capsule_feature_size_2.glb") as any;

  const pillClone = cardCapsuleSize1.scene.clone();
  pillClone.traverse((child) => {
    if (child.isMesh) {
        child.material = child.material.clone(); // Clone material for independence
        child.material.color.set(0xffff00);      // Set new color
    }
});



const bluePillClone = cardCapsuleSize1.scene.clone();
bluePillClone.traverse((child) => {
    if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.set(0x3459d6); // Set blue color
    }
});


const Capsule = ({ object, position, scale, onClick }: any) => (
  <primitive object={object.clone()} position={position} scale={scale} rotation={[0, Math.PI, 0]} onClick={onClick} />
);










































const handleObjectClick = (link: string) => {
    if(link){
        window.open(link, "_blank");
    }
}




  // Background Sphere
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(500, 60, 40), []);
  sphereGeometry.scale(-1, 1, 1);


  useEffect(() => {
    gsap.to(camera.position, {
        duration: 3,
        x: 0,
        y: 0,
        z: z_dist_to_camera,
        ease: "power2.inOut"
    });
  }, [camera.position, z_dist_to_camera])


  useFrame(() => {
        if (orbitControlsRef.current) {
             if (isTabActive) {
                orbitControlsRef.current.update();
             }
        }

  });

    const handleTabVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    useEffect(() => {
        document.addEventListener('visibilitychange', handleTabVisibilityChange);
        window.addEventListener('blur', handleTabVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleTabVisibilityChange);
            window.removeEventListener('blur', handleTabVisibilityChange);
        };
    }, []);



  return (
      <>
    











    
      <OrbitControls ref={orbitControlsRef}  enableDamping={true}  rotateSpeed={.7} minDistance={2} maxDistance={255.1}   />

      <ambientLight intensity={51/10} color={4210752} />
            <directionalLight position={[0, 30, 11]} intensity={34/10} color={0xffffff} />
    
            <mesh geometry={sphereGeometry} material={new THREE.MeshBasicMaterial({ map: backgroundTexture })} rotation-y={Math.PI }/>


        <mesh position={[0, y_position_prof_pic, 0]} >
            <boxGeometry args={[8, 8, 0.01, 1, 1, 0.01]} />
            <meshBasicMaterial map={profilePicTexture} transparent={true} />
          </mesh>













          {font && (
  <Text3D
  ref={text_handle_Ref}
    font={font}
    size={2.25}
    height={0.2}
 
    position={[-textWidth / 2, y_position_handle - 0.4, 0]}
  >
    {-textWidth / 2}
    <meshBasicMaterial color={0xFFFB0B} />  
  </Text3D>
)}





















                {/* Bio Text */}
          {font && (
            <group position={[0, y_position_bio-0.6, 0]}>
            {user_bio_Placeholder.length === 1 ?
                  (<Text3D 
                     
                  ref={text_handle_Ref}
                  font={font} 
                  fontSize={1.35} 
                  height={0.02}   
                  position={[0,0,0]} >

                  {user_bio_Placeholder[0]}
                   <meshBasicMaterial color={0x0B0B0B} />  

                   </Text3D>)

                    : user_bio_Placeholder.map((bioText, index) =>
                         <Text3D 
                     key={index}  
                     font={font}  
                     fontSize={1.35}  
                     height={0.02}    
                     position={[0, - (index*1.9) + ( user_bio_Placeholder.length === 3 ? 1.1 : user_bio_Placeholder.length === 4 ?  2.28 : 0.6 ),0]} 
                     
                     >{bioText}

    <meshBasicMaterial color={0x0B0B0B} />  

                     </Text3D>
                     )}
               </group>
             )}


              {user_bio_Placeholder.length !== 0 && (
                    <>
                     <primitive object={cardCapsuleFeature.scene.clone()}
                          position={[0, y_position_bio, z_POS_ctaexplorer-0.2]}
                         rotation={[0, 3.14, 0]}
                          scale={[user_bio_Placeholder.length === 1 ? 1.4 : 1.3 , 1, 1]}
                        >
                          <meshStandardMaterial color={0xC1C6D7} />
                    </primitive>
                <primitive object={cardCapsuleFeature.scene.clone()}
                          position={[0, y_position_bio, z_POS_ctaexplorer-0.35]}
                        rotation={[0, 3.14, 0]}
                        scale={[user_bio_Placeholder.length === 1 ? 1.45 : 1.35 , 1.15, 4]}
                    >
                         <meshStandardMaterial color={0xFF4A4A} />
                    </primitive>
                      </>
              )}






















{/* Social Media Links */}
            {positions.map((yPos, index) => {
                let xPos = x_position_x_link_image;
                if (index >= 6 ) {
                     xPos =  -59.5;
                     screenWidth < 768 ? (xPos = -49.5) : null;
                 }
                 if (index >= 12 ) {
                       xPos =  -79.5;
                     screenWidth < 768 ? (xPos = -69.5) : null;
                   }
                 let texturePath = "";
                   if (user_social_media_links[index][1] === "facebook") {
                    texturePath = "../../icons/facebook.png";
                  } else if (user_social_media_links[index][1]  === "x") {
                   texturePath = "../../icons/x.png";
                  }
                  else if (user_social_media_links[index][1]  === "youtube") {
                   texturePath = "../../icons/youtube.png";
                  }
                  else if (user_social_media_links[index][1]  === "linkedin") {
                    texturePath = "../../icons/linkedin.png";
                  }
                  else if (user_social_media_links[index][1]  === "snapchat") {
                    texturePath = "../../icons/snapchat.png";
                  }
                  else if (user_social_media_links[index][1]  === "tiktok") {
                  texturePath = "../../icons/tiktok.png";
                  }
                  else if (user_social_media_links[index][1]  === "emailadress") {
                   texturePath = "../../icons/email.png";
                  }
                  else if (user_social_media_links[index][1]  === "instagram") {
                    texturePath = "../../icons/instagram.png";
                  }
                  else if (user_social_media_links[index][1]  === "itunes") {
                    texturePath = "../../icons/itunes.png";
                  }
                  else if (user_social_media_links[index][1]  === "pinterest") {
                    texturePath = "../../icons/pinterest.png";
                  }
                  else if (user_social_media_links[index][1]  === "spotify") {
                    texturePath = "../../icons/spotify.png";
                  }
                  else if (user_social_media_links[index][1]  === "twitch") {
                    texturePath = "../../icons/twitch.png";
                  }
                  else if (user_social_media_links[index][1]  === "discord") {
                    texturePath = "../../icons/discord.png";
                  }


                const social_media_icon = useTexture(texturePath);



              return (
                      <React.Fragment key={index}>
                <mesh position={[xPos, yPos, z_position_x_link_image]}
                    rotation={[0, y_rotation_x_link_geo, 0]}
                    userData={{ link: user_social_media_links[index][0] }}  onClick={() => handleObjectClick(user_social_media_links[index][0])}
                       >
                  <boxGeometry args={[image_social_media_hei, image_social_media_wid, 1e-4, 1, 1, .1]} />
                  <meshBasicMaterial map={social_media_icon} transparent={true}/>
                    </mesh>
                    <primitive object={cardSquareCta.scene}
                              position={[x_position_x_link_geo, yPos, z_position_x_link_geo- offset_y_position_x_link_geo_inner]}
                              rotation={[0, y_rotation_x_link_geo, 0]}
                               scale={[x_scale_x_link_geo_inner, y_scale_x_link_geo_inner, 1]}
                             onClick={() => handleObjectClick(user_social_media_links[index][0])}   userData={{ link: user_social_media_links[index][0] }}
                              >
                            <meshStandardMaterial color={0x1DA1F2} />
                    </primitive>
                    <primitive object={cardSquareCta.scene}
                              position={[x_position_x_link_geo, yPos, z_position_x_link_geo-  offset_y_position_x_link_geo_outer ]}
                             rotation={[0, y_rotation_x_link_geo, 0]}
                             scale={[x_scale_x_link_geo_outer, y_scale_x_link_geo_outer, -4]}
                             onClick={() => handleObjectClick(user_social_media_links[index][0])}   userData={{ link: user_social_media_links[index][0] }}
                              >
                          <meshStandardMaterial color={0x14171A} />
                    </primitive>
                    </React.Fragment>
                  );
              })}











 




{/* Link Pills */}
{user_labels_link.map((label, index) => {
    const yOffset = 7;

    // Base Y position for this index
    const baseYPosition = Y_position_image_link_1_texture - (index * yOffset);

    return (
        <React.Fragment key={index}>
            {/* Text3D for String Labels */}
            {font && typeof label === 'string' && (
                <Text3D
                    font={font}
                    fontSize={1.15}
                    height={0.02}
                    position={[0, baseYPosition - 0.4, 0]}
                >
                    {label}
                    <meshBasicMaterial color={0x0b0b0b} />
                </Text3D>
            )}

            {/* Text3D for Array Labels */}
            {font &&
                Array.isArray(label) &&
                label.map((labelLine, i2) => (
                    <Text3D
                        key={`${index}-${i2}`} // Ensure unique key
                        font={font}
                        fontSize={1.15}
                        height={0.02}
                        position={[0, baseYPosition + 0.4 - i2 * 1.7, 0]}
                    >
                        {labelLine}
                        <meshBasicMaterial color={0x0b0b0b} />
                    </Text3D>
                ))}


 



            {/* White Capsule */}
            <Capsule
                        object={pillClone}
                        position={[0, baseYPosition, z_POS_ctaexplorer - 0.2]}
                        scale={[1, 1, 2]}
                        onClick={() => handleObjectClick(links_list[index][0])}
                    />
                    <Capsule
                        object={bluePillClone}
                        position={[0, baseYPosition, z_POS_ctaexplorer - 0.35]}
                        scale={[1.05, 1.15, 2]}
                        onClick={() => handleObjectClick(links_list[index][0])}
                    />
        </React.Fragment>
    );
})}






























      {font && (
           <Text3D font={font} fontSize={1.20}  height={0.02} color={0x363636} position={[X_POS_ctaexplorer, y_POS_ctaexplorer-15,  z_POS_ctaexplorer + 86.5]}
               onClick={() => handleObjectClick("https://trixdi.fun/users/aboutus/aboutus.html")}   userData={{ link: "https://trixdi.fun/users/aboutus/aboutus.html" }} >


                About Us.
    <meshBasicMaterial color={0x0B0B0B} />  

             </Text3D>
             )}

           <primitive object={cardCapsuleFeature2.scene}
                     position={[X_POS_ctaexplorer, y_POS_ctaexplorer -15, z_POS_ctaexplorer + 86]}
                    rotation={[0, 3.14, 0]}
                     scale={[1, 1, 2]}
                onClick={() => handleObjectClick("https://trixdi.fun/users/aboutus/aboutus.html")}  userData={{ link: "https://trixdi.fun/users/aboutus/aboutus.html" }}
                   >
               <meshStandardMaterial color={0xFFBB69} />
            </primitive>
           <primitive object={cardCapsuleFeature2.scene}
                    position={[X_POS_ctaexplorer, y_POS_ctaexplorer-15, z_POS_ctaexplorer + 85]}
                    rotation={[0, 3.14, 0]}
                     scale={[1.05, 1.15, 4]}
                   onClick={() => handleObjectClick("https://trixdi.fun/users/aboutus/aboutus.html")}
                   userData={{ link: "https://trixdi.fun/users/aboutus/aboutus.html" }}
                   >
                   <meshStandardMaterial color={0xFFCF96} />
              </primitive>

    </>
  );
}
 function ThreeDScene() {
  return (
       <Canvas style={{ height: "100vh", width:"100%"  }} >
          <Suspense fallback={null}>
              <Scene />
          </Suspense>
     </Canvas>
  )
 }
export default ThreeDScene;