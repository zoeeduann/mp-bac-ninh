import * as addJournalImageAlt from './20260726_140000_add_journal_image_alt'
import * as adoptProductionMigrations from './20260726_150000_adopt_production_migrations'
import * as separateStandaloneLocations from './20260729_120000_separate_standalone_locations'

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
]
