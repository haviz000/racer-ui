import api from "./axios";
import { AxiosError } from "axios";

export const loginApi = async (username: string, password: string) => {
    try {
        const res = await api.post("/login", { username, password })
        return res
    } catch (error) {
        if (error instanceof AxiosError) {
            throw error.response?.data || "Login failed";
        }
        throw "Login failed";
    }
}