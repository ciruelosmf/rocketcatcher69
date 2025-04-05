import dynamic from 'next/dynamic';

const ThreeDScene = dynamic(() => import('./compo/Scene'), {
    ssr: false,
  });
export default function HomePage(){
    return  (
            <ThreeDScene/>
         )
}