import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, Folder } from "../api";

type Props = {
  token: string;
  onSaved: () => void;
  onCancel: () => void;
};

export function NoteEditorScreen({ token, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .listFolders(token)
      .then((r) => setFolders(r.folders))
      .catch(() => {});
  }, [token]);

  const activeFolder = folders.find((f) => f.id === folderId);

  async function save() {
    if (!title.trim()) {
      Alert.alert("Falta el título");
      return;
    }
    setBusy(true);
    try {
      const tagNames = tagsInput
        .split(",")
        .map((s) => s.trim().replace(/^#/, ""))
        .filter(Boolean);
      await api.createNote(token, {
        title: title.trim(),
        content,
        tagNames: tagNames.length ? tagNames : undefined,
        folderId,
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Carpeta</Text>
            <TouchableOpacity
              onPress={() => setFolderPickerOpen(true)}
              style={styles.picker}
            >
              <Text style={styles.pickerText}>
                {activeFolder ? `📁 ${activeFolder.name}` : "— Sin carpeta —"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Etiquetas (separadas por coma)</Text>
        <TextInput
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="ej: mates, parcial-1"
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

      <Modal
        visible={folderPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFolderPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFolderPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Elegir carpeta</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <TouchableOpacity
                onPress={() => { setFolderId(null); setFolderPickerOpen(false); }}
                style={[styles.modalItem, folderId === null && styles.modalItemActive]}
              >
                <Text style={[styles.modalItemText, folderId === null && styles.modalItemTextActive]}>
                  — Sin carpeta —
                </Text>
              </TouchableOpacity>
              {folders.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => { setFolderId(f.id); setFolderPickerOpen(false); }}
                  style={[styles.modalItem, folderId === f.id && styles.modalItemActive]}
                >
                  <Text style={[styles.modalItemText, folderId === f.id && styles.modalItemTextActive]}>
                    📁 {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  label: { color: "#a8a29e", fontSize: 12, marginBottom: 4 },
  picker: {
    backgroundColor: "#1c1917",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#292524",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: { color: "#f5f5f4", fontSize: 15 },
  tagsInput: {
    color: "#f5f5f4",
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
    minHeight: 280,
    borderWidth: 1,
    borderColor: "#292524",
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1c1917",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitle: { color: "#f5f5f4", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  modalItem: { paddingVertical: 12 },
  modalItemActive: { backgroundColor: "#0c0a09", borderRadius: 6 },
  modalItemText: { color: "#f5f5f4", fontSize: 15 },
  modalItemTextActive: { color: "#818cf8", fontWeight: "600" },
});