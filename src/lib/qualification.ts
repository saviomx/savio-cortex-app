/**
 * Qualification mapping and utilities
 * Maps API qualification values to user-friendly labels and styling
 */

export type QualificationValue =
  | 'ideal'
  | 'advanced_sme'
  | 'basic_sme'
  | 'mid_sized_client'
  | 'missing_data'
  | string;

export interface QualificationInfo {
  label: string;
  shortLabel: string;
  description: string;
  color: 'green' | 'blue' | 'purple' | 'amber' | 'gray';
  priority: number; // Lower = better lead
}

const qualificationMap: Record<string, QualificationInfo> = {
  ideal: {
    label: 'Ideal',
    shortLabel: 'Ideal',
    description: 'Perfect fit for our solution',
    color: 'green',
    priority: 1,
  },
  advanced_sme: {
    label: 'Advanced SME',
    shortLabel: 'Adv SME',
    description: 'Advanced small/medium enterprise',
    color: 'blue',
    priority: 2,
  },
  mid_sized_client: {
    label: 'Mid-Sized',
    shortLabel: 'Mid-Size',
    description: 'Mid-sized client with growth potential',
    color: 'purple',
    priority: 3,
  },
  basic_sme: {
    label: 'Basic SME',
    shortLabel: 'Basic',
    description: 'Basic small/medium enterprise',
    color: 'amber',
    priority: 4,
  },
  missing_data: {
    label: 'Incomplete',
    shortLabel: 'Incomplete',
    description: 'Missing qualification data',
    color: 'gray',
    priority: 5,
  },
};

/**
 * Get qualification info for a given value
 */
export function getQualificationInfo(value: string | null | undefined): QualificationInfo | null {
  if (!value) return null;

  const normalized = value.toLowerCase().trim();

  if (qualificationMap[normalized]) {
    return qualificationMap[normalized];
  }

  // Fallback for unknown values - format the string nicely
  return {
    label: formatUnknownQualification(value),
    shortLabel: formatUnknownQualification(value).slice(0, 10),
    description: `Qualification: ${value}`,
    color: 'gray',
    priority: 99,
  };
}

/**
 * Format unknown qualification values by replacing underscores and capitalizing
 */
function formatUnknownQualification(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get Tailwind classes for qualification badge based on color
 */
export function getQualificationClasses(color: QualificationInfo['color']): string {
  const colorClasses: Record<QualificationInfo['color'], string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return colorClasses[color];
}
