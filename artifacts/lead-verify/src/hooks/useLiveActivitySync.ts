import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetLiveActivityQueryOptions,
  getListLeadsQueryKey,
  getListCampaignsQueryKey,
  getGetDashboardStatsQueryKey,
  type LiveActivity,
} from "@workspace/api-client-react";

const LIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 30_000;

export function useLiveActivitySync(enabled = true) {
  const qc = useQueryClient();
  const prevSnapshot = useRef("");

  const query = useQuery({
    ...getGetLiveActivityQueryOptions(),
    enabled,
    refetchInterval: (ctx) => {
      const data = ctx.state.data;
      if (!data) return LIVE_POLL_MS;
      return isLiveActivityBusy(data) ? LIVE_POLL_MS : IDLE_POLL_MS;
    },
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!query.data) return;
    const snapshot = [
      query.data.activeCalls,
      query.data.pendingLeads,
      query.data.campaigns.map((c) => `${c.id}:${c.state}:${c.activeCalls}:${c.pendingLeads}`).join("|"),
    ].join(":");

    if (prevSnapshot.current && prevSnapshot.current !== snapshot) {
      void qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      void qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      void qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    }
    prevSnapshot.current = snapshot;
  }, [query.data, qc]);

  return query;
}

export function isLiveActivityBusy(data: LiveActivity | undefined): boolean {
  if (!data) return false;
  return data.activeCalls > 0 || data.pendingLeads > 0 || data.activeCampaigns > 0;
}
