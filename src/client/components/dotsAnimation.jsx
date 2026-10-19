import { useEffect, useState } from 'react';

export default function LoadingDots() {
   const [dotCount, setDotCount] = useState(0);

   useEffect(() => {
      const interval = setInterval(() => {
         setDotCount((prevCount) => (prevCount + 1) % 4);
      }, 500);

      return () => clearInterval(interval);
   }, []);

   return (
      <>
         <span className="loading-dots" aria-hidden="true">
            {'.'.repeat(dotCount)}
         </span>         
      </>
   );
}