import { SVGProps } from 'react';

export function PhantomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 12a4 4 0 1 1-8 0v4a4 4 0 1 1 8 0V12Z"
        fill="url(#phantom-gradient)"
      />
      <path
        d="M12 12a4 4 0 1 1-8 0v4a4 4 0 1 1 8 0V12Z"
        stroke="#fff"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="phantom-gradient"
          x1="4"
          y1="12"
          x2="20"
          y2="12"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3944BC" />
          <stop offset="1" stopColor="#6A35FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
