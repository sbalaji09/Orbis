"use client";

import { useRouter, usePathname } from "next/navigation";
import { PromptFamily } from "@/lib/prompt-api";
import {
  Disclosure,
  DisclosureButton,
} from "@headlessui/react";
import { useState, useMemo } from "react";

export function PromptSidebarClient({
  families,
}: {
  families: PromptFamily[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFamilies = useMemo(() => {
    if (!searchQuery.trim()) return families;
    const query = searchQuery.toLowerCase();
    return families.filter(
      (family) =>
        family.name.toLowerCase().includes(query) ||
        (family.agent_name && family.agent_name.toLowerCase().includes(query))
    );
  }, [families, searchQuery]);

  const totalPrompts = families.length;

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
                {totalPrompts} {totalPrompts === 1 ? "family" : "families"}
              </p>
            </div>
          </div>

          {/* Search box */}
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
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-[#F5F3F0] border border-black/20 focus:border-black focus:outline-none placeholder:text-black/40"
              />
            </div>
          </div>

          {/* Prompt list */}
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
              {filteredFamilies.length === 0 ? (
                <div className="px-4 py-8 text-xs text-black/40 text-center font-mono">
                  {searchQuery ? `// no matches for "${searchQuery}"` : "// no prompts found"}
                </div>
              ) : (
                filteredFamilies.map((family) => {
                  const isActive = pathname === `/dashboard/prompts/${encodeURIComponent(family.name)}`;

                  return (
                    <button
                      key={family.name}
                      onClick={() =>
                        router.push(`/dashboard/prompts/${encodeURIComponent(family.name)}`)
                      }
                      className={`w-full py-3 px-4 text-left transition-all border-b border-black/10 last:border-b-0 group relative ${
                        isActive
                          ? "bg-[#5B5FFF]/10 border-l-[3px] border-l-black shadow-[inset_3px_0_0_0_rgba(0,0,0,0.1)]"
                          : "hover:bg-[#5B5FFF]/5 hover:border-l-4 hover:border-l-[#5B5FFF]"
                      }`}
                    >
                      {/* Prompt name */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`font-mono text-xs font-bold transition-colors truncate ${
                            isActive
                              ? "text-black"
                              : "text-black/80 group-hover:text-[#5B5FFF]"
                          }`}
                        >
                          {family.name}
                        </span>
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-black/10 text-black border border-black/20 shrink-0">
                          v{family.latest_version}
                        </span>
                      </div>

                      {/* Agent name */}
                      {family.agent_name && (
                        <div
                          className={`text-[10px] font-mono mb-1.5 truncate ${
                            isActive ? "text-black/60" : "text-black/50"
                          }`}
                        >
                          {family.agent_name}
                        </div>
                      )}

                      {/* Metrics */}
                      <div
                        className={`flex items-center gap-2.5 text-[9px] pt-1.5 ${
                          isActive
                            ? "border-t border-black/20"
                            : "border-t border-black/5"
                        }`}
                      >
                        <div
                          className={`flex items-center gap-1 ${
                            isActive ? "text-black/70" : "text-black/60"
                          }`}
                        >
                          <svg
                            className="w-2.5 h-2.5 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                          </svg>
                          <span className="font-mono font-bold">
                            {family.version_count} {family.version_count === 1 ? "version" : "versions"}
                          </span>
                        </div>
                        <span className="text-black/20">•</span>
                        <div
                          className={`flex items-center gap-1 ${
                            isActive ? "text-black/70" : "text-black/60"
                          }`}
                        >
                          <svg
                            className="w-2.5 h-2.5 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-mono font-bold">
                            {new Date(family.last_updated).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </Disclosure>
  );
}