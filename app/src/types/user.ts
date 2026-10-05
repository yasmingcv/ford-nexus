export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

/** Dados públicos (nome e foto) visíveis a usuários autenticados para busca e listagem. */
export type PublicProfile = {
  uid: string;
  name: string;
  photoUrl: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};

export type DeviceRegistration = {
  token: string;
  tokenType: 'fcm' | 'expo';
  platform: 'android' | 'ios';
  enabled: boolean;
  updatedAt: number;
};
