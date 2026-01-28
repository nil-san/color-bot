
/**
 * Validates a label for color buttons.
 * Returns:
 * - { type: 'custom', id: '1234567890' } for custom emoji
 * - { type: 'unicode', name: '❤️' } for Unicode emoji
 * - { type: 'text', name: 'My Label' } for plain text
 * - null if invalid
 */
export function parseLabel(label) {
    if (!label || typeof label !== "string") return null;

    // Custom emoji: <:name:id> or <a:name:id>
    const customMatch = label.match(/^<a?:\w+:(\d+)>$/);
    if (customMatch && /^\d+$/.test(customMatch[1])) {
        return { type: "custom", id: customMatch[1] };
    }

    // Unicode emoji (allow multiple Unicode emoji sequences)
    if (/^\p{Emoji}+$/u.test(label)) {
        return { type: "unicode", name: label };
    }

    // Plain text
    if (label.length > 0) {
        return { type: "text", name: label };
    }

    return null;
}
