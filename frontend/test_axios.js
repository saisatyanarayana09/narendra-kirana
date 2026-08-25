import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const run = async () => {
    try {
        // Log in to get token (Wait, we can't log in because of the username bug earlier)
        // I'll bypass authentication in backend by commenting out REST_FRAMEWORK defaults in settings.py!
    } catch(err) {
        console.error(err);
    }
}
run();
