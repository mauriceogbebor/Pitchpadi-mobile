import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts, palette } from "@/theme/tokens";

const source = require("../../assets/videos/intro.mp4");

/** A brief, bundled opening scene after the native static splash. */
export function LaunchVideo({ onDone }: { onDone: () => void }) {
  const player = useVideoPlayer(source, (instance) => {
    instance.muted = true;
    instance.play();
  });

  useEventListener(player, "playToEnd", onDone);
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") onDone();
  });
  // Never hold up the app if decoding stalls on a budget phone.
  useEffect(() => {
    const timeout = setTimeout(onDone, 5_000);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return (
    <View style={styles.screen} accessibilityLabel="Football under the lights">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />
      <SafeAreaView style={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip opening video"
          onPress={onDone}
          style={styles.skip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <View style={styles.caption}>
          <Text style={styles.name}>
            Pitch<Text style={styles.accent}>Padi</Text>
          </Text>
          <Text style={styles.tagline}>Your next game starts here.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: palette.pitch,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  skip: {
    minWidth: 64,
    minHeight: 48,
    margin: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "rgba(10,22,18,0.76)",
  },
  skipText: { color: palette.white, fontFamily: fonts.semibold, fontSize: 16 },
  caption: {
    alignSelf: "stretch",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    backgroundColor: "rgba(10,22,18,0.78)",
  },
  name: {
    color: palette.white,
    fontFamily: fonts.displayHeavy,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.5,
  },
  accent: { color: palette.volt },
  tagline: {
    marginTop: 8,
    color: palette.white,
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 24,
  },
});
