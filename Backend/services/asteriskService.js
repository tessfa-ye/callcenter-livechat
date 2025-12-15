const { Client } = require("ssh2");
const AsteriskManager = require("asterisk-manager");

// Create AMI connection for reload
let ami = null;
if (process.env.AMI_HOST) {
    ami = new AsteriskManager(
        process.env.AMI_PORT,
        process.env.AMI_HOST,
        process.env.AMI_USER,
        process.env.AMI_PASS,
        true
    );
    ami.keepConnected();
}

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
            const cmd = `/usr/local/bin/create_agent.sh "${username}" "${password}" "${extension}"`;

            conn.exec(cmd, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                stream.on("close", (code, signal) => {
                    conn.end();

                    if (code === 0) {
                        // Also trigger PJSIP reload via AMI as backup
                        if (ami) {
                            ami.action({ action: "Command", command: "pjsip reload" }, (err, res) => {
                                if (err) console.log("AMI PJSIP Reload Error:", err.message);
                                else console.log("PJSIP Reload via AMI successful");
                            });
                        }
                        resolve();
                    } else {
                        reject(new Error(`Script exited with code ${code}`));
                    }
                }).on("data", (data) => {
                    // Only log extension creation success
                    if (data.toString().includes("created")) {
                        console.log("STDOUT: " + data);
                    }
                }).stderr.on("data", (data) => {
                    // Only log actual errors, not CLI connection warnings
                    const stderr = data.toString();
                    if (!stderr.includes("asterisk.ctl exist")) {
                        console.log("STDERR: " + data);
                    }
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
        });
    });
};

module.exports = { createAsteriskExtension };
