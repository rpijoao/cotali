import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from './voice-duration';

const MAX_RECORDING_DURATION_MS = 120_000;

export type CapturedRecording = Readonly<{
  durationMs: number;
  uri: string;
}>;

export function VoiceCaptureCard({
  onRecordingChange,
}: Readonly<{
  onRecordingChange?: (recording: CapturedRecording | null) => void;
}>) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState<CapturedRecording | null>(null);
  const [busy, setBusy] = useState(false);
  const stoppingRef = useRef(false);

  useEffect(() => {
    if (
      recorderState.isRecording &&
      recorderState.durationMillis >= MAX_RECORDING_DURATION_MS &&
      !stoppingRef.current
    ) {
      void finishRecording();
    }
  }, [recorderState.durationMillis, recorderState.isRecording]);

  async function startRecording() {
    setBusy(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microfone necessário',
          'Autorize o acesso ao microfone para criar um orçamento por voz.',
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      setRecording(null);
      onRecordingChange?.(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert(
        'Não foi possível gravar',
        'Confira o microfone e tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function finishRecording() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setBusy(true);
    try {
      const durationMs = recorderState.durationMillis;
      await recorder.stop();
      if (!recorder.uri || durationMs < 1_000) {
        setRecording(null);
        onRecordingChange?.(null);
        Alert.alert(
          'Gravação muito curta',
          'Fale por pelo menos um segundo e tente novamente.',
        );
        return;
      }

      const captured = { durationMs, uri: recorder.uri };
      setRecording(captured);
      onRecordingChange?.(captured);
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      Alert.alert(
        'Não foi possível concluir',
        'A gravação não foi confirmada. Tente novamente.',
      );
    } finally {
      stoppingRef.current = false;
      setBusy(false);
    }
  }

  async function cancelRecording() {
    setBusy(true);
    try {
      if (recorderState.isRecording) await recorder.stop();
      setRecording(null);
      onRecordingChange?.(null);
      await setAudioModeAsync({ allowsRecording: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>ORÇAMENTO POR VOZ</Text>
      <Text style={styles.title}>
        {recorderState.isRecording
          ? 'Estou ouvindo…'
          : recording
            ? 'Áudio pronto para processar'
            : 'Conte o serviço uma única vez'}
      </Text>
      <Text style={styles.description}>
        {recorderState.isRecording
          ? 'Diga cliente, serviços, materiais, preços, pagamento e prazo.'
          : recording
            ? `${formatDuration(recording.durationMs)} gravados. Você poderá revisar tudo antes de salvar.`
            : 'Você terá até 2 minutos e sempre revisará as informações extraídas.'}
      </Text>

      {recorderState.isRecording && (
        <View style={styles.timerRow}>
          <View style={styles.recordingDot} />
          <Text style={styles.timer}>
            {formatDuration(recorderState.durationMillis)} / 02:00
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {recorderState.isRecording ? (
          <>
            <Pressable
              disabled={busy}
              onPress={cancelRecording}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={finishRecording}
              style={styles.stopButton}
            >
              <Text style={styles.primaryText}>Concluir</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            disabled={busy}
            onPress={startRecording}
            style={styles.recordButton}
          >
            <Text style={styles.primaryText}>
              {recording ? 'Gravar novamente' : 'Começar a falar'}
            </Text>
          </Pressable>
        )}
      </View>
      {recording && !recorderState.isRecording && (
        <Pressable disabled={busy} onPress={cancelRecording}>
          <Text style={styles.removeText}>Remover gravação</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  card: {
    backgroundColor: '#102A20',
    borderRadius: 22,
    gap: 13,
    padding: 19,
  },
  description: { color: '#C6D5CC', fontSize: 14, lineHeight: 21 },
  eyebrow: {
    color: '#72D6AA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  recordButton: {
    alignItems: 'center',
    backgroundColor: '#16875D',
    borderRadius: 14,
    flex: 1,
    padding: 15,
  },
  recordingDot: {
    backgroundColor: '#FF6B62',
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  removeText: {
    color: '#AFC6B9',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#6F8A7B',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 15,
  },
  secondaryText: { color: '#E6EFEA', fontSize: 15, fontWeight: '800' },
  stopButton: {
    alignItems: 'center',
    backgroundColor: '#C84B44',
    borderRadius: 14,
    flex: 1,
    padding: 15,
  },
  timer: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  timerRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
});
