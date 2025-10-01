import type { StoredProject } from "@/types/pipeline";

import Dexie, { type Table } from "dexie";
type TokenRecord = {
  key: string;
  value: string;
};

type SettingRecord = {
  key: string;
  value: string;
};

class GitUtilsDatabase extends Dexie {
  tokens!: Table<TokenRecord, string>;
  settings!: Table<SettingRecord, string>;
  projects!: Table<StoredProject, string>;

  constructor() {
    super("git-utils");

    this.version(1).stores({
      kv: "&key",
    });

    this.version(2).stores({
      kv: null,
      tokens: "&key",
      settings: "&key",
      projects: "&id",
    });
  }
}

export const db = new GitUtilsDatabase();
