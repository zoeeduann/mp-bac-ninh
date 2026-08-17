import * as addJournalImageAlt from './20260726_140000_add_journal_image_alt'
import * as adoptProductionMigrations from './20260726_150000_adopt_production_migrations'
import * as separateStandaloneLocations from './20260729_120000_separate_standalone_locations'
import * as addLocationTimeZone from './20260816_120000_add_location_time_zone'
import * as addSeriesRegistration from './20260817_120000_add_series_registration'
import * as addTeaCourseSeriesOccurrences from './20260817_130000_add_tea_course_series_occurrences'

export const migrations = [
  {
    name: '20260726_140000_add_journal_image_alt',
    up: addJournalImageAlt.up,
    down: addJournalImageAlt.down,
  },
  {
    name: '20260726_150000_adopt_production_migrations',
    up: adoptProductionMigrations.up,
    down: adoptProductionMigrations.down,
  },
  {
    name: '20260729_120000_separate_standalone_locations',
    up: separateStandaloneLocations.up,
    down: separateStandaloneLocations.down,
  },
  {
    name: '20260816_120000_add_location_time_zone',
    up: addLocationTimeZone.up,
    down: addLocationTimeZone.down,
  },
  {
    name: '20260817_120000_add_series_registration',
    up: addSeriesRegistration.up,
    down: addSeriesRegistration.down,
  },
  {
    name: '20260817_130000_add_tea_course_series_occurrences',
    up: addTeaCourseSeriesOccurrences.up,
    down: addTeaCourseSeriesOccurrences.down,
  },
]
