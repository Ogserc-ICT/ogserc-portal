import * as migration_20261008_211615_initial from './20261008_211615_initial';
import * as migration_20261015_105311_step3_roles from './20261015_105311_step3_roles';

export const migrations = [
  {
    up: migration_20261008_211615_initial.up,
    down: migration_20261008_211615_initial.down,
    name: '20261008_211615_initial',
  },
  {
    up: migration_20261015_105311_step3_roles.up,
    down: migration_20261015_105311_step3_roles.down,
    name: '20261015_105311_step3_roles'
  },
];
