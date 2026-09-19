/**
 * Activity pages folded into one page per recurring series by the
 * 20260920_151000_merge_duplicate_activities migration. Public paths on the
 * single-location Bac Ninh site (no /bac-ninh prefix); matched exactly.
 */
export const MERGED_ACTIVITY_PATHS: Record<string, string> = {
  '/activities/mindfulness-for-eating': '/activities/mindfulness-in-eating',
  '/activities/mindfulness-in-food': '/activities/mindfulness-in-eating',
  '/activities/mindfulness-and-food': '/activities/mindfulness-in-eating',
  '/activities/health-circle': '/activities/healthy-circulation-cycle',
  '/activities/health-wellness-cycle': '/activities/healthy-circulation-cycle',
  '/activities/tai-chi-mindfulness-ball': '/activities/mindfulness-badminton',
}
