import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "..", "data", "colors.db");

// Ensure directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db;

if (!globalThis.__COLOR_DB__) {
    globalThis.__COLOR_DB__ = new Database(dbPath);
}

db = globalThis.__COLOR_DB__;

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

// Ensure order_index is unique per guild (data integrity safety net)
db.prepare(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_color_roles_order
ON color_roles (guild_id, order_index)
`).run();

// Ensure a role can only be used once per guild
db.prepare(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_color_roles_role
ON color_roles (guild_id, role_id)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS color_panels (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    message_id TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS warned_roles (
    guild_id TEXT,
    role_id TEXT,
    PRIMARY KEY (guild_id, role_id)
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

        return { ok: true };
    } catch (err) {
        if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
            return { ok: false, reason: "NAME_EXISTS" };
        }

        if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return { ok: false, reason: "ROLE_ALREADY_USED" };
        }

        throw err; // real error
    }
}

export function updateColor(guildId, oldName, roleId, label, newName) {
    // Fetch existing color
    const existing = db.prepare(`
        SELECT name, role_id, label
        FROM color_roles
        WHERE guild_id = ? AND name = ?
    `).get(guildId, oldName);

    if (!existing) return false;

    const finalName  = newName ?? existing.name;
    const finalRole  = roleId ?? existing.role_id;
    const finalLabel = label ?? existing.label;

    const result = db.prepare(`
        UPDATE color_roles
        SET name = ?, role_id = ?, label = ?
        WHERE guild_id = ? AND name = ?
    `).run(
        finalName,
        finalRole,
        finalLabel,
        guildId,
        oldName
    );

    return result.changes > 0;
}

export function removeColor(guildId, name) {
    const row = db.prepare(`
        SELECT order_index
        FROM color_roles
        WHERE guild_id = ? AND name = ?
    `).get(guildId, name);

    if (!row) return { changes: 0 };

    const tx = db.transaction(() => {
        db.prepare(`
            DELETE FROM color_roles
            WHERE guild_id = ? AND name = ?
        `).run(guildId, name);

        db.prepare(`
            UPDATE color_roles
            SET order_index = order_index - 1
            WHERE guild_id = ?
              AND order_index > ?
        `).run(guildId, row.order_index);
    });

    tx();
    return { changes: 1 };
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

// WARNED ROLES
export function isRoleWarned(guildId, roleId) {
    return !!db.prepare(
        "SELECT 1 FROM warned_roles WHERE guild_id = ? AND role_id = ?"
    ).get(guildId, roleId);
}

export function markRoleWarned(guildId, roleId) {
    db.prepare(
        "INSERT OR IGNORE INTO warned_roles (guild_id, role_id) VALUES (?, ?)"
    ).run(guildId, roleId);
}

export function clearRoleWarning(guildId, roleId) {
    db.prepare(
        "DELETE FROM warned_roles WHERE guild_id = ? AND role_id = ?"
    ).run(guildId, roleId);
}

export function removeColorsByRole(guildId, roleId) {
    const rows = db.prepare(`
        SELECT name, order_index
        FROM color_roles
        WHERE guild_id = ? AND role_id = ?
        ORDER BY order_index ASC
    `).all(guildId, roleId);

    if (!rows.length) return 0;

    const tx = db.transaction(() => {
        for (const row of rows) {
            // Delete the color
            db.prepare(`
                DELETE FROM color_roles
                WHERE guild_id = ? AND role_id = ?
            `).run(guildId, roleId);

            // Close order_index gap
            db.prepare(`
                UPDATE color_roles
                SET order_index = order_index - 1
                WHERE guild_id = ?
                  AND order_index > ?
            `).run(guildId, row.order_index);
        }
    });

    tx();
    return rows.length;
}

export function clearWarningsForRole(guildId, roleId) {
    db.prepare(`
        DELETE FROM warned_roles
        WHERE guild_id = ? AND role_id = ?
    `).run(guildId, roleId);
}

export function closeDatabase() {
    db.close();
}
