import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface FilterOptions {
  leadId: string;
  verifiedName: string;
  verifiedCompany: string;
  phoneNumber: string;
  humanDetected: string;
  status: string;
  campaignId: string;
}

const CallLogsPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    leadId: '',
    verifiedName: '',
    verifiedCompany: '',
    phoneNumber: '',
    humanDetected: '',
    status: '',
    campaignId: '',
  });
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchCallLogs = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: 1,
        limit: 50,
      };
      const response = await api.get('/call-logs', { params });
      setCallLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to fetch call logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Call Log Filters</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          name="leadId"
          value={filters.leadId}
          onChange={handleFilterChange}
          className="border p-2 rounded"
          placeholder="Lead ID"
        />
        <input
          type="text"
          name="verifiedName"
          value={filters.verifiedName}
          onChange={handleFilterChange}
          className="border p-2 rounded"
          placeholder="Verified Name"
        />
        <input
          type="text"
          name="verifiedCompany"
          value={filters.verifiedCompany}
          onChange={handleFilterChange}
          className="border p-2 rounded"
          placeholder="Verified Company"
        />
        <input
          type="text"
          name="phoneNumber"
          value={filters.phoneNumber}
          onChange={handleFilterChange}
          className="border p-2 rounded"
          placeholder="Phone Number"
        />
        <select
          name="humanDetected"
          value={filters.humanDetected}
          onChange={handleFilterChange}
          className="border p-2 rounded"
        >
          <option value="">All Real Person</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="border p-2 rounded"
        >
          <option value="">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="voicemail">Voicemail</option>
          <option value="wrong_contact">Wrong Contact</option>
          <option value="company_mismatch">Company Mismatch</option>
          <option value="invalid_number">Invalid Number</option>
        </select>
        <input
          type="text"
          name="campaignId"
          value={filters.campaignId}
          onChange={handleFilterChange}
          className="border p-2 rounded"
          placeholder="Campaign ID"
        />
      </div>
      <button
        onClick={fetchCallLogs}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Apply Filters
      </button>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="table-auto w-full border-collapse border border-gray-400">
          <thead>
            <tr>
              <th className="border border-gray-300 px-2 py-1">ID</th>
              <th className="border border-gray-300 px-2 py-1">Lead Name</th>
              <th className="border border-gray-300 px-2 py-1">Company</th>
              <th className="border border-gray-300 px-2 py-1">Phone</th>
              <th className="border border-gray-300 px-2 py-1">Status</th>
              <th className="border border-gray-300 px-2 py-1">Called At</th>
              <th className="border border-gray-300 px-2 py-1">Campaign</th>
            </tr>
          </thead>
          <tbody>
            {callLogs.map((log) => (
              <tr key={log.id}>
                <td className="border border-gray-300 px-2 py-1">{log.id}</td>
                <td className="border border-gray-300 px-2 py-1">{log.firstName} {log.lastName}</td>
                <td className="border border-gray-300 px-2 py-1">{log.company}</td>
                <td className="border border-gray-300 px-2 py-1">{log.phoneNumber}</td>
                <td className="border border-gray-300 px-2 py-1">{log.status}</td>
                <td className="border border-gray-300 px-2 py-1">{new Date(log.calledAt).toLocaleString()}</td>
                <td className="border border-gray-300 px-2 py-1">{log.campaignName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CallLogsPage;