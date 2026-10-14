export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { file, content } = req.body; 
    if (!['config.json', 'mood.json', 'todo.json'].includes(file)) {
        return res.status(400).json({ error: 'Invalid file' });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = 'sebastianwel'; // Dein GitHub Benutzername
    const repo = 'hvv-epaper'; // Dein Repository Name

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${file}`;

    try {
        // 1. SHA der aktuellen Datei holen (wichtig für GitHub Updates)
        const getRes = await fetch(url, {
            headers: { 'Authorization': `token ${token}`, 'User-Agent': 'Vercel-App' }
        });
        const fileData = await getRes.json();
        const sha = fileData.sha;

        // 2. Datei auf GitHub aktualisieren
        const encodedContent = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
        
        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
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
