import axios from 'axios';

async function trigger() {
    try {
        console.log("Triggering download...");
        const response = await axios.post('http://localhost:3000/api/system/download-tts');
        console.log("Response:", response.data);
    } catch (e: any) {
        if (e.response) {
            console.error("Error Response Data:", e.response.data);
        } else {
            console.error("Error Message:", e.message);
        }
    }
}

trigger();
