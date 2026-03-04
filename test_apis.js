// Quick test of RapidAPI endpoints
const RAPIDAPI_KEY = 'bdda582281msh60021f5d56e6829p142021jsn0e84cd8e03a1';

async function testTikTok() {
    console.log('=== Testing TikTok API ===');
    try {
        const res = await fetch('https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=khaby.lame', {
            headers: {
                'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                'x-rapidapi-key': RAPIDAPI_KEY,
            }
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Keys:', Object.keys(data));
        if (data.userInfo) {
            const u = data.userInfo.user;
            const s = data.userInfo.stats;
            console.log('User:', u?.uniqueId, u?.nickname);
            console.log('Stats:', JSON.stringify(s, null, 2));
        } else {
            console.log('Response:', JSON.stringify(data).substring(0, 500));
        }
    } catch (e) { console.error('TikTok error:', e.message); }
}

async function testInstagram() {
    console.log('\n=== Testing Instagram API ===');
    try {
        const res = await fetch('https://instagram120.p.rapidapi.com/api/instagram/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'instagram120.p.rapidapi.com',
                'x-rapidapi-key': RAPIDAPI_KEY,
            },
            body: JSON.stringify({ username: 'cristiano', maxId: '' }),
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Keys:', Object.keys(data));
        if (data.items) {
            console.log('Posts count:', data.items.length);
            const first = data.items[0];
            console.log('First post keys:', Object.keys(first || {}));
            if (first) {
                console.log('Likes:', first.like_count);
                console.log('Comments:', first.comment_count);
                console.log('Views:', first.view_count || first.play_count);
            }
        } else {
            console.log('Response:', JSON.stringify(data).substring(0, 500));
        }
    } catch (e) { console.error('Instagram error:', e.message); }
}

testTikTok().then(() => testInstagram());
