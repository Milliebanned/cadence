// Cloudflare Worker that serves the Cadence live demo on a custom domain.
// Each custom hostname forwards to the Instabox public port URL that runs that service.
// Calling the Instabox URL (rather than a tunnel on the machine) also wakes the machine
// when it has paused itself for being idle.

const UPSTREAM = {
  "cadence.milliebanned.xyz": "https://8770-agqxzzl53nez5zvv7ja2roaoqi.instabox.tech",
  "cadence-shop.milliebanned.xyz": "https://8780-agqxzzl53nez5zvv7ja2roaoqi.instabox.tech",
  "cadence-app.milliebanned.xyz": "https://8790-agqxzzl53nez5zvv7ja2roaoqi.instabox.tech",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstream = UPSTREAM[url.hostname];
    if (!upstream) return new Response("Not found", { status: 404 });
    const target = new URL(url.pathname + url.search, upstream);
    // Same method, headers (including Origin, which the app checks) and body; the Host
    // header comes from the target URL so Instabox can route the request.
    return fetch(new Request(target, request));
  },
};
