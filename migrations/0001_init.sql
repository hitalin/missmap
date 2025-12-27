-- サーバー情報
CREATE TABLE IF NOT EXISTS servers (
    host TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,

    -- 統計
    users_count INTEGER,
    notes_count INTEGER,

    -- ソフトウェア
    software_name TEXT,  -- misskey, sharkey, firefish, cherrypick, etc.
    software_version TEXT,

    -- 登録要件
    registration_open INTEGER DEFAULT 1,      -- 新規登録可能か
    email_required INTEGER DEFAULT 0,         -- メアド必要か
    approval_required INTEGER DEFAULT 0,      -- 承認制か
    invite_only INTEGER DEFAULT 0,            -- 招待制か

    -- 年齢制限（手動設定 or 推測）
    age_restriction TEXT DEFAULT 'unknown',   -- 'all', '18+', 'unknown'

    -- メタ
    is_japanese INTEGER DEFAULT 1,
    updated_at TEXT
);

-- 連合関係
CREATE TABLE IF NOT EXISTS federations (
    source_host TEXT NOT NULL,
    target_host TEXT NOT NULL,
    is_blocked INTEGER DEFAULT 0,
    is_suspended INTEGER DEFAULT 0,
    users_count INTEGER DEFAULT 0,
    notes_count INTEGER DEFAULT 0,
    updated_at TEXT,
    PRIMARY KEY (source_host, target_host)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_federations_source ON federations(source_host);
CREATE INDEX IF NOT EXISTS idx_federations_target ON federations(target_host);
CREATE INDEX IF NOT EXISTS idx_federations_blocked ON federations(is_blocked) WHERE is_blocked = 1;
CREATE INDEX IF NOT EXISTS idx_servers_software ON servers(software_name);
CREATE INDEX IF NOT EXISTS idx_servers_registration ON servers(registration_open);
