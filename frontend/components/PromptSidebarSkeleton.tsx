"use client";

import {
  Disclosure,
  DisclosureButton,
} from "@headlessui/react";

export function PromptSidebarSkeleton() {
  return (
    <Disclosure defaultOpen={true}>
      {({ open }) => (
        <div
          className="bg-white border-r-2 border-black h-full flex flex-col overflow-hidden relative box-border"
          style={{
            width: open ? "288px" : "56px",
            minWidth: open ? "288px" : "56px",
            transition: "width 300ms ease-in-out, min-width 300ms ease-in-out",
          }}
        >
          {/* Header bar - terminal style */}
          <div
            className="shrink-0 bg-[#F5F3F0] border-b-2 border-black relative"
            style={{ height: "60px" }}
          >
            {/* Arrow button - absolute positioned */}
            <div
              className="absolute z-10"
              style={{
                top: "50%",
                right: "12px",
                transform: "translateY(-50%)",
              }}
            >
              <DisclosureButton className="p-1.5 hover:bg-black/10 transition-colors rounded">
                <svg
                  className={`w-4 h-4 text-black transition-transform duration-300 ${
                    open ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </DisclosureButton>
            </div>

            {/* Text content - fixed positioning */}
            <div
              className="absolute"
              style={{
                top: "50%",
                left: "16px",
                transform: "translateY(-50%)",
                width: "240px",
                opacity: open ? 1 : 0,
                visibility: open ? "visible" : "hidden",
                transition: "opacity 250ms ease-in-out, visibility 250ms",
              }}
            >
              <h2
                className="text-sm font-bold text-black uppercase tracking-wide"
                style={{ width: "150px" }}
              >
                {`// PROMPTS`}
              </h2>
              <p
                className="text-[10px] text-black/50 mt-0.5 font-mono font-semibold"
                style={{ width: "120px" }}
              >
                Loading...
              </p>
            </div>
          </div>

          {/* Search box skeleton */}
          <div
            style={{
              opacity: open ? 1 : 0,
              visibility: open ? "visible" : "hidden",
              transition: "opacity 300ms ease-in-out, visibility 300ms",
              pointerEvents: open ? "auto" : "none",
            }}
            className="px-3 py-3 border-b-2 border-black/10 bg-white"
          >
            <div className="relative">
              <div className="w-full h-[34px] bg-[#F5F3F0] border border-black/20 animate-pulse" />
            </div>
          </div>

          {/* Skeleton list */}
          <div
            className="flex-1 min-h-0"
            style={{
              opacity: open ? 1 : 0,
              visibility: open ? "visible" : "hidden",
              transition: "opacity 300ms ease-in-out, visibility 300ms",
              pointerEvents: open ? "auto" : "none",
              overflow: "hidden",
              width: "288px",
            }}
          >
            <div className="h-full overflow-y-auto overflow-x-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-full py-3 px-4 border-b border-black/10"
                >
                  {/* Prompt name skeleton */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="h-4 bg-black/10 animate-pulse rounded" style={{ width: `${60 + (i * 10) % 40}%` }} />
                    <div className="h-4 w-8 bg-black/10 animate-pulse rounded shrink-0" />
                  </div>

                  {/* Agent name skeleton */}
                  <div className="h-3 bg-black/5 animate-pulse rounded mb-1.5" style={{ width: `${40 + (i * 15) % 30}%` }} />

                  {/* Metrics skeleton */}
                  <div className="flex items-center gap-2.5 pt-1.5 border-t border-black/5">
                    <div className="h-3 w-16 bg-black/5 animate-pulse rounded" />
                    <div className="h-3 w-12 bg-black/5 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Disclosure>
  );
}
