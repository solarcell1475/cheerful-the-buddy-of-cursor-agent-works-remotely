import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';

const TOKEN_KEY = 'cheerful_auth_token';
const USER_KEY = 'cheerful_user_id';
const SERVER_URL_KEY = 'cheerful_server_url';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_KEY);
}

export async function getServerUrl(): Promise<string> {
  const stored = await SecureStore.getItemAsync(SERVER_URL_KEY);
  return stored?.trim() || config.serverUrl;
}

export async function setServerUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed) await SecureStore.setItemAsync(SERVER_URL_KEY, trimmed);
  else await SecureStore.deleteItemAsync(SERVER_URL_KEY);
}

export async function setAuth(token: string, userId: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, userId);
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(SERVER_URL_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
