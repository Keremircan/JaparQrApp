import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSession } from "@/context/session";

const { width } = Dimensions.get("window");
const SCAN_AREA_SIZE = width * 0.72;
const BACKEND_URL = "http://192.168.1.110:3000/api/verify";

export default function ScannerScreen() {
  const { employee } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hardwareId, setHardwareId] = useState("");
  const scanType: "IN" | "OUT" = employee?.lastType === "IN" ? "OUT" : "IN";
  const isScanningLocked = useRef(false);
  const employeeId = employee?.employeeCode ?? "EMP-00000";

  const router = useRouter();

  useEffect(() => {
    async function initHardwareId() {
      try {
        let id = await SecureStore.getItemAsync("device_hardware_id");
        if (!id) {
          id =
            "DEV-" +
            Math.random().toString(36).substring(2, 12) +
            "-" +
            Date.now().toString(36);
          await SecureStore.setItemAsync("device_hardware_id", id);
        }
        setHardwareId(id);
      } catch (e) {
        console.error("Cihaz kimliği alınamadı:", e);
      }
    }
    void initHardwareId();
  }, []);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Giriş yapabilmek için kamera izni gerekiyor.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const resetScanner = () => {
    setScanned(false);
    setTimeout(() => {
      isScanningLocked.current = false;
    }, 1500);
  };

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (isScanningLocked.current || scanned || loading) return;

    isScanningLocked.current = true;
    setScanned(true);
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrData: data,
          employeeId,
          hardwareId,
          type: scanType,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );

        Alert.alert(
          "İşlem Başarılı",
          `${result.message}\nKapı: ${result.gate}`,
          [
            {
              text: "Tamam",
              onPress: () => {
                resetScanner();
                router.replace("/(tabs)");
              },
            },
          ],
        );
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "İşlem Reddedildi",
          result.message || "Kod doğrulanamadı.",
          [{ text: "Tekrar Dene", onPress: () => resetScanner() }],
        );
      }
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Bağlantı Hatası",
        "Sunucuya erişilemedi. Wi-Fi bağlantınızı kontrol edin.",
        [{ text: "Tekrar Dene", onPress: () => resetScanner() }],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <View
          style={[
            styles.statusBanner,
            scanType === "IN" ? styles.bannerIn : styles.bannerOut,
          ]}
        >
          <View style={styles.bannerIndicator} />
          <Text style={styles.bannerText}>
            {scanType === "IN" ? "GİRİŞ İŞLEMİ" : "ÇIKIŞ İŞLEMİ"}
          </Text>
        </View>

        <View style={styles.scannerWrapper}>
          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#00E676" />
                <Text style={styles.loadingText}>Doğrulanıyor...</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.hintText}>
          {loading
            ? "Giriş doğrulanıyor..."
            : "Karekod ekrandaki çerçevenin içine hizalayın"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  btn: {
    backgroundColor: "#00C853",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 30,
    paddingBottom: 30,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1.5,
    marginBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)", // Kamera üzerinde net okunması için yarı saydam arka plan
  },
  bannerIn: {
    borderColor: "#22C55E", // Yeşil tonu
  },
  bannerOut: {
    borderColor: "#EF4444", // Kırmızı tonu
  },
  bannerIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    backgroundColor: "#FFFFFF",
  },
  bannerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  scannerWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  targetFrame: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    backgroundColor: "transparent",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#00E676",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  loadingBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
  },
  hintText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 20,
  },
});
