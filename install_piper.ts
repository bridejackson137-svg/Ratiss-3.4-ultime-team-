import fetch from "node-fetch";

async function test() {
    try {
        console.log("Testing install route...");
        const response = await fetch("http://localhost:3000/api/system/install-piper-binary", {
            method: "POST"
        });
        
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Raw response:", text);
    } catch (e) {
        console.error(e);
    }
}

test();
