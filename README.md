# ChatFirebase

App de chat feito em React Native com Expo para o CP5. Tem conversa individual, grupos e notificação push enviada por uma API nossa.

## Integrantes

Nome - RM 
Ana Clara Melo - RM 559021
David Murillo de Oliveira Soares - RM 559078
Lucas Serrano - RM555170
Yasmin Gonçalves Coelho - RM 559147

## API

URL: https://ford-nexus.onrender.com/

Pra testar se está no ar, abra https://ford-nexus.onrender.com/health no navegador. Tem que aparecer `{"status":"ok", ...}`.
Obs: estamos no plano free do Render, então se a API ficar parada um tempo a primeira requisição demora uns 30-50 segundos pra responder. Depois volta ao normal.

## Prints

| Login | Cadastro | Conversas |
|---|---|---|
| ![](docs/prints/01-login.png) | ![](docs/prints/02-cadastro.png) | ![](docs/prints/03-conversas.png) |

| Chat individual | Chat em grupo | Menção |
|---|---|---|
| ![](docs/prints/04-chat-individual.png) | ![](docs/prints/05-chat-grupo.png) | ![](docs/prints/06-mencao.png) |

| Criar/editar grupo | Integrantes | Grupo cheio |
|---|---|---|
| ![](docs/prints/07-grupo-form.png) | ![](docs/prints/08-integrantes.png) | ![](docs/prints/09-limite.png) |

| Perfil | Erro | Health check |
|---|---|---|
| ![](docs/prints/10-perfil.png) | ![](docs/prints/11-erro.png) | ![](docs/prints/12-health.png) |

Notificações recebidas:

| App fechado | App em segundo plano | Só o mencionado recebeu |
|---|---|---|
| ![](docs/prints/13-push-fechado.png) | ![](docs/prints/14-push-background.png) | ![](docs/prints/15-push-mencao.png) |

## Tecnologias

- React Native 0.86 com Expo SDK 57
- TypeScript (strict, sem `any`)
- React Navigation 7
- Firebase Authentication (só e-mail e senha)
- Firebase Realtime Database
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Messaging + expo-notifications
- API: Node 20, Express 5 e Firebase Admin SDK, hospedada no Render

Não usamos Cloud Functions, todo push sai da nossa API.

## Onde fica cada coisa no Firebase

A gente dividiu assim:

**Realtime Database** - as mensagens, em `messages/{conversationId}/{messageId}`. Escolhemos o RTDB pra isso porque ele é mais rápido pra esse tipo de coisa que chega o tempo todo, e o app escuta com `onChildAdded`. Também fica lá o `conversationMembers/{conversationId}/{uid}`, que as regras usam pra saber quem pode ler cada conversa.

**Firestore** - o resto:
- `users/{uid}` - perfil completo (nome, celular, nascimento, foto). Só o dono lê.
- `publicProfiles/{uid}` - só nome e foto, pra aparecer na lista de usuários sem expor o celular de ninguém.
- `users/{uid}/devices/{deviceId}` - tokens de push.
- `groups/{groupId}` - dados do grupo, integrantes, `memberLimit` e `notificationPolicy`.
- `directConversations/{id}` - conversas individuais.
- `notificationDispatches/{id}` - registro dos pushes já enviados (pra não repetir).

**Authentication** - cadastro, login e sessão salva com AsyncStorage.

**Storage** - fotos de perfil (`images/users/{uid}/profile.jpg`) e de grupo (`images/groups/{groupId}/photo.jpg`). No Firestore salvamos só a URL, sem Base64.

**Cloud Messaging** - entrega do push no Android.

## Funcionalidades

- Cadastro com nome, celular, data de nascimento, foto, e-mail e senha
- Conversa individual (o id é gerado a partir dos dois uids, então não duplica, e não dá pra conversar consigo mesmo)
- Grupos com foto, limite de integrantes e política de notificação
- O dono do grupo pode adicionar/remover pessoas e editar as informações. Os outros só podem sair
- Menção com `@Nome` ou pelo botão @ do chat
- Tocar na foto abre o perfil da pessoa ou do grupo
- Aviso quando o celular está sem internet

Quem é removido de um grupo para de ver as mensagens novas, porque a API tira a pessoa do `conversationMembers` e a regra do RTDB bloqueia.

## Limite de integrantes

O limite é definido quando o grupo é criado (entre 2 e 256) e só o dono pode mudar. Não dá pra colocar um limite menor do que a quantidade de pessoas que já estão no grupo.

Na tela aparece quantas vagas restam e "Grupo sem vagas" quando lota, mas só isso não resolve o caso de duas pessoas adicionarem alguém ao mesmo tempo. Por isso:

1. Toda alteração de integrantes é feita com `runTransaction` (em `groupService.ts`). Se duas transações mexem no mesmo grupo ao mesmo tempo, o Firestore refaz a segunda com os dados novos, e aí ela vê que não tem vaga.
2. A regra `validGroup` no `firestore.rules` verifica `memberIds.size() <= memberLimit` em qualquer escrita. Então mesmo que alguém altere o app, o banco não aceita salvar o grupo acima do limite.

## Políticas de notificação

| Política | Comportamento |
|---|---|
| `all_group_messages` | todos do grupo recebem, menos quem enviou |
| `mentioned_members` | só quem foi mencionado |
| `direct_messages_only` | mensagens do grupo não notificam, só as conversas individuais |
| `disabled` | o grupo não gera push |

Nas conversas individuais o outro participante sempre recebe. Quem enviou nunca recebe a própria notificação.

A lista de quem recebe é calculada na API, o app só manda o id da conversa e da mensagem. Fizemos assim pra ninguém conseguir mandar push pra quem quiser alterando o app.

A notificação não mostra o texto da mensagem, e quando a pessoa toca nela o app abre na conversa.

## Como o push funciona

1. O app salva a mensagem no RTDB
2. Chama `POST /notifications/messages` mandando o token do usuário
3. A API valida o token com o Admin SDK (e confere se o login foi por e-mail/senha)
4. Lê a mensagem no RTDB e confere se quem está pedindo é quem enviou
5. Cria o documento `notificationDispatches/{conversa}__{mensagem}`. Se ele já existir, quer dizer que o push já foi enviado, então a API não manda de novo
6. Calcula os destinatários pela política do grupo
7. Envia pelo FCM (Android) ou Expo Push (iOS). Tokens inválidos são apagados

## Rotas da API

Todas menos `/health` precisam do header `Authorization: Bearer <token do Firebase>`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | status da API |
| POST | `/notifications/messages` | envia o push de uma mensagem (`{ conversationId, messageId }`) |
| POST | `/conversations/direct` | cria ou busca a conversa individual (`{ otherUserId }`) |
| POST | `/groups/:groupId/sync` | atualiza os integrantes do grupo no RTDB |
| GET | `/profiles/:uid` | perfil completo, só se vocês tiverem conversa ou grupo em comum |

```bash
curl https://SUA-API.onrender.com/health
```

As variáveis de ambiente (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL` e `EXPO_ACCESS_TOKEN`, que é opcional) ficam só no Render. No repositório tem apenas o `server/.env.example`.

## Segurança

- `app/firestore.rules`: perfil completo só pro próprio usuário, tokens privados, grupo só visível pra quem está nele e editável só pelo dono. `directConversations` e `notificationDispatches` só a API escreve.
- `app/database.rules.json`: só quem está em `conversationMembers` lê e escreve mensagens, o `senderId` tem que ser o próprio usuário, mensagem não pode ser editada depois de enviada e o tamanho do texto é limitado.
- `app/storage.rules`: só imagem, até 5 MB. Foto do grupo só o dono troca.
- Nenhuma regra está aberta.
- O `firebaseConfig.json` tem só a config do SDK do cliente. Credencial de admin fica só no Render.

Algumas validações precisam olhar o Firestore e o RTDB juntos (ex: ver se a pessoa está no grupo antes de liberar as mensagens), e as regras de um banco não leem o outro. Essas ficaram na API.

## Organização do código

```text
ford-nexus/
├── app/
│   ├── firebaseConfig.json
│   ├── firestore.rules
│   ├── database.rules.json
│   ├── storage.rules
│   ├── .env.example
│   └── src/
│       ├── components/   Avatar, Button, ChatInput, ChatMessage, ConversationItem,
│       │                 EmptyState, ErrorMessage, GroupMemberItem, Loading, PhotoPicker, TextField
│       ├── contexts/     AuthContext
│       ├── hooks/        useAuth, useChat, useGroups, useConversations,
│       │                 useNotifications, usePublicProfiles, useConnectivity
│       ├── navigation/   RootNavigator
│       ├── screens/      Login, Register, Conversations, Users, GroupForm,
│       │                 GroupMembers, Chat, Profile
│       ├── services/     firebase, auth, user, group, chat, notification, storage, api
│       ├── types/
│       └── utils/
├── server/
│   ├── .env.example
│   ├── render.yaml
│   └── src/
│       ├── app.ts
│       ├── middleware/   authenticate
│       ├── routes/       notifications, conversations, profiles
│       └── services/     firebaseAdmin, notificationSender, recipientResolver, conversationService
└── docs/prints/
```

As telas não chamam o Firebase direto, passam pelos `services`. A lógica de estado fica nos `hooks`.

Sobre os hooks: o `useEffect` abre e fecha os listeners do Firebase (quando sai do chat o listener é removido). O `useMemo` no `GroupFormScreen` calcula as vagas e a validação do grupo só quando nome, limite ou integrantes mudam. O `useCallback` no `ChatScreen` é usado no `renderItem` da lista de mensagens pra ela não renderizar tudo de novo enquanto a pessoa digita.

## Como rodar

### Firebase

1. Criar o projeto no Firebase Console
2. Em Authentication, habilitar só E-mail/senha
3. Criar Firestore, Realtime Database e Storage
4. Registrar um app Web e colocar a config em `app/firebaseConfig.json` (com o `databaseURL`)
5. Registrar um app Android com o pacote `br.com.fiap.chatfirebase` e colocar o `google-services.json` em `app/`
6. Publicar as regras:

```bash
npm install -g firebase-tools
cd app
firebase login
firebase use <id-do-projeto>
firebase deploy --only firestore:rules,database,storage
```

### Storage (fotos)

As fotos de perfil e de grupo ficam no Firebase Storage. Pra configurar:

1. No Firebase Console, ir em Storage > Começar e escolher a mesma região do Firestore. (Projetos novos precisam estar no plano Blaze pra criar o bucket, mas o uso fica dentro da cota grátis.)
2. Conferir se o `storageBucket` está preenchido no `app/firebaseConfig.json`
3. Publicar o `app/storage.rules` (já entra no comando de deploy acima)

O app comprime a foto na hora de escolher (qualidade 0.6), sobe pro Storage e salva só a URL de download no Firestore (campo `photoUrl` no perfil e no grupo).

### App

```bash
cd app
npm install
cp .env.example .env
```

No `.env`, preencher `EXPO_PUBLIC_API_URL` com a URL da API e `EXPO_PUBLIC_EAS_PROJECT_ID`.

O push não funciona no Expo Go, precisa de development build:

```bash
npx eas-cli build --profile development --platform android
npx expo start --dev-client
```

Também dá pra usar `npx expo run:android` se tiver o Android Studio instalado.

### API local (opcional, a online já está funcionando)

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

## Notificações no Android e iOS

Android:
- `google-services.json` em `app/`, já configurado no `app.json`
- Permissão `POST_NOTIFICATIONS` (Android 13+)
- Canal `messages` com prioridade alta
- O token FCM é salvo em `users/{uid}/devices` no login e removido no logout

iOS:
- Precisa de conta Apple Developer e iPhone físico
- Configurar a chave APNs com `npx eas-cli credentials`
- O app registra um Expo Push Token (por isso precisa do `EXPO_PUBLIC_EAS_PROJECT_ID`, que vem do `npx eas-cli init`) e a API envia pelo Expo Push Service

## Deploy da API no Render

1. New > Web Service, conectar o repositório
2. Language: Node / Root Directory: `server`
3. Build Command: `npm ci --include=dev && npm run build`
4. Start Command: `npm start`
5. Health Check Path: `/health`
6. Adicionar as variáveis do Firebase em Environment

A `FIREBASE_PRIVATE_KEY` pode ser colada com os `\n` do JSON mesmo, o código converte.
