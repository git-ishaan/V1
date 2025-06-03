// // app/(tabs)/_layout.tsx
// import React from 'react';
// import { Tabs } from 'expo-router';
// import { FontAwesome } from '@expo/vector-icons';
// import '../../global.css'; 

// export default function TabsLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: '#007aff',
//         // You can still style the tabBar itself here:
//         tabBarStyle: {
//           height: 60,
//           paddingVertical: 4,
//           borderTopWidth: 1,
//           borderTopColor: '#ccc',
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Dashboard',
//           tabBarIcon: ({ color }) => (
//             <FontAwesome name="tachometer" size={22} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="report"
//         options={{
//           title: 'Report',
//           tabBarIcon: ({ color }) => (
//             <FontAwesome name="file-text-o" size={22} color={color} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }



// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import '../../global.css';

// ➊ Import the hook we just created:
import { useRegisterForPushNotificationsAsync } from '../pushRegistration';

export default function TabsLayout() {
  // ➋ As soon as this component mounts, it will:
  //      • ask for notification permission
  //      • obtain an Expo Push Token
  //      • POST it to your backend
  const expoPushToken = useRegisterForPushNotificationsAsync();

  console.log('In _layout, expoPushToken is:', expoPushToken);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007aff',
        // You can still style the tabBar itself here:
        tabBarStyle: {
          height: 60,
          paddingVertical: 4,
          borderTopWidth: 1,
          borderTopColor: '#ccc',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="tachometer" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="file-text-o" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
