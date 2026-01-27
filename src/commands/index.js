import * as addcolor from "./addcolor.js";
import * as removecolor from "./removecolor.js";
import * as listcolors from "./listcolors.js";
import * as colors from "./colors.js";
import * as clearcolors from "./clearcolors.js";
import * as editcolor from "./editcolor.js";

export const commandList = [
    addcolor,
    removecolor,
    listcolors,
    colors,
    clearcolors,
    editcolor
];

export const commandMap = {
    addcolor,
    removecolor,
    listcolors,
    colors,
    clearcolors,
    editcolor
};
