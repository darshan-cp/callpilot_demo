import React, { useState } from "react";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader, TableSortLabel, Select, MenuItem, InputLabel, FormControl, useMediaQuery } from "../ui/table";
import { useTableSort } from "../hooks/useTableSort";

interface CallLog {
  id: number;
  leadId: number;
  firstName: string;
  lastName: string;
  company: string;
  phoneNumber: string;
  status: string;
  humanDetected: boolean;
  endedReason: string;
  callSummary: string;
  callDuration: number | null;
  confidenceScore: number | null;
  calledAt: string;
  campaignName: string | null;
}

const mockData: CallLog[] = [
  // Sample data for initial rendering
  {
    id: 1,
    leadId: 101,
    firstName: "John",
    lastName: "Doe",
    company: "Acme Corp",
    phoneNumber: "1234567890",
    status: "verified",
    humanDetected: true,
    endedReason: "customer-ended-call",
    callSummary: "Follow-up scheduled",
    callDuration: 120,
    confidenceScore: 0.95,
    calledAt: "2024-04-27T10:00:00Z",
    campaignName: "Spring Campaign",
  },
  // Add more sample data as needed
];

export default function CallLogsPage() {
  const [logs, setLogs] = useState<CallLog[]>(mockData);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterCampaign, setFilterCampaign] = useState<string>("All");
  const isSmallScreen = useMediaQuery('(max-width: 640px)');

  const { sortBy, sortDirection, handleSort } = useTableSort("calledAt");

  const filteredLogs = logs.filter((log) => {
    const statusMatch = filterStatus === "All" || log.status === filterStatus;
    const campaignMatch = filterCampaign === "All" || log.campaignName === filterCampaign;
    return statusMatch && campaignMatch;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    if (sortBy === "calledAt") {
      return (new Date(a.calledAt).getTime() - new Date(b.calledAt).getTime()) * dir;
    } else if (sortBy === "status") {
      return a.status.localeCompare(b.status) * dir;
    } else if (sortBy === "campaignName") {
      return (a.campaignName ?? "") .localeCompare(b.campaignName ?? "") * dir;
    } else {
      return 0;
    }
  });

  const uniqueStatuses = Array.from(new Set(logs.map((log) => log.status)));
  const uniqueCampaigns = Array.from(new Set(logs.map((log) => log.campaignName ?? ""))).filter(Boolean);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Call Logs</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <FormControl className="w-full md:w-1/3">
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="All">All</MenuItem>
            {uniqueStatuses.map((status) => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl className="w-full md:w-1/3">
          <InputLabel>Campaign</InputLabel>
          <Select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            label="Campaign"
          >
            <MenuItem value="All">All</MenuItem>
            {uniqueCampaigns.map((campaign) => (
              <MenuItem key={campaign} value={campaign}>{campaign}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr>
              <TableHeader sortKey="calledAt" onSort={handleSort} sortBy={sortBy} sortDirection={sortDirection} label="Called At" />
              <TableHeader sortKey="status" onSort={handleSort} sortBy={sortBy} sortDirection={sortDirection} label="Status" />
              <TableHeader sortKey="campaignName" onSort={handleSort} sortBy={sortBy} sortDirection={sortDirection} label="Campaign" />
              <th className="border px-4 py-2">Lead Name</th>
              <th className="border px-4 py-2">Phone Number</th>
              <th className="border px-4 py-2">Call Duration</th>
              <th className="border px-4 py-2">Confidence Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-100">
                <td className="border px-4 py-2">{new Date(log.calledAt).toLocaleString()}</td>
                <td className="border px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-white ${
                      log.status === "verified" ? "bg-green-500" :
                      log.status === "voicemail" ? "bg-yellow-500" :
                      log.status === "wrong_contact" ? "bg-red-500" :
                      log.status === "company_mismatch" ? "bg-orange-500" :
                      "bg-gray-400"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="border px-4 py-2">{log.campaignName ?? ""}</td>
                <td className="border px-4 py-2">{`${log.firstName} ${log.lastName}`}</td>
                <td className="border px-4 py-2">{log.phoneNumber}</td>
                <td className="border px-4 py-2">{log.callDuration ? `${log.callDuration} sec` : ""}</td>
                <td className="border px-4 py-2">{log.confidenceScore !== null ? log.confidenceScore.toFixed(2) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper component for sortable headers
function TableHeader({ label, sortKey, onSort, sortBy, sortDirection }: { label: string; sortKey: string; onSort: (key: string) => void; sortBy: string; sortDirection: "asc" | "desc" }) {
  const isSorted = sortBy === sortKey;
  return (
    <th className="border px-4 py-2 cursor-pointer" onClick={() => onSort(sortKey)}>
      <div className="flex items-center">
        {label}
        {isSorted && (
          <TableSortLabel direction={sortDirection} />
        )}
      </div>
    </th>
  );
}

// Sort indicator component
function TableSortLabel({ direction }: { direction: "asc" | "desc" }) {
  return (
    <svg
      className={`w-4 h-4 ml-1 inline-block transition-transform duration-200 ${direction === "asc" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
