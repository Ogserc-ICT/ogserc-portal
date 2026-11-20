import * as migration_20261008_211615_initial from './20261008_211615_initial';
import * as migration_20261015_105311_step3_roles from './20261015_105311_step3_roles';
import * as migration_20261018_173528_e2e_drafts from './20261018_173528_e2e_drafts';
import * as migration_20261120_054654_rate_limits from './20261120_054654_rate_limits';
import * as migration_20261120_065543_audit_log from './20261120_065543_audit_log';
import * as migration_20261120_082750_two_factor from './20261120_082750_two_factor';

export const migrations = [
  {
    up: migration_20261008_211615_initial.up,
    down: migration_20261008_211615_initial.down,
    name: '20261008_211615_initial',
  },
  {
    up: migration_20261015_105311_step3_roles.up,
    down: migration_20261015_105311_step3_roles.down,
    name: '20261015_105311_step3_roles',
  },
  {
    up: migration_20261018_173528_e2e_drafts.up,
    down: migration_20261018_173528_e2e_drafts.down,
    name: '20261018_173528_e2e_drafts',
  },
  {
    up: migration_20261120_054654_rate_limits.up,
    down: migration_20261120_054654_rate_limits.down,
    name: '20261120_054654_rate_limits',
  },
  {
    up: migration_20261120_065543_audit_log.up,
    down: migration_20261120_065543_audit_log.down,
    name: '20261120_065543_audit_log',
  },
  {
    up: migration_20261120_082750_two_factor.up,
    down: migration_20261120_082750_two_factor.down,
    name: '20261120_082750_two_factor'
  },
];
