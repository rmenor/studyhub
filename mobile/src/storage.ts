import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "studyhub.token";
const USER_KEY = "studyhub.user";

export type StoredUser = { id: string; email: string; name?: string | null };

export async function saveSession(token: string, user: StoredUser) {
  await AsyncStorage.setMany({
    [TOKEN_KEY]: token,
    [USER_KEY]: JSON.stringify(user),
  });
}

export async function loadSession(): Promise<{
  token: string;
  user: StoredUser;
} | null> {
  const result = await AsyncStorage.getMany([TOKEN_KEY, USER_KEY]);
  const token = result[TOKEN_KEY];
  const userJson = result[USER_KEY];
  if (!token || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) as StoredUser };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.removeMany([TOKEN_KEY, USER_KEY]);
}
