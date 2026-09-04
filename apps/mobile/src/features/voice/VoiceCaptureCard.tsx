import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import type { AudioStreamBuffer } from 'expo-audio';
import { File, FileMode, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatDuration } from './voice-duration';
import {
  activeMeterBars,
  METER_BAR_COUNT,
  normalizeMetering,
} from './voice-metering';
import { pcmBufferToDecibels } from './audio-level';

const MAX_RECORDING_DURATION_MS = 120_000;
const RECORDING_PRESET = {
  ...RecordingPresets.HIGH_QUALITY,
  ...(Platform.OS === 'android' ? {} : { isMeteringEnabled: true }),
};
const METER_PULSE_PATTERN = [1, 2, 4, 5, 3, 2, 4, 1];

function createPcmWavBytes(
  chunks: readonly Uint8Array[],
  sampleRate: number,
  channels: number,
): Uint8Array {
  const dataLength = chunks.reduce(
    (total, chunk) => total + chunk.byteLength,
    0,
  );
  const bytes = new Uint8Array(44 + dataLength);
  const view = new DataView(bytes.buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

function writePcmWavFile(
  chunks: readonly Uint8Array[],
  sampleRate: number,
  channels: number,
): string {
  const file = new File(Paths.cache, `cotali-recording-${Date.now()}.wav`);
  file.create({ overwrite: true });
  const handle = file.open(FileMode.WriteOnly);
  try {
    handle.writeBytes(createPcmWavBytes(chunks, sampleRate, channels));
  } finally {
    handle.close();
  }
  return file.uri;
}

export type CapturedRecording = Readonly<{
  durationMs: number;
  uri: string;
}>;

export function VoiceCaptureCard({
  onProcess,
  onRecordingChange,
  processing = false,
}: Readonly<{
  onProcess?: () => void;
  onRecordingChange?: (recording: CapturedRecording | null) => void;
  processing?: boolean;
}>) {
  const recorder = useAudioRecorder(RECORDING_PRESET);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState<CapturedRecording | null>(null);
  const [busy, setBusy] = useState(false);
  const [meterPulse, setMeterPulse] = useState(0);
  const [streamMetering, setStreamMetering] = useState<number | undefined>();
  const [androidRecordingStartedAt, setAndroidRecordingStartedAt] = useState<
    number | null
  >(null);
  const [androidElapsedMillis, setAndroidElapsedMillis] = useState(0);
  const pcmChunksRef = useRef<Uint8Array[]>([]);
  const pcmSampleRateRef = useRef(16_000);
  const pcmChannelsRef = useRef(1);
  const androidRecordingStartedAtRef = useRef<number | null>(null);
  const lastMeterUpdateAtRef = useRef(0);
  const stoppingRef = useRef(false);

  const { stream } = useAudioStream({
    sampleRate: 16_000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer: AudioStreamBuffer) => {
      pcmSampleRateRef.current = buffer.sampleRate;
      pcmChannelsRef.current = buffer.channels;
      pcmChunksRef.current.push(new Uint8Array(buffer.data.slice(0)));
      const now = Date.now();
      if (now - lastMeterUpdateAtRef.current >= 200) {
        lastMeterUpdateAtRef.current = now;
        setStreamMetering(pcmBufferToDecibels(buffer.data, 'int16'));
      }
    },
  });

  useEffect(() => {
    return () => stream.stop();
  }, [stream]);

  useEffect(() => {
    if (androidRecordingStartedAt === null) {
      setAndroidElapsedMillis(0);
      return;
    }

    const updateElapsed = () => {
      setAndroidElapsedMillis(Date.now() - androidRecordingStartedAt);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 250);
    return () => clearInterval(interval);
  }, [androidRecordingStartedAt]);

  useEffect(() => {
    if (!recorderState.isRecording && androidRecordingStartedAt === null) {
      setMeterPulse(0);
      return;
    }

    const interval = setInterval(() => {
      setMeterPulse((current) => (current + 1) % METER_PULSE_PATTERN.length);
    }, 250);

    return () => clearInterval(interval);
  }, [androidRecordingStartedAt, recorderState.isRecording]);

  const isRecording =
    androidRecordingStartedAt !== null || recorderState.isRecording;
  const currentDurationMillis =
    androidRecordingStartedAt !== null
      ? androidElapsedMillis
      : recorderState.durationMillis;

  useEffect(() => {
    if (
      isRecording &&
      currentDurationMillis >= MAX_RECORDING_DURATION_MS &&
      !stoppingRef.current
    ) {
      void finishRecording();
    }
  }, [currentDurationMillis, isRecording]);

  const pulseBars = METER_PULSE_PATTERN[meterPulse] ?? 1;
  const hasLiveAndroidMeter =
    Platform.OS === 'android' &&
    androidRecordingStartedAt !== null &&
    streamMetering !== undefined;
  const meterValue = hasLiveAndroidMeter
    ? streamMetering
    : recorderState.metering;
  const visibleMeterBars = hasLiveAndroidMeter
    ? activeMeterBars(streamMetering)
    : Platform.OS === 'android'
      ? pulseBars
      : activeMeterBars(recorderState.metering);

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
      pcmChunksRef.current = [];
      setStreamMetering(undefined);
      androidRecordingStartedAtRef.current = null;
      setAndroidRecordingStartedAt(null);
      if (Platform.OS === 'android') {
        const startedAt = Date.now();
        androidRecordingStartedAtRef.current = startedAt;
        setAndroidRecordingStartedAt(startedAt);
        const startRecorderFallback = async () => {
          if (androidRecordingStartedAtRef.current !== startedAt) return;
          androidRecordingStartedAtRef.current = null;
          setAndroidRecordingStartedAt(null);
          stream.stop();
          await recorder.prepareToRecordAsync();
          recorder.record();
        };
        try {
          void stream.start().catch(() => {
            void startRecorderFallback();
          });
        } catch {
          await startRecorderFallback();
        }
      } else {
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
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
      const durationMs = currentDurationMillis;
      if (androidRecordingStartedAt !== null) {
        stream.stop();
        androidRecordingStartedAtRef.current = null;
        setAndroidRecordingStartedAt(null);
        setStreamMetering(undefined);

        if (pcmChunksRef.current.length === 0 || durationMs < 1_000) {
          pcmChunksRef.current = [];
          setRecording(null);
          onRecordingChange?.(null);
          await setAudioModeAsync({ allowsRecording: false });
          Alert.alert(
            'Gravação muito curta',
            'Fale por pelo menos um segundo e tente novamente.',
          );
          return;
        }

        const uri = writePcmWavFile(
          pcmChunksRef.current,
          pcmSampleRateRef.current,
          pcmChannelsRef.current,
        );
        pcmChunksRef.current = [];
        const captured = { durationMs, uri };
        setRecording(captured);
        onRecordingChange?.(captured);
        await setAudioModeAsync({ allowsRecording: false });
        return;
      }

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
      if (androidRecordingStartedAt !== null) {
        stream.stop();
        androidRecordingStartedAtRef.current = null;
        setAndroidRecordingStartedAt(null);
        setStreamMetering(undefined);
        pcmChunksRef.current = [];
      } else if (recorderState.isRecording) {
        await recorder.stop();
      }
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
        {isRecording
          ? 'Estou ouvindo…'
          : recording
            ? 'Áudio pronto para processar'
            : 'Conte o serviço uma única vez'}
      </Text>
      <Text style={styles.description}>
        {isRecording
          ? 'Diga cliente, serviços, materiais, preços, pagamento e prazo.'
          : recording
            ? `${formatDuration(recording.durationMs)} gravados. Você poderá revisar tudo antes de salvar.`
            : 'Você terá até 2 minutos e sempre revisará as informações extraídas.'}
      </Text>

      {isRecording && (
        <>
          <View style={styles.timerRow}>
            <View style={styles.recordingDot} />
            <Text style={styles.timer}>
              {formatDuration(currentDurationMillis)} / 02:00
            </Text>
          </View>
          <View
            style={styles.meterRow}
            accessibilityLabel={
              hasLiveAndroidMeter || Platform.OS !== 'android'
                ? normalizeMetering(meterValue) >= 0.2
                  ? 'Microfone captando áudio'
                  : 'Nenhum sinal de áudio detectado'
                : 'Microfone ativo'
            }
          >
            <Text style={styles.meterLabel}>
              {Platform.OS === 'android' && !hasLiveAndroidMeter
                ? 'Microfone ativo'
                : normalizeMetering(meterValue) >= 0.2
                  ? 'Microfone captando'
                  : 'Fale perto do microfone'}
            </Text>
            <View style={styles.meter}>
              {Array.from({ length: METER_BAR_COUNT }, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.meterBar,
                    {
                      height:
                        Platform.OS === 'android' && !hasLiveAndroidMeter
                          ? 8 + Math.min(index, pulseBars - 1) * 4
                          : 8 + index * 4,
                    },
                    index < visibleMeterBars && styles.meterBarActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </>
      )}

      <View style={styles.actions}>
        {isRecording ? (
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
      {recording && !isRecording && (
        <>
          {onProcess && (
            <Pressable
              disabled={busy || processing}
              onPress={onProcess}
              style={styles.processButton}
            >
              <Text style={styles.primaryText}>
                {processing ? 'Processando…' : 'Processar áudio'}
              </Text>
            </Pressable>
          )}
          <Pressable disabled={busy || processing} onPress={cancelRecording}>
            <Text style={styles.removeText}>Remover gravação</Text>
          </Pressable>
        </>
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
  processButton: {
    alignItems: 'center',
    backgroundColor: '#2EAA76',
    borderRadius: 14,
    padding: 15,
  },
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
  meter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    height: 28,
  },
  meterBar: {
    backgroundColor: '#315043',
    borderRadius: 2,
    width: 5,
  },
  meterBarActive: { backgroundColor: '#72D6AA' },
  meterLabel: { color: '#C6D5CC', fontSize: 12, fontWeight: '700' },
  meterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
