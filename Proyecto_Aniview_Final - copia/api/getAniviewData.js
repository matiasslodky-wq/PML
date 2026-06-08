exports.handler = async function(event, context) {
    const email = process.env.ANIVIEW_EMAIL;
    const password = process.env.ANIVIEW_PASSWORD;
    const accountId = process.env.ANIVIEW_ACCOUNT_ID;

    const { start, end, dims, mets } = event.queryStringParameters || {};

    if (!email || !password || !accountId) {
        return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales en Netlify." }) };
    }
    if (!start || !end || !dims || !mets) {
        return { statusCode: 400, body: JSON.stringify({ error: "Faltan parámetros de búsqueda." }) };
    }

    try {
        // 1. Convertir fechas a Linux (Epoch) como pide la doc
        const [sy, sm, sd] = start.split('-');
        const startDateEpoch = Math.floor(new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0)).getTime() / 1000);
        
        const [ey, em, ed] = end.split('-');
        const endDateEpoch = Math.floor(new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59)).getTime() / 1000);

        // 2. Login para obtener X-Bamboo-Token
        const loginReq = await fetch('https://manage.aniview.com/api/token?format=json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: email, password: password, accountId: accountId })
        });
        
        const loginData = await loginReq.json();
        if (!loginData.data || !loginData.data.token) throw new Error("Login fallido.");
        const token = loginData.data.token;

        // 3. Formatear como pide la doc: encoded comma (%2C)
        const dimensions = encodeURIComponent(dims); 
        const metrics = encodeURIComponent(mets);
        
        // 4. URL EXACTA SEGÚN DOCUMENTACIÓN (Direct Download)
        // Ejemplo de la doc: ...stats/report?startDate=...&endDate=...&dimensions=...&metrics=...&format=json
        const reportUrl = `https://manage.aniview.com/api/adserver/stats/report?format=json&startDate=${startDateEpoch}&endDate=${endDateEpoch}&dimensions=${dimensions}&metrics=${metrics}`;
        
        const reportReq = await fetch(reportUrl, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json', 
                'Cache-Control': 'no-cache',
                'X-Bamboo-Token': token 
            }
        });

        // 5. Devolver directo el JSON a tu Wiki
        const reportData = await reportReq.json();

        // Diagnóstico por si Aniview devuelve un error escrito dentro del JSON exitoso
        if (reportData.message || (reportData.error && typeof reportData.error === 'string')) {
            throw new Error(reportData.message || reportData.error);
        }

        return { statusCode: 200, body: JSON.stringify(reportData) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
}