import Database from "better-sqlite3";

const db = new Database("colors.db");

// ---------- TABLES ----------
db.prepare(`
CREATE TABLE IF NOT EXISTS color_roles (
    guild_id TEXT,
    name TEXT,
    role_id TEXT,
    label TEXT,
    order_index INTEGER,
    PRIMARY KEY (guild_id, name)
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS color_panels (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    message_id TEXT
)
`).run();

// ---------- COLORS ----------
export function getColors(guildId) {
    return db.prepare(
        "SELECT * FROM color_roles WHERE guild_id = ? ORDER BY order_index ASC"
    ).all(guildId);
}

export function addColor(guildId, name, roleId, label) {
    try {
        const row = db.prepare(`
            SELECT MAX(order_index) AS max
            FROM color_roles
            WHERE guild_id = ?
        `).get(guildId);

        const nextOrder = (row?.max ?? -1) + 1;

        db.prepare(`
            INSERT INTO color_roles (guild_id, name, role_id, label, order_index)
            VALUES (?, ?, ?, ?, ?)
        `).run(guildId, name, roleId, label || name, nextOrder);

        return true;
    } catch (err) {
        if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") return false;
        throw err;
    }
}

export function updateColor(guildId, name, roleId, label) {
    const result = db.prepare(`
        UPDATE color_roles
        SET role_id = ?, label = ?
        WHERE guild_id = ? AND name = ?
    `).run(roleId, label, guildId, name);
    return result.changes > 0;
}

export function removeColor(guildId, name) {
    return db.prepare(
        "DELETE FROM color_roles WHERE guild_id = ? AND name = ?"
    ).run(guildId, name);
}

export function clearColors(guildId) {
    return db.prepare(
        "DELETE FROM color_roles WHERE guild_id = ?"
    ).run(guildId);
}

// ---------- COLOR LIST MESSAGES ----------
db.prepare(`
CREATE TABLE IF NOT EXISTS color_list_messages (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL
)
`).run();

// Safe ALTER TABLE for extra_message_ids
try {
    db.prepare(`
        ALTER TABLE color_list_messages
        ADD COLUMN extra_message_ids TEXT
    `).run();
} catch (err) {
    if (!err.message.includes("duplicate column name")) throw err;
}

// Get first + extra messages
export function getColorListMessages(guildId) {
    const row = db.prepare(`
        SELECT channel_id, message_id, extra_message_ids
        FROM color_list_messages
        WHERE guild_id = ?
    `).get(guildId);

    if (!row) return null;

    if (row.extra_message_ids) {
        row.extra_message_ids = JSON.parse(row.extra_message_ids);
    } else {
        row.extra_message_ids = [];
    }

    return row;
}

// Save first + extra messages
export function saveColorListMessages(guildId, firstMessage, extraMessages = []) {
    return db.prepare(`
        INSERT INTO color_list_messages (guild_id, channel_id, message_id, extra_message_ids)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
            channel_id = excluded.channel_id,
            message_id = excluded.message_id,
            extra_message_ids = excluded.extra_message_ids
    `).run(
        guildId,
        firstMessage.channel_id,
        firstMessage.message_id,
        JSON.stringify(extraMessages)
    );
}

// Clear all color list messages
export function clearColorListMessages(guildId) {
    return db.prepare(
        "DELETE FROM color_list_messages WHERE guild_id = ?"
    ).run(guildId);
}

// ---------- PANEL ----------
try {
    db.prepare(`
        ALTER TABLE color_panels
        ADD COLUMN extra_message_ids TEXT
    `).run();
} catch (err) {
    if (!err.message.includes("duplicate column name")) throw err;
}

export function getPanel(guildId) {
    const row = db.prepare(
        "SELECT * FROM color_panels WHERE guild_id = ?"
    ).get(guildId);

    if (!row) return null;

    if (row.extra_message_ids) {
        row.extra_message_ids = JSON.parse(row.extra_message_ids);
    } else {
        row.extra_message_ids = [];
    }

    return row;
}

export function savePanel(guildId, channelId, messageId, extraMessageIds = []) {
    return db.prepare(`
        INSERT INTO color_panels (guild_id, channel_id, message_id, extra_message_ids)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
            channel_id = excluded.channel_id,
            message_id = excluded.message_id,
            extra_message_ids = excluded.extra_message_ids
    `).run(guildId, channelId, messageId, JSON.stringify(extraMessageIds));
}

export function updatePanelMessages(guildId, extraMessageIds) {
    return db.prepare(`
        UPDATE color_panels
        SET extra_message_ids = ?
        WHERE guild_id = ?
    `).run(JSON.stringify(extraMessageIds), guildId);
}

export function clearPanel(guildId) {
    return db.prepare(
        "DELETE FROM color_panels WHERE guild_id = ?"
    ).run(guildId);
}
