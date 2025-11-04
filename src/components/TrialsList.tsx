import { Trial } from '@/lib/schemas';
import { TrialCard } from './TrialCard';

interface TrialsListProps {
  trials: Trial[];
}

export function TrialsList({ trials }: TrialsListProps) {
  if (trials.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No trials found</h3>
        <p className="mt-2 text-sm text-gray-500">
          No clinical trials were found matching this patient&apos;s profile.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Try uploading a different transcript.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Matching Clinical Trials
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Found {trials.length} trial{trials.length !== 1 ? 's' : ''} matching the patient&apos;s profile
        </p>
      </div>

      <div className="space-y-4">
        {trials.map((trial) => (
          <TrialCard key={trial.nctId} trial={trial} />
        ))}
      </div>
    </div>
  );
}
