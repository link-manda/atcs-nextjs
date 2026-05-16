
const shinobiRegex = /^(https?:\/\/shinobi\.bulelengkab\.go\.id\/[^\/]+)\/mp4\/([^\/]+\/[^\/]+)\/s\.mp4$/i;

function transform(url) {
  const match = url.match(shinobiRegex);
  if (match) {
    return `${match[1]}/embed/${match[2]}/fullscreen%7Cjquery%7Chd`;
  }
  return url;
}

const testCases = [
  {
    name: "Standard Buleleng MP4 URL",
    input: "https://shinobi.bulelengkab.go.id/Amk60KFacq87lQMvTCMHu17u00ONuC/mp4/admin/isOvCBwVIA80/s.mp4",
    expected: "https://shinobi.bulelengkab.go.id/Amk60KFacq87lQMvTCMHu17u00ONuC/embed/admin/isOvCBwVIA80/fullscreen%7Cjquery%7Chd"
  },
  {
    name: "Already transformed URL (Idempotency test)",
    input: "https://shinobi.bulelengkab.go.id/Amk60KFacq87lQMvTCMHu17u00ONuC/embed/admin/isOvCBwVIA80/fullscreen%7Cjquery%7Chd",
    expected: "https://shinobi.bulelengkab.go.id/Amk60KFacq87lQMvTCMHu17u00ONuC/embed/admin/isOvCBwVIA80/fullscreen%7Cjquery%7Chd"
  },
  {
    name: "URL with 'mp4' in token (Edge case)",
    input: "https://shinobi.bulelengkab.go.id/my-mp4-token/mp4/admin/monitor/s.mp4",
    expected: "https://shinobi.bulelengkab.go.id/my-mp4-token/embed/admin/monitor/fullscreen%7Cjquery%7Chd"
  },
  {
    name: "Non-Shinobi URL",
    input: "https://transcode.baliprov.go.id/cctv-player.html?id=simpang-lima",
    expected: "https://transcode.baliprov.go.id/cctv-player.html?id=simpang-lima"
  }
];

console.log("--- Shinobi URL Transformation Test ---");
testCases.forEach(tc => {
  const output = transform(tc.input);
  const status = output === tc.expected ? "PASS" : "FAIL";
  console.log(`[${status}] ${tc.name}`);
  if (status === "FAIL") {
    console.log(`  Expected: ${tc.expected}`);
    console.log(`  Actual:   ${output}`);
  }
});
