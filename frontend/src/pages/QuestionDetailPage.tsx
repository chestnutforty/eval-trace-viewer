import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sampleApi } from '../api/client';
import type { SampleWithEvalRun } from '../types';

export default function QuestionDetailPage() {
  const { encodedQuestion } = useParams<{ encodedQuestion: string }>();
  const navigate = useNavigate();
  const question = encodedQuestion ? decodeURIComponent(encodedQuestion) : '';

  const [offset, setOffset] = useState(0);
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const limit = 100;

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useQuery({
    queryKey: ['samples-by-question', question, offset, limit],
    queryFn: () => sampleApi.getSamplesByQuestion(question, offset, limit),
    enabled: !!question,
  });

  // Group samples by eval_run_id
  const groupedSamples = useMemo(() => {
    if (!data?.items) return {};

    const groups: Record<string, {
      eval_run_name: string;
      model_name?: string;
      eval_run_timestamp: string;
      samples: SampleWithEvalRun[];
    }> = {};

    data.items.forEach((sample) => {
      if (!groups[sample.eval_run_id]) {
        groups[sample.eval_run_id] = {
          eval_run_name: sample.eval_run_name,
          model_name: sample.model_name,
          eval_run_timestamp: sample.eval_run_timestamp,
          samples: [],
        };
      }
      groups[sample.eval_run_id].samples.push(sample);
    });

    return groups;
  }, [data]);

  const handleSelectSample = (sampleId: string) => {
    setSelectedSamples(prev => {
      if (prev.includes(sampleId)) {
        return prev.filter(id => id !== sampleId);
      } else {
        // Limit to 4 samples
        if (prev.length >= 4) {
          return prev;
        }
        return [...prev, sampleId];
      }
    });
  };

  const handleCompare = () => {
    if (selectedSamples.length >= 2) {
      const queryString = selectedSamples.map(id => `ids=${id}`).join('&');
      navigate(`/compare?${queryString}`);
    }
  };

  const toggleRunExpansion = (runId: string) => {
    setExpandedRuns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
  };

  const handleLoadMore = () => {
    if (data && offset + limit < data.total) {
      setOffset(offset + limit);
    }
  };

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
        <Link to="/questions" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back to Questions
        </Link>
        <div className="mt-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Question</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-900">{question}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {data?.total || 0} samples across {Object.keys(groupedSamples).length} eval runs
        </div>
        <button
          onClick={handleCompare}
          disabled={selectedSamples.length < 2 || selectedSamples.length > 4}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Compare Selected ({selectedSamples.length}/4)
        </button>
      </div>

      {selectedSamples.length >= 4 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            Maximum of 4 samples can be compared at once. Deselect a sample to select a different one.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(groupedSamples).map(([runId, runData]) => {
          const isExpanded = expandedRuns.has(runId);
          return (
            <div key={runId} className="bg-white shadow-sm rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleRunExpansion(runId)}
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition"
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">{runData.eval_run_name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Model: {runData.model_name || 'N/A'} | {formatDate(runData.eval_run_timestamp)} | {runData.samples.length} sample{runData.samples.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-gray-500">
                  {isExpanded ? '▼' : '▶'}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          Select
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sample Index
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {runData.samples.map((sample) => (
                        <tr key={sample.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedSamples.includes(sample.id)}
                              onChange={() => handleSelectSample(sample.id)}
                              disabled={!selectedSamples.includes(sample.id) && selectedSamples.length >= 4}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sample.sample_index}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatScore(sample.score)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link
                              to={`/samples/${sample.id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data && data.total === 0 && (
        <div className="text-center py-8 text-gray-600">
          No samples found for this question.
        </div>
      )}

      {data && offset + limit < data.total && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Load More ({data.total - (offset + limit)} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
