import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api";

type Props = {
  onSignedIn: (token: string, user: { id: string; email: string; name?: string | null }) => void;
};

type Mode = "login" | "signup";

export function LoginScreen({ onSignedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || password.length < 8) {
      Alert.alert("Faltan datos", "Email válido y contraseña de 8+ caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await api.register(email.trim(), password, name.trim() || undefined);
      }
      const res = await api.login(email.trim(), password);
      onSignedIn(res.token, res.user);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Algo falló");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.brand}>● StudyHub</Text>
        <Text style={styles.subtitle}>
          {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
        </Text>

        {mode === "signup" && (
          <TextInput
            placeholder="Nombre (opcional)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            style={styles.input}
            placeholderTextColor="#a8a29e"
          />
        )}
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={styles.input}
          placeholderTextColor="#a8a29e"
        />
        <TextInput
          placeholder="Contraseña (mínimo 8)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === "login" ? "password" : "new-password"}
          style={styles.input}
          placeholderTextColor="#a8a29e"
        />

        <TouchableOpacity
          onPress={submit}
          disabled={busy}
          style={[styles.cta, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === "login" ? "signup" : "login")}>
          <Text style={styles.switch}>
            {mode === "login"
              ? "¿Sin cuenta? Créala"
              : "¿Ya tienes cuenta? Entra"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0c0a09" },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    gap: 12,
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    color: "#818cf8",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#f5f5f4",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#1c1917",
    color: "#f5f5f4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#292524",
  },
  cta: {
    backgroundColor: "#818cf8",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  switch: { color: "#a8a29e", textAlign: "center", marginTop: 16 },
});
