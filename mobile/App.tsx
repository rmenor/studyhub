import React, { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar as RNStatusBar, StyleSheet, View } from "react-native";
import { LoginScreen } from "./src/screens/LoginScreen";
import { NotesListScreen } from "./src/screens/NotesListScreen";
import { NoteEditorScreen } from "./src/screens/NoteEditorScreen";
import {
  StoredUser,
  clearSession,
  loadSession,
  saveSession,
} from "./src/storage";

type Screen =
  | { name: "list" }
  | { name: "editor" };

type SessionState =
  | { kind: "loading" }
  | { kind: "unauth" }
  | { kind: "authed"; token: string; user: StoredUser; screen: Screen };

export default function App() {
  const [state, setState] = useState<SessionState>({ kind: "loading" });

  useEffect(() => {
    loadSession().then((s) => {
      if (s) setState({ kind: "authed", ...s, screen: { name: "list" } });
      else setState({ kind: "unauth" });
    });
  }, []);

  function onSignedIn(token: string, user: StoredUser) {
    saveSession(token, user);
    setState({ kind: "authed", token, user, screen: { name: "list" } });
  }

  async function onSignOut() {
    await clearSession();
    setState({ kind: "unauth" });
  }

  if (state.kind === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#818cf8" />
        <RNStatusBar barStyle="light-content" />
      </View>
    );
  }

  if (state.kind === "unauth") {
    return (
      <>
        <RNStatusBar barStyle="light-content" />
        <LoginScreen onSignedIn={onSignedIn} />
      </>
    );
  }

  if (state.screen.name === "editor") {
    return (
      <>
        <RNStatusBar barStyle="light-content" />
        <NoteEditorScreen
          token={state.token}
          onSaved={() => setState((s) => (s.kind === "authed" ? { ...s, screen: { name: "list" } } : s))}
          onCancel={() => setState((s) => (s.kind === "authed" ? { ...s, screen: { name: "list" } } : s))}
        />
      </>
    );
  }

  return (
    <>
      <RNStatusBar barStyle="light-content" />
      <NotesListScreen
        token={state.token}
        onSignOut={onSignOut}
        onCreate={() => setState((s) => (s.kind === "authed" ? { ...s, screen: { name: "editor" } } : s))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0c0a09" },
});
