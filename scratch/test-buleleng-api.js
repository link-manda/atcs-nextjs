async function test() {
  const url = 'https://balisatudata.baliprov.go.id/api/v1/report-cctv';
  const res = await fetch(url);
  const json = await res.json();
  const data = json.data;
  const entries = Object.values(data);
  const buleleng = entries.filter(e => e.streaming_url && e.streaming_url.includes('bulelengkab'));
  console.log(JSON.stringify(buleleng, null, 2));
}
test();
