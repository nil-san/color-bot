import { GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const regularFontPath = path.join(
    __dirname,
    "../../assets/fonts/Nunito-Regular.ttf"
);

const boldFontPath = path.join(
    __dirname,
    "../../assets/fonts/Nunito-Bold.ttf"
);

export function loadFonts() {
    console.log("🔍 Loading fonts:");
    console.log(" -", regularFontPath);
    console.log(" -", boldFontPath);

    if (!fs.existsSync(regularFontPath)) {
        throw new Error("❌ Nunito-Regular.ttf NOT FOUND");
    }
    if (!fs.existsSync(boldFontPath)) {
        throw new Error("❌ Nunito-Bold.ttf NOT FOUND");
    }

    GlobalFonts.registerFromPath(regularFontPath, "Nunito");
    GlobalFonts.registerFromPath(boldFontPath, "Nunito");

    console.log("✅ Nunito fonts registered");
}
