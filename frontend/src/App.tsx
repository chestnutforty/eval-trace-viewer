import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EvalsList from './pages/EvalsList';
import SamplesList from './pages/SamplesList';
import TraceView from './pages/TraceView';
import ComparisonView from './pages/ComparisonView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Link to="/">
                <h1 className="text-2xl font-bold text-gray-900 hover:text-blue-600 cursor-pointer transition">
                  Eval Trace Viewer
                </h1>
              </Link>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<EvalsList />} />
              <Route path="/evals/:evalId/samples" element={<SamplesList />} />
              <Route path="/samples/:sampleId" element={<TraceView />} />
              <Route path="/compare" element={<ComparisonView />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
