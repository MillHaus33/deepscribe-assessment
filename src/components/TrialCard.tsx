import { Trial } from '@/lib/schemas';

interface TrialCardProps {
  trial: Trial;
}

export function TrialCard({ trial }: TrialCardProps) {
  const { nctId, title, overallStatus, conditions, phases, eligibility, locations, interventions, url } = trial;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-blue-600">{nctId}</span>
            <span
              className={`
                px-2 py-1 rounded text-xs font-medium
                ${overallStatus === 'RECRUITING' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
              `}
            >
              {overallStatus}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        </div>
      </div>

      {/* Conditions */}
      {conditions && conditions.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">Conditions</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {conditions.map((condition, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                {condition}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Phases */}
      {phases && phases.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">Phases</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {phases.map((phase, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {phase}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interventions */}
      {interventions && interventions.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">Interventions</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {interventions.slice(0, 3).map((intervention, idx) => (
              <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                {intervention}
              </span>
            ))}
            {interventions.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                +{interventions.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Eligibility */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Eligibility</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
          {eligibility.minAge && (
            <div>
              <span className="font-medium">Min Age:</span> {eligibility.minAge.value} {eligibility.minAge.unit}
            </div>
          )}
          {eligibility.maxAge && (
            <div>
              <span className="font-medium">Max Age:</span> {eligibility.maxAge.value} {eligibility.maxAge.unit}
            </div>
          )}
          {eligibility.sex && (
            <div>
              <span className="font-medium">Sex:</span> {eligibility.sex}
            </div>
          )}
        </div>
        {eligibility.criteriaText && (
          <p className="mt-2 text-xs text-gray-500 line-clamp-2">
            {eligibility.criteriaText}
          </p>
        )}
      </div>

      {/* Locations */}
      {locations && locations.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">
            Locations ({locations.length})
          </p>
          <div className="mt-1 text-sm text-gray-600">
            {locations.slice(0, 2).map((location, idx) => (
              <div key={idx}>
                {location.facility && `${location.facility}, `}
                {location.city}, {location.state}
              </div>
            ))}
            {locations.length > 2 && (
              <p className="text-xs text-gray-500">+{locations.length - 2} more locations</p>
            )}
          </div>
        </div>
      )}

      {/* Link to ClinicalTrials.gov */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View on ClinicalTrials.gov
          <svg
            className="ml-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
