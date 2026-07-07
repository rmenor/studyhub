import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, Folder, ListNotesOpts, Note, Tag } from "../api";

type Props = {
  token: string;
  onSignOut: () => void;
  onCreate: () => void;
};

type FolderNode = Folder & { children: FolderNode[] };

function buildTree(folders: Folder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  for (const f of folders) map.set(f.id, { ...f, children: [] });
  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function FolderTreeRow({
  node,
  depth,
  activeId,
  onPick,
}: {
  node: FolderNode;
  depth: number;
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const active = activeId === node.id;
  return (
    <View>
      <TouchableOpacity
        onPress={() => onPick(node.id)}
        style={[
          styles.drawerItem,
          { paddingLeft: 16 + depth * 16 },
          active && styles.drawerItemActive,
        ]}
      >
        <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>
          {node.name}
          {node._count?.notes ? `  (${node._count.notes})` : ""}
        </Text>
      </TouchableOpacity>
      {node.children.map((c) => (
        <FolderTreeRow key={c.id} node={c} depth={depth + 1} activeId={activeId} onPick={onPick} />
      ))}
    </View>
  );
}

export function NotesListScreen({ token, onSignOut, onCreate }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tree = useMemo(() => buildTree(folders), [folders]);

  const loadMeta = useCallback(async () => {
    try {
      const [fr, tg] = await Promise.all([api.listFolders(token), api.listTags(token)]);
      setFolders(fr.folders);
      setTags(tg.tags);
    } catch {
      /* non-fatal */
    }
  }, [token]);

  const load = useCallback(
    async (opts?: ListNotesOpts) => {
      try {
        const { notes } = await api.listNotes(token, {
          q: search.trim() || undefined,
          folderId: activeFolder ?? undefined,
          tag: activeTag ?? undefined,
          ...opts,
        });
        setNotes(notes);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "No se pudieron cargar las notas");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, search, activeFolder, activeTag],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // Reload whenever the filter changes (search debounce is above).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder, activeTag]);

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

  function pickFolder(id: string | null) {
    setActiveFolder(id);
    setDrawerOpen(false);
  }

  function pickTag(name: string | null) {
    setActiveTag(name);
    setDrawerOpen(false);
  }

  async function createFolderPrompt(parentId: string | null = null) {
    Alert.prompt?.(
      "Nueva carpeta",
      parentId ? "Nombre de la subcarpeta" : "Nombre de la carpeta raíz",
      async (name) => {
        if (!name?.trim()) return;
        try {
          await api.createFolder(token, name.trim(), parentId);
          await loadMeta();
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "No se pudo crear la carpeta");
        }
      },
    );
  }

  const activeFolderName = activeFolder
    ? folders.find((f) => f.id === activeFolder)?.name
    : null;

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
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          style={styles.menuBtn}
          accessibilityLabel="Abrir carpetas y etiquetas"
        >
          <Text style={styles.menuBtnText}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {activeTag ? `#${activeTag}` : activeFolderName ?? "Mis notas"}
          </Text>
          {(activeFolder || activeTag) && (
            <TouchableOpacity onPress={() => { setActiveFolder(null); setActiveTag(null); }}>
              <Text style={styles.clearFilter}>Limpiar filtro</Text>
            </TouchableOpacity>
          )}
        </View>
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
          <Text style={styles.emptyText}>Sin notas en esta vista</Text>
          <TouchableOpacity onPress={onCreate} style={styles.cta}>
            <Text style={styles.ctaText}>Crear una</Text>
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
                load();
                loadMeta();
              }}
              tintColor="#818cf8"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity onLongPress={() => onDelete(item.id)} style={styles.card}>
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
                {item.folder ? (
                  <Text style={styles.folder}>📁 {item.folder.name}</Text>
                ) : null}
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

      <Modal
        visible={drawerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerBackdrop}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Carpetas y etiquetas</Text>
              <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                <Text style={styles.drawerClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.drawerSection}>Vistas</Text>
              <TouchableOpacity
                onPress={() => pickFolder(null)}
                style={[styles.drawerItem, !activeFolder && !activeTag && styles.drawerItemActive]}
              >
                <Text style={[styles.drawerItemText, !activeFolder && !activeTag && styles.drawerItemTextActive]}>
                  Todas las notas
                </Text>
              </TouchableOpacity>

              <View style={styles.drawerSectionHeader}>
                <Text style={styles.drawerSection}>Carpetas</Text>
                <TouchableOpacity onPress={() => createFolderPrompt(null)}>
                  <Text style={styles.drawerAdd}>+ Nueva</Text>
                </TouchableOpacity>
              </View>
              {tree.length === 0 ? (
                <Text style={styles.drawerEmpty}>Sin carpetas todavía</Text>
              ) : (
                tree.map((node) => (
                  <FolderTreeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    activeId={activeFolder}
                    onPick={pickFolder}
                  />
                ))
              )}

              <Text style={styles.drawerSection}>Etiquetas</Text>
              {tags.length === 0 ? (
                <Text style={styles.drawerEmpty}>Sin etiquetas</Text>
              ) : (
                tags.map((t) => {
                  const active = activeTag === t.name;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => pickTag(t.name)}
                      style={[styles.drawerItem, active && styles.drawerItemActive]}
                    >
                      <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>
                        #{t.name}
                        <Text style={styles.drawerCount}> {t.noteCount}</Text>
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0c0a09" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0c0a09" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#f5f5f4" },
  signout: { color: "#a8a29e", fontSize: 14 },
  clearFilter: { color: "#818cf8", fontSize: 12, marginTop: 2 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1c1917",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#292524",
  },
  menuBtnText: { color: "#f5f5f4", fontSize: 20 },
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
  folder: { color: "#a8a29e", fontSize: 12 },
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

  drawerBackdrop: { flex: 1, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.5)" },
  drawer: {
    width: "80%",
    backgroundColor: "#0c0a09",
    borderRightWidth: 1,
    borderRightColor: "#292524",
    paddingTop: 64,
    paddingHorizontal: 0,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  drawerTitle: { color: "#f5f5f4", fontSize: 18, fontWeight: "700" },
  drawerClose: { color: "#818cf8", fontSize: 14 },
  drawerSection: {
    color: "#a8a29e",
    fontSize: 11,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  drawerSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 20 },
  drawerAdd: { color: "#818cf8", fontSize: 12 },
  drawerItem: { paddingVertical: 10, paddingHorizontal: 20 },
  drawerItemActive: { backgroundColor: "#1c1917" },
  drawerItemText: { color: "#d6d3d1", fontSize: 15 },
  drawerItemTextActive: { color: "#818cf8", fontWeight: "600" },
  drawerCount: { color: "#78716c", fontSize: 12 },
  drawerEmpty: { color: "#78716c", fontStyle: "italic", paddingHorizontal: 20, paddingVertical: 8 },
});