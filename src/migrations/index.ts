import * as migration_20261008_211615_initial from './20261008_211615_initial';
import * as migration_20261015_105311_step3_roles from './20261015_105311_step3_roles';
import * as migration_20261018_173528_e2e_drafts from './20261018_173528_e2e_drafts';
import * as migration_20261120_054654_rate_limits from './20261120_054654_rate_limits';
import * as migration_20261120_065543_audit_log from './20261120_065543_audit_log';
import * as migration_20261120_082750_two_factor from './20261120_082750_two_factor';
import * as migration_20261120_210425_media_object_key from './20261120_210425_media_object_key';
import * as migration_20261123_152211_step4_foundation from './20261123_152211_step4_foundation';
import * as migration_20261123_175317_step4_documents from './20261123_175317_step4_documents';
import * as migration_20261123_192134_step4_news_events from './20261123_192134_step4_news_events';
import * as migration_20261123_201543_step4_pages_settings from './20261123_201543_step4_pages_settings';
import * as migration_20261124_081246_step4_links_payments from './20261124_081246_step4_links_payments';
import * as migration_20261124_103335_step4_notice_issued_under from './20261124_103335_step4_notice_issued_under';
import * as migration_20261124_103400_real_content from './20261124_103400_real_content';

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
    name: '20261120_082750_two_factor',
  },
  {
    up: migration_20261120_210425_media_object_key.up,
    down: migration_20261120_210425_media_object_key.down,
    name: '20261120_210425_media_object_key',
  },
  {
    up: migration_20261123_152211_step4_foundation.up,
    down: migration_20261123_152211_step4_foundation.down,
    name: '20261123_152211_step4_foundation',
  },
  {
    up: migration_20261123_175317_step4_documents.up,
    down: migration_20261123_175317_step4_documents.down,
    name: '20261123_175317_step4_documents',
  },
  {
    up: migration_20261123_192134_step4_news_events.up,
    down: migration_20261123_192134_step4_news_events.down,
    name: '20261123_192134_step4_news_events',
  },
  {
    up: migration_20261123_201543_step4_pages_settings.up,
    down: migration_20261123_201543_step4_pages_settings.down,
    name: '20261123_201543_step4_pages_settings',
  },
  {
    up: migration_20261124_081246_step4_links_payments.up,
    down: migration_20261124_081246_step4_links_payments.down,
    name: '20261124_081246_step4_links_payments',
  },
  {
    up: migration_20261124_103335_step4_notice_issued_under.up,
    down: migration_20261124_103335_step4_notice_issued_under.down,
    name: '20261124_103335_step4_notice_issued_under'
  },
  {
    up: migration_20261124_103400_real_content.up,
    down: migration_20261124_103400_real_content.down,
    name: '20261124_103400_real_content',
  },
];
