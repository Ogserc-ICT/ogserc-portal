import * as migration_20261008_211615_initial from './20261008_211615_initial';

export const migrations = [
  {
    up: migration_20261008_211615_initial.up,
    down: migration_20261008_211615_initial.down,
    name: '20261008_211615_initial'
  },
];
