'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { fetchPromptFamilies, PromptFamily } from '@/lib/prompt-api';
import PromptBadge from '@/components/PromptBadge';

type SortField = 'name' | 'last_updated' | 'version_count';
type SortDirection = 'asc' | 'desc';

export default function PromptsPage() {
  const [families, setFamilies] = useState<PromptFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('last_updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchPromptFamilies()
      .then(setFamilies)
      .finally(() => setLoading(false));
  }, []);

  // Get unique agents for filter dropdown
  const agents = useMemo(() => {
    const agentMap = new Map<string, string>();
    families.forEach((f) => {
      if (f.agent_id && f.agent_name) {
        agentMap.set(f.agent_id, f.agent_name);
      }
    });
    return Array.from(agentMap.entries()).map(([id, name]) => ({ id, name }));
  }, [families]);

  // Filter and sort families
  const filteredFamilies = useMemo(() => {
    let result = families;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) =>
        f.name.toLowerCase().includes(query) ||
        (f.agent_name && f.agent_name.toLowerCase().includes(query))
      );
    }

    // Agent filter
    if (selectedAgent !== 'all') {
      result = result.filter((f) => f.agent_id === selectedAgent);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'last_updated':
          comparison = new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime();
          break;
        case 'version_count':
          comparison = a.version_count - b.version_count;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [families, searchQuery, selectedAgent, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 text-babyblue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-babyblue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/10 w-48"></div>
          <div className="h-12 bg-black/5 w-full"></div>
          <div className="h-64 bg-black/5 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Prompts</h1>
        <p className="text-sm text-muted mt-1">
          {`// Manage and track all your prompt versions`}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border-2 border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,0.1)] focus:shadow-[4px_4px_0_rgba(0,0,0,0.1)] focus:outline-none transition-shadow"
          />
        </div>

        {/* Agent filter */}
        <div className="relative">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="appearance-none px-4 py-2 pr-10 text-sm border-2 border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,0.1)] focus:shadow-[4px_4px_0_rgba(0,0,0,0.1)] focus:outline-none transition-shadow cursor-pointer"
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Results count */}
        <div className="text-xs text-black/40 ml-auto">
          {filteredFamilies.length} of {families.length} prompts
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-background border-b-2 border-black/10">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider cursor-pointer hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Prompt Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Agent
              </th>
              <th
                onClick={() => handleSort('version_count')}
                className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider cursor-pointer hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Versions
                  <SortIcon field="version_count" />
                </div>
              </th>
              <th
                onClick={() => handleSort('last_updated')}
                className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider cursor-pointer hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Last Updated
                  <SortIcon field="last_updated" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredFamilies.map((family, idx) => (
              <tr
                key={family.name}
                className={`border-b border-black/5 hover:bg-babyblue/5 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-background/50'
                }`}
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/prompts/${encodeURIComponent(family.name)}`}
                    className="group"
                  >
                    <PromptBadge promptId={family.name} promptVersion={family.latest_version} />
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {family.agent_name ? (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono bg-mustard/10 text-mustard border border-mustard/30">
                      {family.agent_name}
                    </span>
                  ) : (
                    <span className="text-xs text-black/30">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-foreground">
                    {family.version_count}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs text-black/60">
                    {new Date(family.last_updated).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Link
                    href={`/dashboard/prompts/${encodeURIComponent(family.name)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                  >
                    View
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredFamilies.length === 0 && (
          <div className="px-6 py-16 text-center">
            {families.length === 0 ? (
              <div className="max-w-md mx-auto">
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-6 bg-babyblue/10 border-2 border-babyblue/30 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-babyblue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No prompts tracked yet
                </h3>
                <p className="text-sm text-muted mb-6">
                  Start tracking your prompts to compare versions, analyze performance, and rollback when needed.
                </p>

                {/* How to add prompts */}
                <div className="bg-background border-2 border-black/10 p-4 text-left mb-6">
                  <h4 className="text-xs font-semibold text-black/60 uppercase tracking-wide mb-3">
                    {`/* How to add prompt versioning */`}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 bg-babyblue text-white text-[10px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <p className="text-xs text-foreground/80">
                        Install the Orbis SDK in your project
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 bg-babyblue text-white text-[10px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <p className="text-xs text-foreground/80">
                        Wrap your LLM calls with the Orbis tracer
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 bg-babyblue text-white text-[10px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <p className="text-xs text-foreground/80">
                        Add a <code className="px-1 py-0.5 bg-black/5 font-mono text-[10px]">prompt_name</code> parameter to track versions automatically
                      </p>
                    </div>
                  </div>

                  {/* Code example */}
                  <div className="mt-4 bg-[#1e1e1e] p-3 overflow-x-auto">
                    <pre className="text-[10px] font-mono text-white/90 leading-relaxed">
{`from orbis import trace

@trace(prompt_name="my-prompt")
def generate_response(user_input):
    return openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": user_input}]
    )`}
                    </pre>
                  </div>
                </div>

                {/* Documentation link */}
                <a
                  href="https://docs.orbis.dev/sdk/prompt-versioning"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[3px_3px_0_rgba(0,0,0,0.15)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  View SDK Documentation
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ) : (
              <div className="text-muted">
                <svg
                  className="w-10 h-10 mx-auto mb-3 text-black/20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium">No prompts match your filters</p>
                <p className="text-xs text-black/40 mt-1 mb-3">
                  Try adjusting your search or filter criteria
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedAgent('all');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
