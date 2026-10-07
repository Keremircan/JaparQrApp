import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.72; // Ekran boyutuna göre dinamik vizör genişliği

// Bilgisayarınızın yerel ağ IP'si (Terminalde ipconfig ile kontrol edin)
const BACKEND_URL = "http://192.168.1.110:3000/api/verify"; 

// Test amaçlı sabit sicil no
const CURRENT_EMPLOYEE_ID = "EMP-10293"; 

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hardwareId, setHardwareId] = useState('');
  const [scanType, setScanType] = useState('IN'); // 'IN' (Giriş) veya 'OUT' (Çıkış)

  // Çoklu okumayı (race condition) anında kilitleyen referans:
  const isScanningLocked = useRef(false);

  useEffect(() => {
    async function loadUser() {
      const savedId = await SecureStore.getItemAsync('current_employee_id');
      if (savedId) {
        setEmployeeId(savedId); // Artık login olan personelin sicil numarası gidecek!
      }
    }
    loadUser();
  }, []);

  // Cihaz Kimliğini (Hardware ID) Al veya Üret
  useEffect(() => {
    async function initHardwareId() {
      try {
        let id = await SecureStore.getItemAsync('device_hardware_id');
        if (!id) {
          id = 'DEV-' + Math.random().toString(36).substring(2, 12) + '-' + Date.now().toString(36);
          await SecureStore.setItemAsync('device_hardware_id', id);
        }
        setHardwareId(id);
      } catch (e) {
        console.error('Cihaz kimliği alınamadı:', e);
      }
    }
    initHardwareId();
  }, []);

  // İzin Kontrolleri
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
        <Text style={styles.permissionText}>Giriş yapabilmek için kamera izni gerekiyor.</Text>
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

  // Karekod Algılandığında Tetiklenen Fonksiyon
  const handleBarcodeScanned = async ({ data }) => {
    if (isScanningLocked.current || scanned || loading) return;

    isScanningLocked.current = true;
    setScanned(true);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: data,
          employeeId: CURRENT_EMPLOYEE_ID,
          hardwareId: hardwareId,
          type: scanType // Seçili olan IN veya OUT tipini yollar
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("İşlem Başarılı", `${result.message}\nKapı: ${result.gate}`, [
          { text: "Tamam", onPress: () => resetScanner() }
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("İşlem Reddedildi", result.message || "Kod doğrulanamadı.", [
          { text: "Tekrar Dene", onPress: () => resetScanner() }
        ]);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Bağlantı Hatası", "Sunucuya erişilemedi. Wi-Fi bağlantınızı kontrol edin.", [
        { text: "Tekrar Dene", onPress: () => resetScanner() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Tam Ekran Kamera Katmanı */}
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* 2. Kamera Üstü Modern Vizör ve Arayüz */}
      <SafeAreaView style={styles.overlay}>
        {/* Giriş / Çıkış Seçim Sekmesi */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, scanType === 'IN' && styles.typeButtonActiveIn]}
            onPress={() => setScanType('IN')}
          >
            <Text style={[styles.typeText, scanType === 'IN' && styles.typeTextActive]}>
              GİRİŞ (IN)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, scanType === 'OUT' && styles.typeButtonActiveOut]}
            onPress={() => setScanType('OUT')}
          >
            <Text style={[styles.typeText, scanType === 'OUT' && styles.typeTextActive]}>
              ÇIKIŞ (OUT)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hedef Vizör ve Köşeler */}
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

        {/* Bilgilendirme Metni */}
        <Text style={styles.hintText}>
          {loading ? "Giriş doğrulanıyor..." : "Karekod ekrandaki çerçevenin içine hizalayın"}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#00C853',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Kamera Üzeri Arayüz
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 30,
  },

  // Giriş / Çıkış Seçici
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    borderRadius: 30,
    padding: 4,
    marginTop: 10,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderRadius: 24,
  },
  typeButtonActiveIn: {
    backgroundColor: '#00C853',
  },
  typeButtonActiveOut: {
    backgroundColor: '#D50000',
  },
  typeText: {
    color: '#AAA',
    fontWeight: 'bold',
    fontSize: 14,
  },
  typeTextActive: {
    color: '#FFF',
  },

  // Vizör Çerçevesi
  scannerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Köşe Çizgileri
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#00E676',
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

  // Yüklenme Kutusu ve İpucu
  loadingBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 20,
  },
});