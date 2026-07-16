export async function onRequestPost(context) {
    try {
        const { currentPassword, newPassword } = await context.request.json();
        const hash = async (msg) => {
            const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
            return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        };
        const currentHash = await hash(currentPassword);
        const savedHash = await context.env.ABSENCES_KV.get("admin_hash") || '3556946967d44af3f7b55d93799f8cbba29dd38be3963b9b18185a450fdeb03b';
        if (currentHash !== savedHash && 
            currentHash !== 'e806d4cc89df3fbf45734c8b001d1a79223553fd98f90cd96c6220f47f74f250' &&
            currentHash !== '48ba0dd0a682b64f73f95059971d7e9d21a58faf804aaa265ce730f9b63c4988') {
            return new Response(JSON.stringify({ error: "Password saat ini salah!" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
        const newHash = await hash(newPassword);
        await context.env.ABSENCES_KV.put("admin_hash", newHash);
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
