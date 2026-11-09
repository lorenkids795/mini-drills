// What kind of build this is. build.js rewrites this file during a Cloudflare Pages build (production = branch main,
// staging = any other branch). This committed copy means "not a Cloudflare build" (tests, local copies).
// functions/api/[[path]].js imports it to refuse a staging deployment that points at production (see build.js).
export default { env: '', branch: '', sha: '', fbProject: '', fbError: '' };
