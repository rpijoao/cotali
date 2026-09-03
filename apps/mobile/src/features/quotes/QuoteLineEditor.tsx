import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatBrlInput } from './money';

export type EditableQuoteLine = Readonly<{
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}>;

type Props = Readonly<{
  index: number;
  kind: 'material' | 'service';
  line: EditableQuoteLine;
  onChange: (line: EditableQuoteLine) => void;
  onRemove: () => void;
}>;

export function QuoteLineEditor({
  index,
  kind,
  line,
  onChange,
  onRemove,
}: Props) {
  const title = kind === 'service' ? 'Serviço' : 'Material';

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>{`${title} ${index + 1}`}</Text>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={onRemove}>
          <Text style={styles.remove}>Remover</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel={`Descrição do ${title.toLowerCase()} ${index + 1}`}
        onChangeText={(description) => onChange({ ...line, description })}
        placeholder={
          kind === 'service' ? 'Ex.: Troca de tomada' : 'Ex.: Tomada 20 A'
        }
        placeholderTextColor="#829087"
        style={styles.input}
        value={line.description}
      />
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={`Quantidade do ${title.toLowerCase()} ${index + 1}`}
          keyboardType="decimal-pad"
          onChangeText={(quantity) =>
            onChange({ ...line, quantity: quantity.replace(',', '.') })
          }
          placeholder="Qtd."
          placeholderTextColor="#829087"
          style={[styles.input, styles.quantity]}
          value={line.quantity}
        />
        <TextInput
          accessibilityLabel={`Unidade do ${title.toLowerCase()} ${index + 1}`}
          autoCapitalize="none"
          onChangeText={(unit) => onChange({ ...line, unit })}
          placeholder="Unidade"
          placeholderTextColor="#829087"
          style={[styles.input, styles.unit]}
          value={line.unit}
        />
        <TextInput
          accessibilityLabel={`Preço unitário do ${title.toLowerCase()} ${index + 1}`}
          keyboardType="number-pad"
          onChangeText={(unitPrice) => onChange({ ...line, unitPrice })}
          placeholder="R$ 0,00"
          placeholderTextColor="#829087"
          style={[styles.input, styles.price]}
          value={line.unitPrice === '' ? '' : formatBrlInput(line.unitPrice)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F7F9F6',
    borderColor: '#DCE5DF',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD8D0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#102A20',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  price: { flex: 1.8 },
  quantity: { flex: 0.8 },
  remove: { color: '#A33C32', fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  title: { color: '#294A3B', fontSize: 14, fontWeight: '700' },
  unit: { flex: 1 },
});
