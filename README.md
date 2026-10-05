# 💬 ChatFirebase — Chat individual e em grupo com Firebase e Push

Aplicativo de chat em **React Native + Expo + TypeScript** com conversas individuais e em grupo, mensagens em tempo real no **Firebase Realtime Database**, perfis/grupos/configurações no **Cloud Firestore**, fotos no **Firebase Storage** e **push notifications** enviadas por uma **API própria** (Node.js + Express) usando **Firebase Cloud Messaging**.

## Integrantes

- RM00000 — Nome Completo
- RM00000 — Nome Completo

> ⚠️ Preencha nome completo e RM de todos os integrantes (máx. 5).

---

## 🧰 Tecnologias

| Camada | Tecnologia |
|---|---|
| App | React Native 0.86, **Expo SDK 57**, TypeScript (strict, sem `any`) |
| Navegação | React Navigation 7 (native-stack) |
| Autenticação | Firebase Authentication (somente e-mail/senha) |
| Mensagens | Firebase Realtime Database |
| Perfis, grupos, tokens | Cloud Firestore |
| Fotos | Firebase Storage |
| Push | Firebase Cloud Messaging (Android) + Expo Push Service (iOS/APNs), via `expo-notifications` |
| API | Node.js 20+, Express 5, Firebase Admin SDK, TypeScript |

---

## 🔥 Responsabilidade de cada serviço

| Serviço | Uso |
|---|---|
| **Authentication** | cadastro, login, persistência/recuperação da sessão (AsyncStorage), `uid`, logout. A API rejeita tokens que não sejam `password`. |
| **Realtime Database** | `messages/{conversationId}/{messageId}` — todas as mensagens; listeners `onChildAdded` em tempo real. `conversationMembers/{conversationId}/{uid}` — espelho dos participantes usado pelas regras de segurança. |
| **Cloud Firestore** | `users/{uid}` (perfil completo, privado), `publicProfiles/{uid}` (nome + foto para busca), `users/{uid}/devices/{deviceId}` (tokens), `groups/{groupId}` (metadados, integrantes, `memberLimit`, `notificationPolicy`), `directConversations/{id}`, `notificationDispatches/{id}` (idempotência do push). |
| **Cloud Messaging** | entrega das notificações no Android (app em primeiro plano, segundo plano ou fechado), com `conversationId` e `conversationType` no payload. |
| **Storage** | fotos de perfil (`images/users/{uid}/profile.jpg`) e de grupo (`images/groups/{groupId}/photo.jpg`). Apenas a URL final é salva no Firestore — nunca Base64. |

---

## 📁 Estrutura

```text
CP5/
  app/                          # Aplicativo Expo
    firebaseConfig.json         # config do SDK cliente (sem segredos)
    firestore.rules             # regras do Firestore
    database.rules.json         # regras do Realtime Database
    storage.rules               # regras do Storage
    firebase.json               # deploy das regras via Firebase CLI
    .env.example
    src/
      App.tsx
      components/   Avatar, Button, ChatInput, ChatMessage, ConversationItem, EmptyState,
                    ErrorMessage, GroupMemberItem, Loading, PhotoPicker, TextField
      contexts/     AuthContext.tsx
      hooks/        useAuth, useChat, useGroups, useConversations, useNotifications,
                    usePublicProfiles, useConnectivity
      navigation/   RootNavigator.tsx
      screens/      Login, Register, Conversations, Users, GroupForm, GroupMembers, Chat, Profile
      services/     firebase, authService, userService, groupService, chatService,
                    notificationService, storageService, apiService
      types/        user, chat, group, notification, navigation
      utils/        conversationId, groupValidation, errors
  server/                       # API online
    .env.example
    render.yaml
    src/
      app.ts
      middleware/authenticate.ts
      routes/       notifications.ts, conversations.ts, profiles.ts
      services/     firebaseAdmin.ts, notificationSender.ts, recipientResolver.ts, conversationService.ts
```

---

## ⚙️ Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → habilite **somente E-mail/senha**.
3. Crie o **Cloud Firestore**, o **Realtime Database** e o **Storage**.
4. Registre um app **Web** e copie a configuração para `app/firebaseConfig.json` (inclua `databaseURL`).
5. Registre um app **Android** com o pacote `br.com.fiap.chatfirebase` e baixe o `google-services.json` para `app/` (necessário para o FCM).
6. Publique as regras:

```bash
npm install -g firebase-tools
```
```bash
cd app && firebase login && firebase use <project-id> && firebase deploy --only firestore:rules,database,storage
```

### Credenciais administrativas (API)

Em *Configurações do projeto → Contas de serviço → Gerar nova chave privada*. **Não versione o arquivo.** Copie `project_id`, `client_email` e `private_key` diretamente para as variáveis secretas da hospedagem.

---

## 📱 Executando o app

```bash
cd app
npm install
cp .env.example .env    # preencha EXPO_PUBLIC_API_URL e EXPO_PUBLIC_EAS_PROJECT_ID
```

O push não funciona no Expo Go; use **development build**:

```bash
npx eas-cli build --profile development --platform android
```
```bash
npx expo start --dev-client
```

(ou `npx expo run:android` / `npx expo run:ios` com Android Studio/Xcode instalados).

### Notificações — Android
- `google-services.json` em `app/` (referenciado em `app.json`).
- O app registra o **token nativo FCM** (`getDevicePushTokenAsync`) em `users/{uid}/devices`.
- Canal `messages` com importância alta; permissão `POST_NOTIFICATIONS` (Android 13+).

### Notificações — iOS
- Requer conta Apple Developer e dispositivo físico.
- `npx eas-cli credentials` → configure a **APNs Key** no EAS.
- O app registra um **Expo Push Token** (necessita `EXPO_PUBLIC_EAS_PROJECT_ID`, obtido com `npx eas-cli init`); a API envia pelo Expo Push Service, que entrega via APNs.

---

## 🌐 API online

- **Tecnologia:** Node.js + Express 5 + Firebase Admin SDK (TypeScript).
- **URL pública:** `https://SUA-API.onrender.com` ← *preencher após o deploy*
- **Hospedagem sugerida:** Render (arquivo `server/render.yaml`). Usar plano que não hiberne durante a correção.

### Variáveis (configurar apenas na hospedagem)

`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, `EXPO_ACCESS_TOKEN` (opcional), `PORT`.

### Executar localmente (desenvolvimento)

```bash
cd server && npm install && cp .env.example .env && npm run dev
```

### Publicar no Render
1. New → Web Service → conecte o repositório; *Root Directory* `server`.
2. Build: `npm ci --include=dev && npm run build` — Start: `npm start`.
3. Adicione as variáveis secretas acima. Health check path: `/health`.

### Endpoints

Todos (exceto `/health`) exigem `Authorization: Bearer <Firebase ID Token>`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Disponibilidade da API (`{"status":"ok"}`) |
| POST | `/notifications/messages` | `{ conversationId, messageId }` — valida a mensagem e envia o push |
| POST | `/conversations/direct` | `{ otherUserId }` — cria/localiza a conversa individual |
| POST | `/groups/:groupId/sync` | espelha integrantes do grupo no Realtime Database |
| GET | `/profiles/:uid` | perfil completo, somente se houver conversa/grupo em comum |

Verificar disponibilidade:

```bash
curl https://SUA-API.onrender.com/health
```

### Fluxo do push

1. App grava a mensagem no RTDB (`messages/{conversationId}/{messageId}`).
2. App chama `POST /notifications/messages` com o ID Token.
3. API valida o token (Admin SDK, com verificação de revogação).
4. API lê a mensagem no RTDB e confirma `senderId === uid`.
5. API cria `notificationDispatches/{conversationId}__{messageId}` com `create()` — se já existir, responde `duplicate: true` (**proteção contra chamadas duplicadas**).
6. API lê participantes e política no Firestore e **calcula os destinatários no servidor**.
7. Envia via FCM (`sendEachForMulticast`) e/ou Expo Push; tokens inválidos (`registration-token-not-registered`, `DeviceNotRegistered`) são **removidos**.
8. O texto do push não inclui o conteúdo da mensagem. Payload: `{ conversationId, conversationType }`. Ao tocar, o app abre a conversa.

---

## 🔔 Política de notificações

| Política | Comportamento em grupos |
|---|---|
| `all_group_messages` | todos os integrantes, exceto o remetente |
| `mentioned_members` | apenas integrantes mencionados (`@Nome` no texto) ou selecionados pelo botão **@** |
| `direct_messages_only` | mensagens do grupo não geram push; só conversas individuais |
| `disabled` | nenhuma mensagem do grupo gera push |

Conversas individuais sempre notificam o outro participante. Em todos os casos o remetente é excluído e só participantes atuais são considerados. A política é definida pelo proprietário na criação/edição do grupo.

---

## 👥 Limite de integrantes e concorrência

- `memberLimit` é definido na criação, validado como inteiro (2–256) e editável pelo proprietário; não pode ficar abaixo do número atual de integrantes.
- A interface mostra `N de LIMITE` e as vagas restantes ("Grupo sem vagas" quando cheio).
- **Proteção real:** toda alteração de integrantes é feita com `runTransaction` no Firestore, e as **regras** (`firestore.rules → validGroup`) exigem em *toda* escrita que `memberIds.size() <= memberLimit`. Como o Firestore serializa escritas concorrentes no mesmo documento (a transação que perde é reexecutada sobre o estado novo) e a regra é avaliada sobre o documento resultante, é impossível persistir um grupo acima do limite, mesmo com requisições simultâneas ou com um cliente modificado.

---

## 🔒 Segurança

- **Firestore** (`app/firestore.rules`): perfil completo só para o próprio usuário; `publicProfiles` só nome/foto; tokens (`devices`) privados ao dono; grupo lido só por integrantes e gerenciado só pelo dono; integrante só pode remover a si mesmo; `directConversations` e `notificationDispatches` só pela API.
- **Realtime Database** (`app/database.rules.json`): leitura/escrita de mensagens apenas por quem está em `conversationMembers/{id}`; `senderId === auth.uid`; mensagens imutáveis; tamanho do texto validado; `conversationMembers` escrito somente pela API. Usuários removidos perdem acesso imediatamente após o `sync`.
- **Storage** (`app/storage.rules`): só imagens < 5 MB; foto do grupo só pelo dono (consulta cross-service ao Firestore).
- **Decisão documentada:** como os dados estão divididos entre Firestore e RTDB, as validações que dependem dos dois (criação de conversa individual, espelho de integrantes, perfil de terceiros e push) são executadas pela **API**.
- `firebaseConfig.json` contém apenas a configuração do SDK cliente. Nenhuma credencial administrativa está no app ou no repositório.

---

## 📸 Prints

> Adicione aqui os prints das telas (Login, Cadastro, Conversas, Usuários, Grupo, Chat, Perfil) e a evidência da notificação recebida.

---

## ✅ Checklist

- [x] Expo SDK 57 + TypeScript sem `any`
- [x] Login/cadastro somente e-mail e senha, com nome, celular, nascimento e foto
- [x] Sessão persistida e logout (remove token do dispositivo, desmonta listeners)
- [x] Conversa individual com id determinístico por par
- [x] Grupos com dono, foto, integrantes, limite e política
- [x] Mensagens no RTDB em tempo real; metadados no Firestore
- [x] Push pela API com FCM, idempotência e remoção de tokens inválidos
- [x] Regras de Firestore, RTDB e Storage versionadas
- [ ] Preencher integrantes, URL da API e prints
#   f o r d - n e x u s  
 #   f o r d - n e x u s  
 