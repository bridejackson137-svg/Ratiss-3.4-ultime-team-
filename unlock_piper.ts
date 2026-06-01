
import fetch from "node-fetch";

async function unlock() {
    try {
        const response = await fetch("http://localhost:3000/api/system/unlock-piper", {
            method: "POST"
        });
        const data = await response.json();
        console.log(data);
    } catch (e) {
        console.error(e);
    }
}

unlock();
