'use client';

import { useState } from 'react';
import { PatientProfile, Trial } from '@/lib/schemas';
import { refineSearch, APIError } from '@/lib/api-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProfileEditorProps {
  initialProfile: PatientProfile;
  originalProfile: PatientProfile;
  onSearchComplete: (profile: PatientProfile, trials: Trial[]) => void;
  onClose: () => void;
}

export function ProfileEditor({
  initialProfile,
  originalProfile,
  onSearchComplete,
  onClose,
}: ProfileEditorProps) {
  const [conditionQuery, setConditionQuery] = useState<string>(
    initialProfile.ctgovQuery.conditionQuery || ''
  );
  const [termQuery, setTermQuery] = useState<string>(
    initialProfile.ctgovQuery.termQuery || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Create updated profile with new query parameters
      const updatedProfile: PatientProfile = {
        ...initialProfile,
        ctgovQuery: {
          conditionQuery: conditionQuery || null,
          termQuery: termQuery || null,
        },
      };

      const result = await refineSearch(updatedProfile);
      onSearchComplete(result.profile, result.trials);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConditionQuery(originalProfile.ctgovQuery.conditionQuery || '');
    setTermQuery(originalProfile.ctgovQuery.termQuery || '');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Refine Search Criteria</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
            <LoadingSpinner message="Searching for clinical trials with updated criteria..." />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Patient Profile Summary (Read-Only) */}
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Extracted Patient Profile
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                The following information was automatically extracted from the patient transcript:
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Age:</span>{' '}
                  <span className="text-gray-900 font-medium">
                    {initialProfile.demographics.age || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Sex:</span>{' '}
                  <span className="text-gray-900 font-medium">
                    {initialProfile.demographics.sex || 'Not specified'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Conditions:</span>{' '}
                  <span className="text-gray-900 font-medium">
                    {initialProfile.conditions.join(', ')}
                  </span>
                </div>
                {initialProfile.biomarkers && initialProfile.biomarkers.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Biomarkers:</span>{' '}
                    <span className="text-gray-900 font-medium">
                      {initialProfile.biomarkers
                        .map((b) => `${b.name}${b.value ? `: ${b.value}` : ''}`)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {initialProfile.stage && (
                  <div>
                    <span className="text-gray-600">Stage:</span>{' '}
                    <span className="text-gray-900 font-medium">{initialProfile.stage}</span>
                  </div>
                )}
                {initialProfile.performanceStatus && (
                  <div>
                    <span className="text-gray-600">Performance Status:</span>{' '}
                    <span className="text-gray-900 font-medium">
                      {initialProfile.performanceStatus}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Search Criteria */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Edit Search Criteria
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Modify the search terms below to refine your clinical trial results. These
                values will replace the automatically generated queries from the patient
                profile above. Uses{' '}
                <a
                  href="https://clinicaltrials.gov/find-studies/constructing-complex-search-queries"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  ESSIE syntax
                </a>
                .
              </p>

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="conditionQuery"
                    className="block text-sm font-medium text-gray-900 mb-2"
                  >
                    Disease/Condition Search
                  </label>
                  {originalProfile.ctgovQuery.conditionQuery && (
                    <p className="text-xs text-gray-600 mb-2">
                      Original AI extraction:{' '}
                      <span className="font-mono text-gray-800">
                        {originalProfile.ctgovQuery.conditionQuery}
                      </span>
                    </p>
                  )}
                  <input
                    id="conditionQuery"
                    type="text"
                    value={conditionQuery}
                    onChange={(e) => setConditionQuery(e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., breast cancer"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use broad disease categories for better results
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="termQuery"
                    className="block text-sm font-medium text-gray-900 mb-2"
                  >
                    Additional Search Terms
                  </label>
                  {originalProfile.ctgovQuery.termQuery && (
                    <p className="text-xs text-gray-600 mb-2">
                      Original AI extraction:{' '}
                      <span className="font-mono text-gray-800">
                        {originalProfile.ctgovQuery.termQuery}
                      </span>
                    </p>
                  )}
                  <input
                    id="termQuery"
                    type="text"
                    value={termQuery}
                    onChange={(e) => setTermQuery(e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., (HER2 positive) OR (HER2+)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Biomarkers, stage, or other criteria (use OR for variations)
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset to AI Extraction
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                Search Clinical Trials
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
