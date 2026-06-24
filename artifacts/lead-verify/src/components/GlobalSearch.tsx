import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getGlobalSearchQueryOptions } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Upload, BarChart3, PhoneCall, Loader2 } from "lucide-react";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

interface SearchGroupProps {
  title: string;
  icon: React.ElementType;
  emptyLabel: string;
  children: React.ReactNode;
  hasItems: boolean;
}

function SearchGroup({ title, icon: Icon, emptyLabel, children, hasItems }: SearchGroupProps) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3 h-3" />
        {title}
      </div>
      {hasItems ? children : (
        <p className="px-3 py-2 text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

interface HitButtonProps {
  title: string;
  subtitle: string;
  status: string;
  onClick: () => void;
}

function HitButton({ title, subtitle, status, onClick }: HitButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <StatusBadge status={status} size="sm" />
    </button>
  );
}

export function GlobalSearch() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const canSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useQuery(
    getGlobalSearchQueryOptions(
      { q: debouncedQuery, limit: 5 },
      { query: { enabled: canSearch } },
    ),
  );

  const leads = data?.leads ?? [];
  const results = data?.results ?? [];
  const callLogs = data?.callLogs ?? [];
  const hasHits = leads.length + results.length + callLogs.length > 0;
  const showPanel = open && query.trim().length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    navigate(href);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search leads, results, call logs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LENGTH) setOpen(true);
          }}
          className="pl-8 h-8 text-sm bg-background border-border"
        />
        {isFetching && canSearch && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          {isFetching && !data ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Searching...</p>
          ) : !hasHits ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No matches for &ldquo;{debouncedQuery}&rdquo;
            </p>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
              <SearchGroup
                title="Leads"
                icon={Upload}
                emptyLabel="No matching leads"
                hasItems={leads.length > 0}
              >
                {leads.map((lead) => (
                  <HitButton
                    key={`lead-${lead.id}`}
                    title={`${lead.firstName} ${lead.lastName}`}
                    subtitle={`${lead.company} · ${lead.phoneNumber}`}
                    status={lead.status}
                    onClick={() => handleSelect(`/leads/${lead.id}`)}
                  />
                ))}
              </SearchGroup>

              <SearchGroup
                title="Results"
                icon={BarChart3}
                emptyLabel="No matching results"
                hasItems={results.length > 0}
              >
                {results.map((result) => (
                  <HitButton
                    key={`result-${result.id}`}
                    title={`${result.firstName} ${result.lastName}`}
                    subtitle={`${result.company} · ${result.phoneNumber}`}
                    status={result.status}
                    onClick={() => handleSelect(`/results/${result.id}`)}
                  />
                ))}
              </SearchGroup>

              <SearchGroup
                title="Call Logs"
                icon={PhoneCall}
                emptyLabel="No matching call logs"
                hasItems={callLogs.length > 0}
              >
                {callLogs.map((log) => (
                  <HitButton
                    key={`log-${log.id}`}
                    title={`${log.firstName} ${log.lastName}`}
                    subtitle={`${log.company} · ${new Date(log.calledAt).toLocaleString()}`}
                    status={log.status}
                    onClick={() => handleSelect(`/results/${log.id}`)}
                  />
                ))}
              </SearchGroup>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
