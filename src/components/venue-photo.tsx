import { Image } from "expo-image";
import type { StyleProp, ImageStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { Photo } from "@/api/generated";
import { useColors } from "@/theme/use-theme";

/**
 * A venue photo (Prompt 5). Cached on the phone, so a card seen once costs no
 * data again; a quiet fill shows while it loads. Decorative: the venue's name
 * is always next to it, so screen readers skip it.
 */
export function VenuePhoto({
  photo,
  size = "card",
  style,
}: {
  photo: Photo;
  /** "card": 640 × 480 for lists; "large": up to 1600 px for the venue page. */
  size?: "card" | "large";
  style?: StyleProp<ImageStyle>;
}) {
  const colors = useColors();
  const reduce = useReducedMotion();
  return (
    <Image
      source={{ uri: size === "card" ? photo.cardUrl : photo.url }}
      recyclingKey={`${photo.id}-${size}`}
      cachePolicy="disk"
      contentFit="cover"
      transition={reduce ? 0 : 150}
      accessible={false}
      style={[{ backgroundColor: colors.muted }, style]}
    />
  );
}
