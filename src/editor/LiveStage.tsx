/**
 * B2 — LiveStage.
 *
 * Renders a Framer Motion element driven by the MotionSpec.
 * A replay button bumps a key, which forces React to remount the element,
 * restarting the animation from the initial state.
 */
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { MotionSpec } from "../core/motion-spec";

export interface LiveStageProps {
  spec: MotionSpec;
}

export function LiveStage({ spec }: LiveStageProps) {
  const [replayKey, setReplayKey] = useState(0);

  const { from, to, transition, trigger } = spec;

  // Map trigger to the appropriate Framer Motion prop
  const motionProps: Record<string, unknown> = {
    initial: from,
    transition,
  };

  if (trigger === "mount") {
    motionProps.animate = to;
  } else if (trigger === "hover") {
    motionProps.whileHover = to;
  } else if (trigger === "tap") {
    motionProps.whileTap = to;
  } else if (trigger === "inView") {
    motionProps.whileInView = to;
    motionProps.viewport = { once: true };
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-md min-h-48">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 self-start">
        Live Preview
      </h2>

      <div className="flex-1 flex items-center justify-center w-full">
        <motion.div
          key={replayKey}
          data-testid="live-motion-element"
          data-replay-key={replayKey}
          className="w-20 h-20 bg-indigo-500 rounded-lg"
          {...motionProps}
        />
      </div>

      <button
        type="button"
        data-testid="replay-button"
        onClick={() => setReplayKey((k) => k + 1)}
        className="text-xs px-3 py-1 rounded border border-gray-500 text-gray-300 hover:bg-gray-700 transition-colors"
      >
        Replay
      </button>
    </div>
  );
}
