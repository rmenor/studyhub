import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, Note } from "../api";

type Props = {
  token: string;
  onSignOut: () => void;
  onCreate: () => void;
};

export function NotesListScreen({ token, onSignOut, onCreate }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (q?: string) => {
      try {
        const { notes } = await api.listNotes(token, q?.trim() || undefined);
        setNotes(notes);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "No se pudieron cargar las notas");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  async function onDelete(id: string) {
    Alert.alert("Borrar nota", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteNote(token, id);
            setNotes((prev) => prev.filter((n) => n.id !== id));
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "No se pudo borrar");
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#818cf8" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis notas</Text>
        <TouchableOpacity onPress={onSignOut}>
          <Text style={styles.signout}>Salir</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        placeholder="Buscar…"
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#a8a29e"
        style={styles.search}
      />
      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin notas todavía</Text>
          <TouchableOpacity onPress={onCreate} style={styles.cta}>
            <Text style={styles.ctaText}>Crear la primera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(search);
              }}
              tintColor="#818cf8"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onLongPress={() => onDelete(item.id)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                {item.pinned ? <Text style={styles.pin}>★</Text> : null}
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              <Text style={styles.cardBody} numberOfLines={2}>
                {item.content || "(vacío)"}
              </Text>
              <View style={styles.cardMeta}>
                {item.tags.map(({ tag }) => (
                  <Text key={tag.id} style={styles.tag}>
                    #{tag.name}
                  </Text>
                ))}
                <Text style={styles.date}>
                  {new Date(item.updatedAt).toLocaleDateString("es-ES")}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <TouchableOpacity onPress={onCreate} style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0c0a09" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0c0a09" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#f5f5f4" },
  signout: { color: "#a8a29e", fontSize: 14 },
  search: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#1c1917",
    color: "#f5f5f4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#292524",
  },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#a8a29e", marginBottom: 16 },
  cta: { backgroundColor: "#818cf8", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  ctaText: { color: "#fff", fontWeight: "600" },
  card: {
    backgroundColor: "#1c1917",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#292524",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  pin: { color: "#818cf8", fontSize: 14 },
  cardTitle: { color: "#f5f5f4", fontSize: 16, fontWeight: "600", flex: 1 },
  cardBody: { color: "#a8a29e", fontSize: 14, marginBottom: 8 },
  cardMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  tag: { color: "#818cf8", fontSize: 12, backgroundColor: "#0c0a09", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  date: { marginLeft: "auto", color: "#78716c", fontSize: 12 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    backgroundColor: "#818cf8",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 30, lineHeight: 32, fontWeight: "300" },
});
