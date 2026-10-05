import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import type { AppStackParamList, AuthStackParamList } from '../types/navigation';
import type { PushPayloadData } from '../types/notification';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const navigationRef = createNavigationContainerRef<AppStackParamList>();

function AppScreens({ uid }: { uid: string }) {
  // Toque na notificação: abre a conversa indicada no payload.
  const openConversation = useCallback((payload: PushPayloadData) => {
    const go = () =>
      navigationRef.navigate('Chat', {
        conversationId: payload.conversationId,
        conversationType: payload.conversationType,
      });
    if (navigationRef.isReady()) go();
    else setTimeout(go, 500);
  }, []);
  const { message } = useNotifications(uid, openConversation);

  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Conversations" options={{ title: 'Conversas' }}>
        {(props) => <ConversationsScreen {...props} notificationMessage={message} />}
      </AppStack.Screen>
      <AppStack.Screen
        name="Users"
        component={UsersScreen}
        options={({ route }) => ({ title: route.params.mode === 'direct' ? 'Nova conversa' : 'Selecionar integrantes' })}
      />
      <AppStack.Screen
        name="GroupForm"
        component={GroupFormScreen}
        options={({ route }) => ({ title: route.params.groupId ? 'Editar grupo' : 'Novo grupo' })}
      />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      <AppStack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { firebaseUser, initializing } = useAuth();

  if (initializing) return <Loading label="Recuperando sessão..." />;

  return (
    <NavigationContainer ref={navigationRef}>
      {firebaseUser ? (
        // key força desmontar todas as telas (e seus listeners) no logout/troca de usuário.
        <AppScreens key={firebaseUser.uid} uid={firebaseUser.uid} />
      ) : (
        <AuthStack.Navigator>
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
