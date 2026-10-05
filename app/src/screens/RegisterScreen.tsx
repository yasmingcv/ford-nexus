import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { PhotoPicker } from '../components/PhotoPicker';
import { TextField } from '../components/TextField';
import { colors } from '../components/theme';
import { useAuth } from '../hooks/useAuth';
import { friendlyError } from '../utils/errors';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => {
    if (name.trim().length < 2) return 'Informe seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Informe um e-mail válido.';
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (password !== confirmPassword) return 'As senhas não conferem.';
    if (phoneNumber.replace(/\D/g, '').length < 10) return 'Informe um celular válido com DDD.';
    if (!birthDate) return 'Informe a data de nascimento.';
    return null;
  }, [name, email, password, confirmPassword, phoneNumber, birthDate]);

  const onDateChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (date) setBirthDate(date);
  }, []);

  const handleRegister = useCallback(async () => {
    if (validationError || !birthDate) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({ name, email, password, phoneNumber, birthDate: toIsoDate(birthDate), photoUri });
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível criar a conta.'));
      setLoading(false);
    }
  }, [validationError, birthDate, register, name, email, password, phoneNumber, photoUri]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <PhotoPicker uri={photoUri} name={name} onPick={setPhotoUri} />
        <TextField label="Nome" value={name} onChangeText={setName} autoComplete="name" />
        <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
        <TextField label="Confirmar senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <TextField
          label="Celular"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholder="(11) 91234-5678"
        />
        <Text style={styles.label}>Data de nascimento</Text>
        <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={{ color: birthDate ? colors.text : colors.muted }}>
            {birthDate ? birthDate.toLocaleDateString('pt-BR') : 'Selecionar data'}
          </Text>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={birthDate ?? new Date(2000, 0, 1)}
            mode="date"
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        ) : null}
        <ErrorMessage message={error} />
        <Button title="Criar conta" onPress={handleRegister} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, color: colors.muted, marginTop: 5, marginBottom: 4 },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    marginBottom: 5,
  },
});
