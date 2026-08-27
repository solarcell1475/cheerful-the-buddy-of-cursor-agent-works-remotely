import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';

const TOKEN_KEY = 'cheerful_auth_token';
const USER_KEY = 'cheerful_user_id';
const SERVER_URL_KEY = 'cheerful_server_url';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore quota / private-mode failures.
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function getUserId(): Promise<string | null> {
  return getItem(USER_KEY);
}

export async function getServerUrl(): Promise<string> {
  const stored = await getItem(SERVER_URL_KEY);
  return stored?.trim() || config.serverUrl;
}

export async function setServerUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed) await setItem(SERVER_URL_KEY, trimmed);
  else await deleteItem(SERVER_URL_KEY);
}

export async function setAuth(token: string, userId: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
  await setItem(USER_KEY, userId);
}

export async function clearAuth(): Promise<void> {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_KEY);
  await deleteItem(SERVER_URL_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
