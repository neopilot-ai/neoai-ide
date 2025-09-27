import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { ProjectsScreen } from '../screens/main/ProjectsScreen';
import { EditorScreen } from '../screens/main/EditorScreen';
import { AIAssistantScreen } from '../screens/main/AIAssistantScreen';
import { CollaborationScreen } from '../screens/main/CollaborationScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';

// Project Screens
import { ProjectDetailScreen } from '../screens/project/ProjectDetailScreen';
import { CreateProjectScreen } from '../screens/project/CreateProjectScreen';
import { ProjectSettingsScreen } from '../screens/project/ProjectSettingsScreen';

// Editor Screens
import { FileExplorerScreen } from '../screens/editor/FileExplorerScreen';
import { CodeEditorScreen } from '../screens/editor/CodeEditorScreen';
import { PreviewScreen } from '../screens/editor/PreviewScreen';
import { GitScreen } from '../screens/editor/GitScreen';

// AI Screens
import { ChatScreen } from '../screens/ai/ChatScreen';
import { AgentScreen } from '../screens/ai/AgentScreen';
import { ModelSelectionScreen } from '../screens/ai/ModelSelectionScreen';

// Collaboration Screens
import { TeamScreen } from '../screens/collaboration/TeamScreen';
import { ShareScreen } from '../screens/collaboration/ShareScreen';
import { ReviewScreen } from '../screens/collaboration/ReviewScreen';

// Settings Screens
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { PreferencesScreen } from '../screens/settings/PreferencesScreen';
import { SecurityScreen } from '../screens/settings/SecurityScreen';
import { SubscriptionScreen } from '../screens/settings/SubscriptionScreen';

// Plugin Screens
import { PluginMarketplaceScreen } from '../screens/plugins/PluginMarketplaceScreen';
import { InstalledPluginsScreen } from '../screens/plugins/InstalledPluginsScreen';
import { PluginDetailScreen } from '../screens/plugins/PluginDetailScreen';

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProjectDetail: { projectId: string };
  CreateProject: undefined;
  ProjectSettings: { projectId: string };
  Editor: { projectId: string; fileId?: string };
  CodeEditor: { projectId: string; fileId: string };
  Preview: { projectId: string };
  Git: { projectId: string };
  Chat: { projectId?: string };
  Agent: { projectId?: string };
  ModelSelection: undefined;
  Team: { projectId: string };
  Share: { projectId: string };
  Review: { projectId: string; reviewId: string };
  Profile: undefined;
  Preferences: undefined;
  Security: undefined;
  Subscription: undefined;
  PluginMarketplace: undefined;
  InstalledPlugins: undefined;
  PluginDetail: { pluginId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Projects: undefined;
  AI: undefined;
  Collaboration: undefined;
  Settings: undefined;
};

export type EditorTabParamList = {
  FileExplorer: undefined;
  CodeEditor: undefined;
  Preview: undefined;
  Git: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const EditorTab = createBottomTabNavigator<EditorTabParamList>();
const Drawer = createDrawerNavigator();

const AuthNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <AuthStack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
      />
      <AuthStack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ title: 'Reset Password' }}
      />
    </AuthStack.Navigator>
  );
};

const EditorNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <EditorTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'FileExplorer':
              iconName = 'folder';
              break;
            case 'CodeEditor':
              iconName = 'code';
              break;
            case 'Preview':
              iconName = 'visibility';
              break;
            case 'Git':
              iconName = 'source';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      })}
    >
      <EditorTab.Screen 
        name="FileExplorer" 
        component={FileExplorerScreen}
        options={{ title: 'Files' }}
      />
      <EditorTab.Screen 
        name="CodeEditor" 
        component={CodeEditorScreen}
        options={{ title: 'Editor' }}
      />
      <EditorTab.Screen 
        name="Preview" 
        component={PreviewScreen}
        options={{ title: 'Preview' }}
      />
      <EditorTab.Screen 
        name="Git" 
        component={GitScreen}
        options={{ title: 'Git' }}
      />
    </EditorTab.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Projects':
              iconName = 'folder';
              break;
            case 'AI':
              iconName = 'psychology';
              break;
            case 'Collaboration':
              iconName = 'group';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      })}
    >
      <MainTab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <MainTab.Screen 
        name="Projects" 
        component={ProjectsScreen}
        options={{ title: 'Projects' }}
      />
      <MainTab.Screen 
        name="AI" 
        component={AIAssistantScreen}
        options={{ title: 'AI Assistant' }}
      />
      <MainTab.Screen 
        name="Collaboration" 
        component={CollaborationScreen}
        options={{ title: 'Collaborate' }}
      />
      <MainTab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </MainTab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {!isAuthenticated ? (
        <RootStack.Screen 
          name="Auth" 
          component={AuthNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <RootStack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="ProjectDetail" 
            component={ProjectDetailScreen}
            options={{ title: 'Project Details' }}
          />
          <RootStack.Screen 
            name="CreateProject" 
            component={CreateProjectScreen}
            options={{ title: 'New Project' }}
          />
          <RootStack.Screen 
            name="ProjectSettings" 
            component={ProjectSettingsScreen}
            options={{ title: 'Project Settings' }}
          />
          <RootStack.Screen 
            name="Editor" 
            component={EditorNavigator}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="CodeEditor" 
            component={CodeEditorScreen}
            options={{ title: 'Code Editor' }}
          />
          <RootStack.Screen 
            name="Preview" 
            component={PreviewScreen}
            options={{ title: 'Preview' }}
          />
          <RootStack.Screen 
            name="Git" 
            component={GitScreen}
            options={{ title: 'Git' }}
          />
          <RootStack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{ title: 'AI Chat' }}
          />
          <RootStack.Screen 
            name="Agent" 
            component={AgentScreen}
            options={{ title: 'AI Agent' }}
          />
          <RootStack.Screen 
            name="ModelSelection" 
            component={ModelSelectionScreen}
            options={{ title: 'AI Models' }}
          />
          <RootStack.Screen 
            name="Team" 
            component={TeamScreen}
            options={{ title: 'Team' }}
          />
          <RootStack.Screen 
            name="Share" 
            component={ShareScreen}
            options={{ title: 'Share Project' }}
          />
          <RootStack.Screen 
            name="Review" 
            component={ReviewScreen}
            options={{ title: 'Code Review' }}
          />
          <RootStack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
          <RootStack.Screen 
            name="Preferences" 
            component={PreferencesScreen}
            options={{ title: 'Preferences' }}
          />
          <RootStack.Screen 
            name="Security" 
            component={SecurityScreen}
            options={{ title: 'Security' }}
          />
          <RootStack.Screen 
            name="Subscription" 
            component={SubscriptionScreen}
            options={{ title: 'Subscription' }}
          />
          <RootStack.Screen 
            name="PluginMarketplace" 
            component={PluginMarketplaceScreen}
            options={{ title: 'Plugin Marketplace' }}
          />
          <RootStack.Screen 
            name="InstalledPlugins" 
            component={InstalledPluginsScreen}
            options={{ title: 'Installed Plugins' }}
          />
          <RootStack.Screen 
            name="PluginDetail" 
            component={PluginDetailScreen}
            options={{ title: 'Plugin Details' }}
          />
        </>
      )}
    </RootStack.Navigator>
  );
};
