import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { getColors } from "../database/colors.js";

/**
 * Generates a color list image for a guild.
 * @param {Guild} guild - The Discord guild
 * @param {Array} colorsSubset - Optional subset of colors to render (default: all)
 * @param {number} offset - Starting index for numbering (default: 0)
 * @returns {Buffer|null} PNG image buffer
 */
export async function generateColorListImage(guild, colorsSubset = null, offset = 0) {
    const colors = colorsSubset ?? getColors(guild.id);
    if (!colors.length) return null;

    // Layout
    const padding = 20;
    const rowHeight = 36;
    let fontSize = 40;
    const columns = 2;
    const columnGap = 60; // gap between columns

    // Dynamic rows per column for this chunk
    const rowsPerColumn = Math.ceil(colors.length / columns);
    const width = 600;
    const height = padding * 2 + rowsPerColumn * rowHeight;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "middle";
    ctx.font = `bold ${fontSize}px "Nunito"`;

    // Measure widest text in this chunk
    let maxTextWidth = 0;
    colors.forEach((color, index) => {
        const text = `${offset + index + 1}. ${color.name}`;
        const textWidth = ctx.measureText(text).width;
        if (textWidth > maxTextWidth) maxTextWidth = textWidth;
    });

    // Adjust font size if text exceeds available column width
    const maxColumnWidth = width / columns - padding * 2 - columnGap;
    if (maxTextWidth > maxColumnWidth) {
        const scale = maxColumnWidth / maxTextWidth;
        fontSize = Math.floor(fontSize * scale);
        ctx.font = `bold ${fontSize}px "Nunito"`;
    }

    // Draw each color
    colors.forEach((color, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);

        // X position uses columnGap between columns
        const x = padding + column * (width / columns) + (column > 0 ? columnGap : 0);
        const y = padding + row * rowHeight + rowHeight / 2;

        const role = guild.roles.cache.get(color.role_id);
        const hexColor =
            role?.hexColor && role.hexColor !== "#000000"
                ? role.hexColor
                : "#ffffff";

        const text = `${offset + index + 1}. ${color.name}`;

        // Shadow for readability
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillStyle = hexColor;
        ctx.fillText(text, x, y);

        // Reset shadow
        ctx.shadowColor = "transparent";
    });

    return canvas.toBuffer("image/png");
}