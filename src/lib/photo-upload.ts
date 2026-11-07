import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/*
 * Venue photos leave the phone small (Prompt 5): at most 1600 px on the long
 * side as a JPEG, about 200 to 400 KB instead of a 4 MB camera original, so an
 * owner on mobile data can upload one. The API re-encodes it again and strips
 * every bit of metadata, including location.
 */

const LONG_SIDE = 1600;

/** Opens the photo library for one picture; null if the owner cancels. */
export async function pickPhoto(): Promise<{
  uri: string;
  width: number;
  height: number;
} | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: false,
    quality: 1,
    exif: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const { uri, width, height } = result.assets[0];
  return { uri, width, height };
}

/** Shrinks and re-saves a picked photo as JPEG; returns it ready to send. */
export async function preparePhoto(photo: {
  uri: string;
  width: number;
  height: number;
}): Promise<Blob> {
  const context = ImageManipulator.manipulate(photo.uri);
  const long = Math.max(photo.width, photo.height);
  if (long > LONG_SIDE)
    context.resize(
      photo.width >= photo.height
        ? { width: LONG_SIDE, height: null }
        : { width: null, height: LONG_SIDE },
    );
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  const response = await fetch(saved.uri);
  return response.blob();
}
