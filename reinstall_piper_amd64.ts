import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";
import { URL } from "url";

const ARCHIVE_URL = "https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz";
const TARGET_DIR = path.join(process.cwd(), "piper");
const TEMP_ARCHIVE = path.join(process.cwd(), "piper_download.tar.gz");

function downloadArchive(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Téléchargement de l'archive Piper : ${url}`);
        const fileStream = fs.createWriteStream(dest);

        const request = (targetUrl: string) => {
            https.get(targetUrl, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
                    const redirectUrl = response.headers.location;
                    if (redirectUrl) {
                        const parsedRedirect = new URL(redirectUrl, targetUrl).toString();
                        console.log(` -> Redirection vers : ${parsedRedirect}`);
                        request(parsedRedirect);
                        return;
                    }
                }

                if (response.statusCode !== 200) {
                    fileStream.close();
                    fs.unlinkSync(dest);
                    reject(new Error(`Le serveur a renvoyé le statut : ${response.statusCode}`));
                    return;
                }

                response.pipe(fileStream);

                fileStream.on("finish", () => {
                    fileStream.close();
                    console.log(` -> Téléchargement terminé : ${fs.statSync(dest).size} octets.`);
                    resolve();
                });
            }).on("error", (err) => {
                fileStream.close();
                if (fs.existsSync(dest)) {
                    fs.unlinkSync(dest);
                }
                reject(err);
            });
        };

        request(url);
    });
}

async function install() {
    try {
        console.log("=== SÉQUENCE D'INSTALLATION PROPRE DE PIPER ===");
        
        // 1. Assurer que le répertoire temporaire de téléchargement est propre
        if (fs.existsSync(TEMP_ARCHIVE)) {
            fs.unlinkSync(TEMP_ARCHIVE);
        }

        // 2. Télécharger l'archive officielle
        await downloadArchive(ARCHIVE_URL, TEMP_ARCHIVE);

        // 3. Purger l'ancien répertoire piper s'il existe
        if (fs.existsSync(TARGET_DIR)) {
            console.log("Suppression de l'ancien répertoire piper...");
            fs.rmSync(TARGET_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TARGET_DIR, { recursive: true });

        // 4. Extraire l'archive
        console.log("Extraction de l'archive tar dans ./piper...");
        execSync(`tar -xzf ${TEMP_ARCHIVE} -C ${TARGET_DIR}`);
        console.log("Extraction terminée.");

        // 5. Nettoyage de l'archive temporaire
        if (fs.existsSync(TEMP_ARCHIVE)) {
            fs.unlinkSync(TEMP_ARCHIVE);
        }

        // 6. Gérer les répertoires imbriqués si existants
        const nestedDir = path.join(TARGET_DIR, "piper");
        if (fs.existsSync(nestedDir)) {
            console.log("Redressement de la structure des fichiers extraits...");
            const nestedFiles = fs.readdirSync(nestedDir);
            nestedFiles.forEach((file) => {
                const src = path.join(nestedDir, file);
                const dest = path.join(TARGET_DIR, file);
                
                // Déplacer de façon robuste
                if (fs.existsSync(dest)) {
                    fs.rmSync(dest, { recursive: true, force: true });
                }
                fs.renameSync(src, dest);
            });
            fs.rmdirSync(nestedDir);
        }

        // 7. Accorder les permissions d'exécution
        const binaryPath = path.join(TARGET_DIR, "piper");
        if (fs.existsSync(binaryPath)) {
            fs.chmodSync(binaryPath, "755");
            console.log("Droits d'exécution 755 appliqués à ./piper/piper.");
        }

        // 8. Tester l'exécution du binaire
        console.log("\n=== CONTRÔLE FONCTIONNEL DU DÉPLOIEMENT ===");
        const helpOutput = execSync(`${binaryPath} --help`, { encoding: "utf8" });
        console.log("Binaire parfaitement opérationnel !");
        console.log(helpOutput.substring(0, 150) + "...");
    } catch (e: any) {
        console.error("Échec critique de l'installation :", e.message || e);
        if (e.stderr) {
            console.error("Stderr :", e.stderr);
        }
    }
}

install();
