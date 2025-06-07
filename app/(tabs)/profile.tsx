import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../lib/AuthContext';

export default function Profile() {
  const { session, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  return (
    <View className="flex-1 p-6 bg-white">
      <Text className="text-3xl font-bold text-primary-600 mb-8">Profile</Text>
      
      <View className="bg-gray-100 rounded-lg p-4 mb-6">
        <Text className="text-gray-600 mb-2">Email</Text>
        <Text className="text-lg font-semibold">{session?.user?.email}</Text>
      </View>

      <TouchableOpacity
        className="w-full bg-red-500 rounded-lg py-3"
        onPress={handleSignOut}
      >
        <Text className="text-white text-center font-semibold">
          Sign Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}