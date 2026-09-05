const api = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const web = process.env.WEB_URL ?? 'http://localhost:3000';

async function check(url, expected = 200) {
  const response = await fetch(url);
  if (response.status !== expected) throw new Error(`${url} returned ${response.status}; expected ${expected}`);
  console.log(`PASS ${response.status} ${url}`);
}

await check(`${api}/health`);
await check(`${api}/health/live`);
await check(`${api}/health/ready`);
await check(`${web}/`);
await check(`${web}/products`);
await check(`${web}/robots.txt`);
await check(`${web}/sitemap.xml`);
console.log('Smoke verification passed.');
