const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const importStatement = `import { useFonts } from 'expo-font';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';\n`;

if (!code.includes('useFonts')) {
  code = code.replace("import React, { Component, ReactNode } from 'react';", "import React, { Component, ReactNode } from 'react';\n" + importStatement);
}

const fontHook = `
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    ...Feather.font,
    ...Ionicons.font,
    ...MaterialIcons.font,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#090D16' }} />;
  }
`;

if (!code.includes('fontsLoaded')) {
  code = code.replace('function MainApp() {', 'function MainApp() {' + fontHook);
}

fs.writeFileSync('App.tsx', code);
console.log('Fixed App.tsx fonts');
