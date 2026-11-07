import axios from "axios";
console.log("API.JS LOADED");

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});
api.get("/health")
    .then((response) => {
        console.log("BACKEND CONNECTED:", response.data);
    })
    .catch((error) => {
        console.error("BACKEND CONNECTION FAILED:", error.message);
    });

export default api;
