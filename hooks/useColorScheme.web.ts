
/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
// Force light mode for consistent UI across platforms
export function useColorScheme() {
  return 'light' as const;
}
