import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

async function run() {
    console.log("🔍 Checking directly against Supabase REST API...");
    console.log("Endpoint:", `${url}/rest/v1/profiles?select=id,email`);

    try {
        const res = await fetch(`${url}/rest/v1/profiles?select=id,email`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Accept-Profile': 'iavolution'
            }
        });

        const status = res.status;
        const text = await res.text();

        console.log("Status Code:", status);

        if (status >= 400) {
            console.error("❌ API ERROR:", text);
        } else {
            const data = JSON.parse(text);
            console.log(`✅ Success! Found ${data.length} profiles.`);
            console.log("Profiles:", data);
        }
    } catch (err) {
        console.error("❌ Network block/error:", err.message);
    }
}

run();
