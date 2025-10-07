# WebApp Finanzas - Generación de APK

Esta aplicación Angular puede convertirse en una aplicación móvil APK usando Capacitor.

## Prerrequisitos

1. **Android Studio** instalado con SDK de Android
2. **Java Development Kit (JDK) 11 o superior**
3. **Node.js** y **npm** instalados

## Pasos para generar APK

### 1. Compilar la aplicación web
```bash
npm run build
```

### 2. Sincronizar con Capacitor
```bash
npx cap sync android
```

### 3. Abrir en Android Studio (Método Recomendado)
```bash
npm run android
# o
npx cap open android
```

En Android Studio:
1. Espera a que se complete la sincronización de Gradle
2. Ve a **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. El APK se generará en `android/app/build/outputs/apk/debug/`

### 4. Script Automatizado
```bash
npm run build-apk
```
Luego abre Android Studio manualmente para generar el APK final.

### 5. Generar APK desde línea de comandos (Alternativo)
```bash
# Navegar al directorio android
cd android

# Compilar APK debug
./gradlew assembleDebug

# Compilar APK release (requiere firma)
./gradlew assembleRelease
```

## Configuración del APK

### Información de la aplicación:
- **Nombre**: WebApp Finanzas
- **Package ID**: com.goodwallet.finanzas
- **Versión**: 1.0.0

### Archivos importantes:
- `capacitor.config.ts` - Configuración de Capacitor
- `android/app/build.gradle` - Configuración de Android
- `android/app/src/main/AndroidManifest.xml` - Manifest de Android

## Personalización del APK

### Cambiar ícono de la aplicación:
1. Coloca tu ícono en `android/app/src/main/res/mipmap-*/`
2. Actualiza `AndroidManifest.xml`

### Cambiar nombre de la aplicación:
1. Edita `capacitor.config.ts`
2. Actualiza `android/app/src/main/res/values/strings.xml`

### Firma para Play Store:
1. Genera un keystore: `keytool -genkey -v -keystore my-release-key.keystore`
2. Configura `android/app/build.gradle` con los datos del keystore
3. Compila: `./gradlew assembleRelease`

## Troubleshooting

### Error "SDK location not found":
Crea `android/local.properties`:
```
sdk.dir=C:\\Users\\[USUARIO]\\AppData\\Local\\Android\\Sdk
```

### Error de Java/Gradle:
Asegúrate de tener JDK 11+ instalado y configurado en el PATH.

### Error de sincronización:
```bash
npx cap sync android --force
```

## Desarrollo

Para desarrollo con live reload:
```bash
# Terminal 1: Servidor Angular
npm start

# Terminal 2: Capacitor con live reload
npx cap run android --live-reload --external
```

## Ubicación del APK generado

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`

## Comandos útiles

```bash
# Ver dispositivos conectados
adb devices

# Instalar APK en dispositivo
adb install path/to/app.apk

# Ver logs de la aplicación
adb logcat | grep WebApp

# Limpiar proyecto Android
cd android && ./gradlew clean
```
