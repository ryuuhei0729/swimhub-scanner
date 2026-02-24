/**
 * Web API クライアント
 * Bearer token認証でscanner.swim-hub.appのAPIを呼び出す
 */
import type {
  ScanTimesheetRequest,
  ScanTimesheetResponse,
  UserStatusResponse,
  ApiErrorResponse,
} from '@swimhub-scanner/shared'
import Constants from 'expo-constants'
import { supabase } from './supabase'

const API_BASE_URL = Constants.expoConfig?.extra?.webApiUrl || 'https://scanner.swim-hub.app'

export class ApiError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

async function getAccessToken(): Promise<string> {
  if (!supabase) {
    throw new ApiError('Supabaseクライアントが初期化されていません', 'UNAUTHORIZED', 401)
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new ApiError('認証が必要です', 'UNAUTHORIZED', 401)
  }
  return session.access_token
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorBody: ApiErrorResponse
    try {
      errorBody = await response.json() as ApiErrorResponse
    } catch {
      throw new ApiError('サーバーエラーが発生しました', 'API_ERROR', response.status)
    }
    throw new ApiError(errorBody.error, errorBody.code, response.status)
  }

  return response.json() as Promise<T>
}

export async function getUserStatus(): Promise<UserStatusResponse> {
  return apiRequest<UserStatusResponse>('/api/user/status')
}

export async function scanTimesheet(
  request: ScanTimesheetRequest,
): Promise<ScanTimesheetResponse> {
  return apiRequest<ScanTimesheetResponse>('/api/scan-timesheet', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
