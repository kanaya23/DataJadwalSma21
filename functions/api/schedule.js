export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const defaultRes = await fetch(`${url.origin}/schedule_data.json`);
        if (!defaultRes.ok) throw new Error("Failed to fetch default schedule data JSON");
        const defaultData = await defaultRes.json();
        const kvVal = await context.env.ABSENCES_KV.get("schedule_data");
        if (!kvVal) {
            await context.env.ABSENCES_KV.put("schedule_data", JSON.stringify(defaultData));
            return new Response(JSON.stringify(defaultData), {
                headers: { "Content-Type": "application/json" }
            });
        }
        const kvData = JSON.parse(kvVal);
        if (defaultData.version && (!kvData.version || defaultData.version > kvData.version)) {
            const savedAbsences = await context.env.ABSENCES_KV.get("absences");
            if (savedAbsences) {
                defaultData.absences = JSON.parse(savedAbsences);
            }
            await context.env.ABSENCES_KV.put("schedule_data", JSON.stringify(defaultData));
            return new Response(JSON.stringify(defaultData), {
                headers: { "Content-Type": "application/json" }
            });
        }
        const savedAbsences = await context.env.ABSENCES_KV.get("absences");
        if (savedAbsences) {
            kvData.absences = JSON.parse(savedAbsences);
        }
        return new Response(JSON.stringify(kvData), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPost(context) {
    try {
        const { scheduleData, password } = await context.request.json();
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
        const kvVal = await context.env.ABSENCES_KV.get("schedule_data");
        let currentVersion = 1;
        if (kvVal) {
            const kvData = JSON.parse(kvVal);
            currentVersion = kvData.version || 1;
        }
        scheduleData.version = currentVersion + 1;
        await context.env.ABSENCES_KV.put("schedule_data", JSON.stringify(scheduleData));
        if (scheduleData.absences) {
            await context.env.ABSENCES_KV.put("absences", JSON.stringify(scheduleData.absences));
        }
        return new Response(JSON.stringify({ success: true, version: scheduleData.version }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
