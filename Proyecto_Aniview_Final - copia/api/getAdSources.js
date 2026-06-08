module.exports = async (req, res) => {
    // 1. Vercel: Verificamos que sea un método GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const email = process.env.ANIVIEW_EMAIL;
    const password = process.env.ANIVIEW_PASSWORD;
    const accountId = process.env.ANIVIEW_ACCOUNT_ID;

    if (!email || !password || !accountId) {
        return res.status(500).json({ error: "Faltan credenciales en Vercel." });
    }

    try {
        // 2. Login para obtener X-Bamboo-Token
        const loginReq = await fetch('https://manage.aniview.com/api/token?format=json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: email, password: password, accountId: accountId })
        });
        
        const loginData = await loginReq.json();
        if (!loginData.data || !loginData.data.token) throw new Error("Login fallido.");
        const token = loginData.data.token;

        // 3. Traemos los últimos 100 Ad Sources para usar de molde
        const url = `https://manage.aniview.com/api/adserver/adsource?format=json&pager={"pageIndex":1,"pageSize":100}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Bamboo-Token': token
            }
        });

        const data = await response.json();

        // 4. Respuesta al estilo Vercel (res.status.json)
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};