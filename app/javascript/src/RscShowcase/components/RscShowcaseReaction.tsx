'use client';

import React, { useState } from 'react';

type RscShowcaseReactionProps = {
  initialCount?: number;
};

const RscShowcaseReaction = ({ initialCount = 0 }: RscShowcaseReactionProps) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-md border border-emerald-300/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-700/70 dark:bg-emerald-950/40 dark:text-emerald-100">
      <button
        type="button"
        className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-400 bg-white px-3 text-sm font-medium text-emerald-950 shadow-xs transition-colors hover:bg-emerald-100 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-emerald-700 dark:bg-emerald-900 dark:text-emerald-50 dark:hover:bg-emerald-800"
        onClick={() => setCount((value) => value + 1)}
      >
        Hydrated island
      </button>
      <span>
        {count} client {count === 1 ? 'click' : 'clicks'} inside the fetched RSC payload
      </span>
    </div>
  );
};

export default RscShowcaseReaction;
