import type { CSSProperties } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'hb-conti': { state?: string; calma?: boolean; className?: string; style?: CSSProperties };
    }
  }
}
