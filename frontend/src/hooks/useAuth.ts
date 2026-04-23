import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import {
  ApiError,
  OpenAPI,
  type UserPublic,
  type UserRegister,
  UsersService,
} from "@/client"
import { handleError } from "@/utils"
import useCustomToast from "./useCustomToast"

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null
}

type LoginPayload = {
  username: string
  password: string
}

type AuthTokenPair = {
  access_token: string
  refresh_token: string
  token_type: string
}

const useAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  const registerWithAuthEndpoint = async (data: UserRegister) => {
    const response = await fetch(`${OpenAPI.BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    })

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as {
        detail?: string
      } | null
      throw new ApiError(
        {
          method: "POST",
          url: "/api/v1/auth/register",
        },
        {
          body: errorBody,
          ok: false,
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        },
        errorBody?.detail ?? "Registration failed",
      )
    }
  }

  const signUpMutation = useMutation({
    mutationFn: registerWithAuthEndpoint,
    onSuccess: () => {
      navigate({ to: "/auth/login" })
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: LoginPayload) => {
    const response = await fetch(`${OpenAPI.BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.username,
        password: data.password,
      }),
    })

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as {
        detail?: string
      } | null
      throw new ApiError(
        {
          method: "POST",
          url: "/api/v1/auth/login",
        },
        {
          body: errorBody,
          ok: false,
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        },
        errorBody?.detail ?? "Login failed",
      )
    }

    const authTokens = (await response.json()) as AuthTokenPair
    localStorage.setItem("access_token", authTokens.access_token)
    sessionStorage.setItem("refresh_token", authTokens.refresh_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: "/dashboard" })
    },
    onError: handleError.bind(showErrorToast),
  })

  const logout = async () => {
    const accessToken = localStorage.getItem("access_token")
    if (accessToken) {
      try {
        const response = await fetch(
          `${OpenAPI.BASE}/api/v1/auth/sessions/invalidate-all`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )
        if (!response.ok) {
          throw new Error("Session invalidation failed")
        }
      } catch {
        // Local token cleanup proceeds even if network invalidation fails.
      }
    }
    localStorage.removeItem("access_token")
    sessionStorage.removeItem("refresh_token")
    navigate({ to: "/auth/login" })
  }

  return {
    signUpMutation,
    loginMutation,
    logout,
    user,
  }
}

export { isLoggedIn }
export default useAuth
