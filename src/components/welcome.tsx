import { useQuery } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { listAreas } from "@/api/generated";
import { AreaPicker } from "@/components/area-picker";
import { Body, Button } from "@/components/ui";
import type { WelcomeChoice } from "@/lib/welcome";
import { fonts, palette, space } from "@/theme/tokens";

const clip = require("../../assets/videos/welcome.mp4");
const still = require("../../assets/images/welcome-poster.jpg");

/**
 * The first-launch welcome (SV-02): floodlit football from Maurice's project
 * video loops quietly behind the first useful choice, so the mood lands
 * while the player picks where they play, not before. Shown once; never over
 * a shared link; a still frame with reduced motion.
 */
export function Welcome({
  motion,
  onDone,
}: {
  /** False with reduced motion: the still frame, no entrance. */
  motion: boolean;
  onDone: (choice: WelcomeChoice) => void;
}) {
  const [areasOpen, setAreasOpen] = useState(false);
  const areas = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const response = await listAreas();
      if (response.status !== 200) throw new Error("We could not load areas.");
      return response.data.areas;
    },
    staleTime: 60 * 60 * 1000,
  });

  return (
    <View style={styles.screen} accessibilityViewIsModal>
      {/* The still is under the clip, so there is never a blank frame. */}
      <Image
        source={still}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessible={false}
      />
      {motion && <Clip />}
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        aria-hidden
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.night} stopOpacity={0.6} />
            <Stop offset="0.3" stopColor={palette.night} stopOpacity={0.05} />
            <Stop offset="0.55" stopColor={palette.night} stopOpacity={0.45} />
            <Stop offset="1" stopColor={palette.night} stopOpacity={0.96} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#scrim)" />
      </Svg>
      <SafeAreaView style={styles.content}>
        <Text style={styles.name} accessibilityRole="header">
          Pitch<Text style={styles.accent}>Padi</Text>
        </Text>
        <Animated.View
          entering={motion ? FadeInDown.duration(320).delay(250) : undefined}
          style={styles.bottom}
        >
          <Text style={styles.title} accessibilityRole="header">
            Your next game starts here.
          </Text>
          <Body tone="onBand" style={styles.lead}>
            Open pitches across Lagos, with real prices and times you can book
            now. Where do you play?
          </Body>
          <View style={styles.actions}>
            <Button
              variant="onBand"
              icon="location-outline"
              label="Choose your area"
              onPress={() => setAreasOpen(true)}
            />
            <Button
              variant="outline"
              icon="navigate-outline"
              label="Use my location"
              accessibilityHint="Asks for your location to show pitches near you"
              textColor={palette.white}
              style={styles.onDark}
              onPress={() => onDone({ kind: "nearMe" })}
            />
            <Button
              variant="ghost"
              label="Browse all of Lagos"
              textColor={palette.white}
              onPress={() => onDone({ kind: "browse" })}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
      {areasOpen && (
        <AreaPicker
          areas={areas.data ?? []}
          value={null}
          onChange={(slug) =>
            onDone(slug ? { kind: "area", slug } : { kind: "browse" })
          }
          onClose={() => setAreasOpen(false)}
          loading={areas.isPending}
          error={areas.isError}
          onRetry={() => void areas.refetch()}
        />
      )}
    </View>
  );
}

/** A 4-second, 197 KB muted loop bundled with the app: no download. */
function Clip() {
  const player = useVideoPlayer(clip, (instance) => {
    instance.muted = true;
    instance.loop = true;
    instance.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      surfaceType="textureView"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    />
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
    overflow: "hidden",
    backgroundColor: palette.night,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
  name: {
    color: palette.white,
    fontFamily: fonts.displayHeavy,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.8,
  },
  accent: { color: palette.volt },
  bottom: { gap: space.md, maxWidth: 520 },
  title: {
    color: palette.white,
    fontFamily: fonts.displayHeavy,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.4,
  },
  lead: { fontSize: 17, lineHeight: 24 },
  actions: { gap: space.sm, marginTop: space.md },
  onDark: {
    backgroundColor: "rgba(10,22,18,0.35)",
    borderColor: "rgba(255,255,255,0.45)",
  },
});
