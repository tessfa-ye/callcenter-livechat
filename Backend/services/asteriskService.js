const { Client } = require("ssh2");

const createAsteriskExtension = (username, password, extension) => {
    return new Promise((resolve, reject) => {
        // If SSH is not configured, skip (dev mode)
        if (!process.env.ASTERISK_SSH_HOST) {
            console.log("Skipping Asterisk creation (SSH not configured)");
            return resolve();
        }

        const conn = new Client();

        conn.on("ready", () => {
            console.log("SSH Connection Ready");

            // Command to run on Ubuntu
            // We'll assume a script exists: /usr/local/bin/create_agent.sh <username> <password> <extension>
            const cmd = `/usr/local/bin/create_agent.sh "${username}" "${password}" "${extension}"`;

            conn.exec(cmd, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                stream.on("close", (code, signal) => {
                    console.log("Stream :: close :: code: " + code + ", signal: " + signal);
                    conn.end();
                    if (code === 0) resolve();
                    else reject(new Error(`Script exited with code ${code}`));
                }).on("data", (data) => {
                    console.log("STDOUT: " + data);
                }).stderr.on("data", (data) => {
                    console.log("STDERR: " + data);
                });
            });
        }).on("error", (err) => {
            console.error("SSH Connection Error:", err);
            reject(err);
        }).connect({
            host: process.env.ASTERISK_SSH_HOST,
            port: 22,
            username: process.env.ASTERISK_SSH_USER,
            password: process.env.ASTERISK_SSH_PASSWORD,
            // privateKey: require('fs').readFileSync('/path/to/key') // Optional
        });
    });
};

module.exports = { createAsteriskExtension };
