import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { sampleApi } from '../api/client';
import MessageRenderer from '../components/MessageRenderer';

export default function ComparisonView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = searchParams.getAll('ids');

  const { data, isLoading, error } = useQuery({
    queryKey: ['compare', ids],
    queryFn: () => sampleApi.compare(ids),
    enabled: ids.length >= 2,
  });

  const formatScore = (score: number | undefined) => {
    if (score === undefined) return 'N/A';
    return score.toFixed(4);
  };

  if (ids.length < 2) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Please select at least 2 samples to compare.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Go back
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading comparison...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading comparison</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          Comparing {data.samples.length} Samples
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics Comparison</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Metric
                </th>
                {data.samples.map((sample) => (
                  <th
                    key={sample.id}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Sample #{sample.sample_index}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">Score</td>
                {data.samples.map((sample) => (
                  <td key={sample.id} className="px-4 py-2 text-sm text-gray-600">
                    {formatScore(sample.score)}
                  </td>
                ))}
              </tr>
              {Object.keys(data.samples[0]?.metrics || {}).map((metricKey) => (
                <tr key={metricKey}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{metricKey}</td>
                  {data.samples.map((sample) => (
                    <td key={sample.id} className="px-4 py-2 text-sm text-gray-600">
                      {formatScore(sample.metrics[metricKey])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.samples.map((sample) => (
          <div key={sample.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Sample #{sample.sample_index}
              </h3>
              <button
                onClick={() => navigate(`/samples/${sample.id}`)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View Full
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Question</h4>
                <p className="text-sm text-gray-600">{sample.question}</p>
              </div>

              {sample.example_metadata?.prediction && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Prediction</h4>
                  <p className="text-sm text-gray-600">
                    {sample.example_metadata.prediction}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Conversation ({sample.conversation.length} messages)
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sample.conversation.slice(0, 5).map((message, messageIdx) => (
                    <div key={messageIdx} className="text-xs">
                      <MessageRenderer message={message} />
                    </div>
                  ))}
                  {sample.conversation.length > 5 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      ... {sample.conversation.length - 5} more messages
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
