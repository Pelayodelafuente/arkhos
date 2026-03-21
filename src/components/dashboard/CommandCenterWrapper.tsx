'use client';

import dynamic from 'next/dynamic';

const CommandCenter = dynamic(() => import('./CommandCenter'), {
  ssr: false,
  loading: () => <div className="h-[280px] rounded-xl bg-[#0a0a0f] md:h-[420px]" />,
});

export default function CommandCenterWrapper({ userName }: { userName: string }) {
  return <CommandCenter userName={userName} />;
}
