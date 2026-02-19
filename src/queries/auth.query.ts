import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "../store/auth.store"
import { loginApi } from "../api/auth.api"

export const useLogin = () => {
    const setToken = useAuthStore((s) => s.setToken)

    return useMutation({
        mutationFn: ({ username, password }: { username: string; password: string }) =>
            loginApi(username, password),

        onSuccess: (res) => {
            setToken(res.data.token)
        }
    })
}
