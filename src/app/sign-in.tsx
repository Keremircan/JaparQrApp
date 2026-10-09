import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useSession } from '@/context/session';
import { colors, radius, spacing } from '@/constants/theme';

// Bilgisayarınızın yerel IP adresi
const LOGIN_URL = "http://192.168.1.110:3000/api/login";

export default function SignInScreen() {
  const { signIn } = useSession();
  const insets = useSafeAreaInsets();
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!employeeCode.trim() || !password.trim()) {
      Alert.alert('Eksik bilgi', 'Sicil numarası ve şifre gereklidir.');
      return;
    }

    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // 1. Gerçek Backend İsteği
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: employeeCode.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {

        // 2. UI yumuşatma beklemesi
        await new Promise((resolve) => setTimeout(resolve, 450));

        // 3. Cursor'un Session Context'ini backend'den dönen gerçek kullanıcıyla güncelle
        signIn({
          name: data.user.fullName || 'Personel',
          employeeCode: data.user.employeeCode,
          department:data.user.department,
          job: data.user.job,
          shift: data.user.shift,
          shift_type: data.user.shift_type
        });

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Giriş Başarısız', data.message || 'Giriş yapılamadı.');
      }
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Bağlantı Hatası', 'Sunucuya erişilemedi. Wi-Fi bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brandBlock}>
          <View style={styles.mark}>
            <Text style={styles.markText}>J</Text>
          </View>
          <Text style={styles.brand}>JAPAR</Text>
          <Text style={styles.brandSub}>Personel devam takip sistemi</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personel girişi</Text>
          <Text style={styles.cardHint}>
            Mesai kayıtları için sicil numaranız ve şifrenizle oturum açın.
          </Text>

          <Text style={styles.label}>Sicil numarası</Text>
          <TextInput
            style={styles.input}
            placeholder="EMP-10293"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            value={employeeCode}
            onChangeText={setEmployeeCode}
            returnKeyType="next"
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={() => void handleLogin()}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={() => void handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Giriş yap</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>Japar Fabrika · Güvenli yoklama altyapısı</Text>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    color: colors.navy,
  },
  brandSub: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardHint: {
    marginTop: 6,
    marginBottom: spacing.lg,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navyMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFBFC',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonPressed: {
    backgroundColor: colors.navyDeep,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.textMuted,
  },
});
