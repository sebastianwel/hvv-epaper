export default async function handler(req, res) {
    const owner = 'sebastianwel'; // Dein GitHub Benutzername
    const repo = 'hvv-epaper'; // Dein Repository Name

    // GET: Aktuelle Datei von GitHub laden
    if (req.method === 'GET') {
        const { file } = req.query;
        if (!['config.json', 'mood.json', 'todo.json'].includes(file)) {
            return res.status(400).json({ error: 'Invalid file' });
        }

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${file}`;
        try {
            const getRes = await fetch(url, {
                headers: { 
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`, 
                    'User-Agent': 'Vercel-App',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (!getRes.ok) throw new Error('Datei konnte nicht geladen werden');
            
            const fileData = await getRes.json();
            const content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
            return res.status(200).json(content);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // POST: Datei auf GitHub aktualisieren
    if (req.method === 'POST') {
        const { file, content } = req.body; 
        if (!['config.json', 'mood.json', 'todo.json'].includes(file)) {
            return res.status(400).json({ error: 'Invalid file' });
        }

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${file}`;

        try {
            const getRes = await fetch(url, {
                headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}`, 'User-Agent': 'Vercel-App' }
            });
            const fileData = await getRes.json();
            const sha = fileData.sha;

            const encodedContent = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
            
            const putRes = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Vercel-App'
                },
                body: JSON.stringify({
                    message: `Update ${file} via Web-App`,
                    content: encodedContent,
                    sha: sha
                })
            });

            if (putRes.ok) {
                return res.status(200).json({ success: true });
            } else {
                const err = await putRes.json();
                return res.status(500).json({ error: err.message });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
