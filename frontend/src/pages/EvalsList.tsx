import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { evalApi } from '../api/client';
import type { EvalRun } from '../types';

export default function EvalsList() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['evals', offset, limit],
    queryFn: () => evalApi.list(offset, limit),
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatScore = (score: number | undefined) => {
    if (score === undefined) return 'N/A';
    return score.toFixed(4);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading evaluations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading evaluations: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Evaluation Runs</h2>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Samples
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.items.map((evalRun: EvalRun) => (
              <>
                <tr
                  key={evalRun.id}
                  className="hover:bg-gray-50 transition"
                >
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                    onClick={() => navigate(`/evals/${evalRun.id}/samples`)}
                  >
                    {evalRun.name}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer"
                    onClick={() => navigate(`/evals/${evalRun.id}/samples`)}
                  >
                    {evalRun.model_name || 'N/A'}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer"
                    onClick={() => navigate(`/evals/${evalRun.id}/samples`)}
                  >
                    {evalRun.eval_type || 'N/A'}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer"
                    onClick={() => navigate(`/evals/${evalRun.id}/samples`)}
                  >
                    {formatDate(evalRun.timestamp)}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer"
                    onClick={() => navigate(`/evals/${evalRun.id}/samples`)}
                  >
                    {formatScore(evalRun.overall_score)}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer"
                    onClick={() => navigate(`/evals/${evalRun.id}/samples`)}
                  >
                    {evalRun.sample_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRow(expandedRow === evalRun.id ? null : evalRun.id);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {expandedRow === evalRun.id ? 'Hide Metadata' : 'Show Metadata'}
                    </button>
                  </td>
                </tr>
                {expandedRow === evalRun.id && (
                  <tr key={`${evalRun.id}-metadata`}>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">Metadata</h4>

                        {evalRun.metadata.tools && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-800">Tools Configuration</h5>
                            <div className="bg-white p-3 rounded border space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Internal Browser:</span>
                                <span className={evalRun.metadata.tools.enable_internal_browser ? 'text-green-600' : 'text-gray-500'}>
                                  {evalRun.metadata.tools.enable_internal_browser ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Internal Python:</span>
                                <span className={evalRun.metadata.tools.enable_internal_python ? 'text-green-600' : 'text-gray-500'}>
                                  {evalRun.metadata.tools.enable_internal_python ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">MCP Servers:</span>
                                {evalRun.metadata.tools.mcp_servers && evalRun.metadata.tools.mcp_servers.length > 0 ? (
                                  <ul className="list-disc list-inside ml-4 mt-1">
                                    {evalRun.metadata.tools.mcp_servers.map((server, idx) => (
                                      <li key={idx} className="text-gray-700">{server}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-gray-500 ml-2">None</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {evalRun.metadata.developer_message && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-800">Developer Message</h5>
                            <div className="bg-white p-3 rounded border text-sm text-gray-700">
                              {evalRun.metadata.developer_message}
                            </div>
                          </div>
                        )}

                        {evalRun.metadata.example_level_metadata && evalRun.metadata.example_level_metadata.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-800">Example Count</h5>
                            <div className="bg-white p-3 rounded border text-sm text-gray-700">
                              {evalRun.metadata.example_level_metadata.length} examples
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {offset + 1} to {Math.min(offset + limit, data.total)} of {data.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= data.total}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
