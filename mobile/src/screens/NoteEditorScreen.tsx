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
  token: string;
  onSaved: () => void;
  onCancel: () => void;
};

export function NoteEditorScreen({ token, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) {
      Alert.alert("Falta el título");
      return;
    }
    setBusy(true);
    try {
      const tagNames = tags
        .split(",")
        .map((s) => s.trim().replace(/^#/, ""))
        .filter(Boolean);
      await api.createNote(token, {
        title: title.trim(),
        content,
        tagNames: tagNames.length ? tagNames : undefined,
      });
      onSaved();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar");
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
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancel}>← Volver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={save} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#818cf8" />
            ) : (
              <Text style={styles.save}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Título"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#78716c"
          style={styles.titleInput}
        />
        <TextInput
          placeholder="Etiquetas separadas por coma (ej: mates, parcial-1)"
          value={tags}
          onChangeText={setTags}
          placeholderTextColor="#78716c"
          style={styles.tagsInput}
        />
        <TextInput
          placeholder="Escribe tu nota…"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#78716c"
          style={styles.contentInput}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0c0a09" },
  scroll: { padding: 16, paddingTop: 56, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cancel: { color: "#a8a29e", fontSize: 15 },
  save: { color: "#818cf8", fontSize: 15, fontWeight: "600" },
  titleInput: {
    color: "#f5f5f4",
    fontSize: 22,
    fontWeight: "700",
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  tagsInput: {
    color: "#a8a29e",
    backgroundColor: "#1c1917",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#292524",
  },
  contentInput: {
    color: "#f5f5f4",
    fontSize: 16,
    backgroundColor: "#1c1917",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 320,
    borderWidth: 1,
    borderColor: "#292524",
    lineHeight: 22,
  },
});
