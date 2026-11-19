// Bridge between the ES5 app (index.html) and the Dictation Lab ES modules (O-1). The app adds
// <script type="module" src="/dictation/bridge.js"> only when the Dictation screen is opened, then waits for "md-dl-ready".
import { mountPractice, mountHomework, mountAuthor, audioPlayer } from "./ui.js";
import { validateDictationJson, validateDictationDocument } from "./validator/index.js";
import SCHEMA from "./validator/schema.js";
window.MD_DL = { mountPractice, mountHomework, mountAuthor, audioPlayer, validate: (json) => validateDictationJson(json, { schema: SCHEMA }), validateDoc: (doc) => validateDictationDocument(doc, { schema: SCHEMA }) };
window.dispatchEvent(new Event("md-dl-ready"));
