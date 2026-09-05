import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  EMPTY_PROFESSIONAL_PROFILE,
  type LocalProfessionalProfile,
} from './profile-state';
import {
  loadProfessionalProfile,
  saveProfessionalProfile,
} from './profile-storage';

export function ProfileScreen({ onBack }: Readonly<{ onBack: () => void }>) {
  const [profile, setProfile] = useState<LocalProfessionalProfile>(
    EMPTY_PROFESSIONAL_PROFILE,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadProfessionalProfile()
      .then((savedProfile) => {
        if (savedProfile) setProfile(savedProfile);
      })
      .catch(() => {
        setError('Não foi possível carregar o perfil neste aparelho.');
      })
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof LocalProfessionalProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    if (error) setError(null);
  }

  async function save() {
    if (!profile.name.trim()) {
      setError('Informe seu nome profissional para continuar.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveProfessionalProfile({
        ...profile,
        name: profile.name.trim(),
        businessName: profile.businessName.trim(),
        phone: profile.phone.trim(),
        document: profile.document.trim(),
        address: profile.address.trim(),
      });
      onBack();
    } catch {
      setError('Não foi possível salvar o perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#1846E1" size="large" />
        <Text style={styles.loadingText}>Carregando perfil…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Voltar para início</Text>
        </Pressable>

        <Text style={styles.eyebrow}>SEU PERFIL</Text>
        <Text style={styles.title}>Dados profissionais</Text>
        <Text style={styles.subtitle}>
          Essas informações serão usadas na sua proposta e no recibo.
        </Text>

        <View style={styles.card}>
          <Field
            autoCapitalize="words"
            label="Nome profissional"
            onChangeText={(value) => update('name', value)}
            placeholder="Como o cliente deve chamar você?"
            value={profile.name}
          />
          <Field
            autoCapitalize="words"
            label="Nome comercial (opcional)"
            onChangeText={(value) => update('businessName', value)}
            placeholder="Ex.: Elétrica João"
            value={profile.businessName}
          />
          <Field
            keyboardType="phone-pad"
            label="Telefone / WhatsApp (opcional)"
            onChangeText={(value) => update('phone', value)}
            placeholder="(11) 99999-9999"
            value={profile.phone}
          />
          <Field
            autoCapitalize="characters"
            label="CPF ou CNPJ (opcional)"
            onChangeText={(value) => update('document', value)}
            placeholder="Informe quando quiser"
            value={profile.document}
          />
          <Field
            autoCapitalize="words"
            label="Endereço (opcional)"
            multiline
            onChangeText={(value) => update('address', value)}
            placeholder="Rua, número, cidade"
            value={profile.address}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          disabled={saving}
          onPress={save}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar perfil</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...props
}: Readonly<{
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'phone-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#92A098"
        style={[styles.input, props.multiline && styles.multilineInput]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#F4F7F3', flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F4F7F3',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: '#52635B', fontSize: 15, marginTop: 14 },
  backLink: { alignSelf: 'flex-start', marginBottom: 28 },
  backLinkText: { color: '#1846E1', fontSize: 14, fontWeight: '700' },
  eyebrow: {
    color: '#648075',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  title: {
    color: '#293D35',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 8,
  },
  subtitle: { color: '#6F7E76', fontSize: 15, lineHeight: 21, marginTop: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E8E2',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 22,
    padding: 18,
  },
  field: { marginBottom: 17 },
  fieldLabel: {
    color: '#365247',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    borderColor: '#D4E0D9',
    borderRadius: 12,
    borderWidth: 1,
    color: '#293D35',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: { minHeight: 82, textAlignVertical: 'top' },
  errorText: { color: '#A33B34', fontSize: 14, lineHeight: 20, marginTop: 14 },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1846E1',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 20,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
