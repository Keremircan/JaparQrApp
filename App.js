import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';

// Bilgisayarınızın yerel ağ IP'si (Terminalde ipconfig ile öğrenebilirsiniz)
const BACKEND_URL = "http://192.168.1.3:3000/api/verify"; 

// Test amaçlı sabit sicil no (Gerçekte login ekranından gelir)
const CURRENT_EMPLOYEE_ID = "EMP-10293"; 

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hardwareId, setHardwareId] = useState('');

  // Cihaz Kimliğini (Hardware ID / UUID) Al veya Kalıcı Olarak Üret
  useEffect(() => {
    async function initHardwareId() {
      try {
        let id = await SecureStore.getItemAsync('device_hardware_id');
        console.log("id: "+id);

        if (!id) {
          // İlk kurulumda cihaza özel eşsiz bir kimlik tanımla
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
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

  // Karekod Algılandığında Tetiklenen Fonksiyon
  const handleBarcodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    console.log(data);
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
          type: 'IN' // veya 'OUT'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("İşlem Başarılı", `${result.message}\nKapı: ${result.gate}`, [
          { text: "Tamam", onPress: () => setScanned(false) }
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Giriş Reddedildi", result.message || "Kod doğrulanamadı.", [
          { text: "Tekrar Dene", onPress: () => setScanned(false) }
        ]);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Bağlantı Hatası", "Sunucuya erişilemedi. Wi-Fi bağlantınızı kontrol edin.", [
        { text: "Tekrar Dene", onPress: () => setScanned(false) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Vizör / Nişangah Alanı */}
      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer} />
        <View style={styles.middleContainer}>
          <View style={styles.unfocusedContainer} />
          <View style={styles.targetFrame}>
            {loading && <ActivityIndicator size="large" color="#22c55e" />}
          </View>
          <View style={styles.unfocusedContainer} />
        </View>
        <View style={styles.unfocusedContainer}>
          <Text style={styles.hintText}>
            {loading ? "Giriş doğrulanıyor..." : "Karekod ekrandaki çerçevenin içine hizalayın"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { fontSize: 16, color: '#334155', textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  middleContainer: { flexDirection: 'row', height: 260 },
  targetFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  hintText: { color: '#ffffff', fontSize: 14, textAlign: 'center', marginTop: 16 }
});