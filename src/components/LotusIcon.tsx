import React from 'react';

export const LotusIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
<svg
  viewBox="0 0 24 24"
  fill="none"
  className={className}
  {...props}
>
  {/* Deep inner petals */}
  <path fill="#B1005A" d="M12 3c1.4 2.4 3 7.2 3 10s-3 8-3 8-3-5.2-3-8 1.6-7.6 3-10z"/>

  {/* Layer 2 (folded petals) */}
  <path fill="#CE2A7B" d="M12 21s4.8-3.8 6.4-7.6C20 9.5 19 5.4 18 3.4c-2.6 2-4.7 6.5-5.6 9-.8 2.6-.4 8.6-.4 8.6z"/>
  <path fill="#CE2A7B" d="M12 21s-4.8-3.8-6.4-7.6C4 9.5 5 5.4 6 3.4c2.6 2 4.7 6.5 5.6 9 .8 2.6.4 8.6.4 8.6z"/>

  {/* Wide outer petals */}
  <path fill="#F059AA" d="M3.6 9c-1 3.6.7 8.3 3.3 10.7C9.5 22.1 12 23 12 23s-2-6.4-3.3-9.4C7.4 10.6 6 8.6 3.6 9z"/>
  <path fill="#F059AA" d="M20.4 9c1 3.6-.7 8.3-3.3 10.7C14.5 22.1 12 23 12 23s2-6.4 3.3-9.4c1.3-3 2.7-5 5.1-4.6z"/>

  {/* Base wide leaves */}
  <path fill="#0F6224" d="M3.8 17.2c3.2 4 6.2 5.8 8.2 5.8s5-1.8 8.2-5.8c-3-.9-5.8-.9-8.2-.9s-5.2 0-8.2.9z"/>
  <path fill="#0B551D" d="M6 19c2.6 2.6 4.6 3.4 6 3.4s3.4-.8 6-3.4c-2.3-.6-4-.7-6-.7s-3.7.1-6 .7z"/>
</svg>


  );
};
