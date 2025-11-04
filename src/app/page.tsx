'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { TrialsList } from '@/components/TrialsList';
import { Trial } from '@/lib/schemas';
import { searchTrials, APIError } from '@/lib/api-client';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setTrials([]);

    try {
      // Call API client
      const data = await searchTrials(selectedFile);
      setTrials(data.trials);
      setHasSearched(true);
    } catch (err) {
      // Handle API errors
      if (err instanceof APIError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  const handleNewSearch = () => {
    setFile(null);
    setTrials([]);
    setError(null);
    setHasSearched(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Clinical Trials Matcher
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload a patient transcript to find matching clinical trials
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        {/* File Upload Section */}
        {!hasSearched && !loading && (
          <div className="mb-8">
            <FileUpload onFileSelect={handleFileSelect} disabled={loading} />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <LoadingSpinner message="Analyzing transcript and searching for trials... This may take 5-10 seconds." />
        )}

        {/* Error State */}
        {error && <ErrorMessage message={error} onClose={handleCloseError} />}

        {/* No Results State */}
        {!loading && hasSearched && trials.length === 0 && !error && (
          <div>
            <button
              onClick={handleNewSearch}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-6"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Upload New Transcript
            </button>
            <TrialsList trials={[]} />
          </div>
        )}

        {/* Results Section */}
        {!loading && trials.length > 0 && (
          <div>
            {/* New Search Button */}
            <div className="mb-6">
              <button
                onClick={handleNewSearch}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Upload New Transcript
              </button>
              {file && (
                <span className="ml-4 text-sm text-gray-600">
                  Current: <span className="font-medium">{file.name}</span>
                </span>
              )}
            </div>

            {/* Trials List */}
            <TrialsList trials={trials} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Data sourced from{' '}
            <a
              href="https://clinicaltrials.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              ClinicalTrials.gov
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
