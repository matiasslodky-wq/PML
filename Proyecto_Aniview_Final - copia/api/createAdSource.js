module.exports = async (req, res) => {
    // 1. En Vercel leemos el método desde req.method
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const email = process.env.ANIVIEW_EMAIL;
    const password = process.env.ANIVIEW_PASSWORD;
    const accountId = process.env.ANIVIEW_ACCOUNT_ID;

    if (!email || !password || !accountId) {
        return res.status(500).json({ error: "Faltan credenciales en Vercel." });
    }

    try {
        // 1. Login para obtener X-Bamboo-Token
        const loginReq = await fetch('https://manage.aniview.com/api/token?format=json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: email, password: password, accountId: accountId })
        });
        
        const loginData = await loginReq.json();
        if (!loginData.data || !loginData.data.token) throw new Error("Login fallido.");
        const token = loginData.data.token;

        // 2. Agarramos el JSON que armamos en la Wiki (la campaña clonada)
        // OJO ACÁ: Vercel ya transforma el body en objeto, así que lo volvemos a hacer texto para el fetch
        const newAdSourcePayload = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;

        // 3. Hacemos el POST para crearla
        const url = `https://manage.aniview.com/api/adserver/adsource?format=json`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Bamboo-Token': token
            },
            body: newAdSourcePayload
        });

        const data = await response.json();

        // 4. Respondemos con el formato limpio de Vercel
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};