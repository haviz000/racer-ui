import api from "./axios";

export const loginApi = async (username: string, password: string) => {
    try {
        const res = await api.post("/login", { username, password })
        return res
    } catch (error) {
        throw error?.response?.data || "Login failed";
    }
}