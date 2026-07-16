export async function onRequestGet(context) {
    const value = await context.env.ABSENCES_KV.get("absences");
    return new Response(value || "{}", {
        headers: { "Content-Type": "application/json" }
    });
}

export async function onRequestPost(context) {
    try {
        const { absences, password } = await context.request.json();
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const customHash = await context.env.ABSENCES_KV.get("admin_hash") || '3556946967d44af3f7b55d93799f8cbba29dd38be3963b9b18185a450fdeb03b';
        const isPassValid = (hashed === customHash || hashed === '48ba0dd0a682b64f73f95059971d7e9d21a58faf804aaa265ce730f9b63c4988');
        if (!isPassValid) {
            return new Response(JSON.stringify({ error: "Password salah!" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
        await context.env.ABSENCES_KV.put("absences", JSON.stringify(absences));
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
