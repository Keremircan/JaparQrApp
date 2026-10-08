import { useState, useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSession } from "@/context/session";
import { colors, radius, spacing } from "@/constants/theme";

// const SAMPLE_MOVEMENTS = [
//   {
//     id: "1",
//     type: "Giriş",
//     time: "07:58",
//     gate: "Ana Giriş A",
//     status: "Onaylandı",
//   },
//   {
//     id: "2",
//     type: "Çıkış",
//     time: "12:02",
//     gate: "Yemekhane",
//     status: "Onaylandı",
//   },
//   {
//     id: "3",
//     type: "Giriş",
//     time: "12:41",
//     gate: "Üretim Kapısı B",
//     status: "Onaylandı",
//   },
// ];
const LogList_URL = "http://192.168.1.110:3000/api/listLogs";

export default function HomeScreen() {
  const { employee, signOut, setLastType } = useSession();
  const [loading, setLoading] = useState(false);

  // Log elemanının tip tanımı
  type AttendanceLog = {
    id: number;
    gate: string;
    type: "IN" | "OUT";
    time: string;
  };
  const [logList, setLogList] = useState<AttendanceLog[]>([]);

  const insets = useSafeAreaInsets();

  const today = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const handleListLogs = async () => {
    if (!employee?.employeeCode) return;

    setLoading(true);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // 1. Backend İsteği
      const response = await fetch(LogList_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: employee.employeeCode.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const logs = data.logList || [];
        setLogList(logs);

        // En son hareket DESC sıralı olduğu için ilk elemandır:
        if (logs.length > 0) {
          setLastType(logs[0].type); // 'IN' veya 'OUT'
        } else {
          setLastType(null); // Bugün henüz hareket yok
        }
      } else {
        setLogList([]);
      }
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Bağlantı Hatası",
        "Sunucuya erişilemedi. Wi-Fi bağlantınızı kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Kamera ekranından geri dönüldüğünde listenin otomatik tazelenmesi için:
  useFocusEffect(
    useCallback(() => {
      void handleListLogs();
    }, [employee?.employeeCode]),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>JAPAR · Devam takibi</Text>
            <Text style={styles.greeting}>
              Merhaba, {employee?.name ?? "Çalışan"}
            </Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <Pressable onPress={signOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Çıkış</Text>
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(employee?.name ?? "Ç")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{employee?.name}</Text>
            <Text style={styles.profileRole}>
              {employee?.title} · {employee?.department}
            </Text>
            <Text style={styles.profileCode}>
              Sicil {employee?.employeeCode}
            </Text>
          </View>
          <View style={styles.statusChip}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Vardiyada</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryAction,
            pressed && styles.primaryActionPressed,
          ]}
          onPress={() => router.push("/(tabs)/scan")}
        >
          <View style={styles.primaryIcon}>
            <Ionicons name="qr-code" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.primaryCopy}>
            <Text style={styles.primaryTitle}>QR ile yoklama</Text>
            <Text style={styles.primarySubtitle}>
              Giriş noktasındaki karekodu okutun
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Son İşlem</Text>
            <Text style={styles.statValue}>
              {logList.length > 0 ? logList[0].time : "--:--"}
            </Text>
            <Text style={styles.statHint}>
              {logList.length > 0 ? logList[0].gate : "Kayıt yok"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Vardiya</Text>
            <Text style={styles.statValueSm}>
              {employee?.shift ?? "08:00 – 16:00"}
            </Text>
            <Text style={styles.statHint}>Gündüz vardiyası</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Bu hafta</Text>
            <Text style={styles.statValue}>32s</Text>
            <Text style={styles.statHint}>4 iş günü</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Bugünkü hareketler</Text>
          {loading && <ActivityIndicator size="small" color={colors.navy} />}
        </View>

        <View style={styles.list}>
          {logList.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>
                Bugüne ait giriş/çıkış kaydı bulunamadı.
              </Text>
            </View>
          ) : (
            logList.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.listItem,
                  index === logList.length - 1 && styles.listItemLast,
                ]}
              >
                <View style={styles.listIcon}>
                  <Ionicons
                    name={item.type === "IN" ? "enter-outline" : "exit-outline"}
                    size={18}
                    color={item.type === "IN" ? colors.success : colors.danger}
                  />
                </View>
                <View style={styles.listCopy}>
                  <Text style={styles.listTitle}>
                    {item.type === "IN" ? "Giriş" : "Çıkış"} · {item.gate}
                  </Text>
                  <Text style={styles.listMeta}>Onaylandı</Text>
                </View>
                <Text style={styles.listTime}>{item.time}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.accent,
    textTransform: "uppercase",
  },
  greeting: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  date: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  signOut: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutText: { fontSize: 13, fontWeight: "600", color: colors.navy },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  profileMeta: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 16, fontWeight: "700", color: colors.text },
  profileRole: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  profileCode: { marginTop: 2, fontSize: 12, color: colors.navyMuted },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.success },
  primaryAction: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  primaryActionPressed: { backgroundColor: colors.navyDeep },
  primaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCopy: { flex: 1, marginHorizontal: 12 },
  primaryTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  primarySubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  statValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  statValueSm: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  statHint: { marginTop: 4, fontSize: 11, color: colors.textMuted },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemLast: { borderBottomWidth: 0 },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  listCopy: { flex: 1, marginLeft: 10 },
  listTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  listMeta: { marginTop: 2, fontSize: 12, color: colors.success },
  listTime: { fontSize: 13, fontWeight: "700", color: colors.navy },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
});
