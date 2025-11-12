import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { sampleApi, feedbackApi } from '../api/client';
import MessageRenderer from '../components/MessageRenderer';

export default function TraceView() {
  const { sampleId } = useParams<{ sampleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [feedbackType, setFeedbackType] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const { data: sample, isLoading, error } = useQuery({
    queryKey: ['sample', sampleId],
    queryFn: () => sampleApi.get(sampleId!),
    enabled: !!sampleId,
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedback', sampleId],
    queryFn: () => feedbackApi.getForSample(sampleId!),
    enabled: !!sampleId,
  });

  const createFeedbackMutation = useMutation({
    mutationFn: (data: any) => feedbackApi.create(sampleId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', sampleId] });
      setFeedbackType('');
      setRating(undefined);
      setNotes('');
      setTags('');
    },
  });

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackType) return;

    createFeedbackMutation.mutate({
      feedback_type: feedbackType,
      rating,
      notes: notes || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
  };

  const formatScore = (score: number | undefined) => {
    if (score === undefined) return 'N/A';
    return score.toFixed(4);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading trace...</div>
      </div>
    );
  }

  if (error || !sample) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading trace</p>
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
        <h2 className="text-xl font-semibold text-gray-900">Sample #{sample.sample_index}</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Question</h3>
          <p className="text-gray-700">{sample.question}</p>
        </div>

        {sample.example_metadata && Object.keys(sample.example_metadata).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Metadata</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {Object.entries(sample.example_metadata).map(([key, value]) => (
                <div key={key}>
                  <div className="text-gray-500">{key}:</div>
                  <div className="font-medium text-gray-900">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Score:</div>
              <div className="font-medium text-gray-900">{formatScore(sample.score)}</div>
            </div>
            {Object.entries(sample.metrics).map(([key, value]) => (
              <div key={key}>
                <div className="text-gray-500">{key}:</div>
                <div className="font-medium text-gray-900">{formatScore(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Trace</h3>
        <div className="space-y-4">
          {sample.conversation.map((message, idx) => (
            <MessageRenderer key={idx} message={message} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h3>

        {feedbacks.length > 0 && (
          <div className="mb-6 space-y-3">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {feedback.feedback_type}
                  </span>
                  {feedback.rating && (
                    <span className="text-sm text-gray-600">Rating: {feedback.rating}/5</span>
                  )}
                </div>
                {feedback.notes && (
                  <p className="text-sm text-gray-700 mb-2">{feedback.notes}</p>
                )}
                {feedback.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {feedback.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback Type *
            </label>
            <select
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select type...</option>
              <option value="correct">Correct</option>
              <option value="incorrect">Incorrect</option>
              <option value="interesting">Interesting</option>
              <option value="unclear">Unclear</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating (1-5)
            </label>
            <select
              value={rating || ''}
              onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No rating</option>
              <option value="1">1 - Poor</option>
              <option value="2">2 - Fair</option>
              <option value="3">3 - Good</option>
              <option value="4">4 - Very Good</option>
              <option value="5">5 - Excellent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any notes or comments..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. needs-review, bug, good-reasoning"
            />
          </div>

          <button
            type="submit"
            disabled={!feedbackType || createFeedbackMutation.isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {createFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
