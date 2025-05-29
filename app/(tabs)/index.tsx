import { Text, View } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-5xl text-blue-500">Welcome</Text>
      <Link href="/sign-in">Sign In</Link>
      <Link href="/audit">Audit</Link>
      <Link href="/profile">Profile</Link>
    </View>
  );
}
