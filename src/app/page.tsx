'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { TrialsList } from '@/components/TrialsList';
import { ProfileEditor } from '@/components/ProfileEditor';
import { Trial, PatientProfile } from '@/lib/schemas';
import { searchTrials, APIError } from '@/lib/api-client';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<PatientProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setTrials([]);
    setProfile(null);

    try {
      // Call API client
      const data = await searchTrials(selectedFile);
      setProfile(data.profile);
      setOriginalProfile(data.profile); // Store original AI extraction
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
    setProfile(null);
    setOriginalProfile(null);
    setError(null);
    setHasSearched(false);
    setShowProfileEditor(false);
  };

  const handleSearchComplete = (updatedProfile: PatientProfile, updatedTrials: Trial[]) => {
    setProfile(updatedProfile);
    setTrials(updatedTrials);
    setShowProfileEditor(false);
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
            {/* Action Buttons */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
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
                  <span className="text-sm text-gray-600">
                    Current: <span className="font-medium">{file.name}</span>
                  </span>
                )}
              </div>

              {/* Refine Search Button */}
              {profile && (
                <button
                  onClick={() => setShowProfileEditor(true)}
                  className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-md shadow-sm text-sm font-medium bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Refine Search Criteria
                </button>
              )}
            </div>

            {/* Trials List */}
            <TrialsList trials={trials} />
          </div>
        )}
      </main>

      {/* Profile Editor Modal */}
      {showProfileEditor && profile && originalProfile && (
        <ProfileEditor
          initialProfile={profile}
          originalProfile={originalProfile}
          onSearchComplete={handleSearchComplete}
          onClose={() => setShowProfileEditor(false)}
        />
      )}

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
