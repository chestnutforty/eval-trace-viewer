import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sampleApi, evalApi } from '../api/client';
import type { EvalSample } from '../types';

export default function SamplesList() {
  const { evalId } = useParams<{ evalId: string }>();
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const limit = 20;

  const { data: evalRun } = useQuery({
    queryKey: ['eval', evalId],
    queryFn: () => evalApi.get(evalId!),
    enabled: !!evalId,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['samples', evalId, offset, limit, searchQuery],
    queryFn: () => sampleApi.listForEval(evalId!, offset, limit, { search_query: searchQuery || undefined }),
    enabled: !!evalId,
  });

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setOffset(0);
  };

  const handleSelectSample = (sampleId: string) => {
    setSelectedSamples(prev =>
      prev.includes(sampleId) ? prev.filter(id => id !== sampleId) : [...prev, sampleId]
    );
  };

  const handleCompare = () => {
    if (selectedSamples.length >= 2) {
      const queryString = selectedSamples.map(id => `ids=${id}`).join('&');
      navigate(`/compare?${queryString}`);
    }
  };

  const truncateQuestion = (question: string, maxLength: number = 80) => {
    if (question.length <= maxLength) return question;
    return question.substring(0, maxLength) + '...';
  };

  const formatScore = (score: number | undefined) => {
    if (score === undefined) return 'N/A';
    return score.toFixed(4);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading samples...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading samples: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back to Evaluations
        </Link>
        {evalRun && (
          <div className="mt-2">
            <h2 className="text-xl font-semibold text-gray-900">{evalRun.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Model: {evalRun.model_name} | Type: {evalRun.eval_type} | Score: {formatScore(evalRun.overall_score)}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Search
          </button>
        </div>
        <button
          onClick={handleCompare}
          disabled={selectedSamples.length < 2}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Compare Selected ({selectedSamples.length})
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSamples(data?.items.map((s: EvalSample) => s.id) || []);
                    } else {
                      setSelectedSamples([]);
                    }
                  }}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Index
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feedback
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.items.map((sample: EvalSample) => (
              <tr
                key={sample.id}
                className="hover:bg-gray-50 cursor-pointer transition"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedSamples.includes(sample.id)}
                    onChange={() => handleSelectSample(sample.id)}
                    className="rounded"
                  />
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                  onClick={() => navigate(`/samples/${sample.id}`)}
                >
                  {sample.sample_index}
                </td>
                <td
                  className="px-6 py-4 text-sm text-gray-600"
                  onClick={() => navigate(`/samples/${sample.id}`)}
                >
                  {truncateQuestion(sample.question)}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"
                  onClick={() => navigate(`/samples/${sample.id}`)}
                >
                  {formatScore(sample.score)}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"
                  onClick={() => navigate(`/samples/${sample.id}`)}
                >
                  {sample.feedback_count ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {sample.feedback_count}
                    </span>
                  ) : (
                    'None'
                  )}
                </td>
              </tr>
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
