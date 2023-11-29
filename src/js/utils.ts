/**
 * 画像のプリロード
 *
 * @param src
 * @returns
 */
export const preload = async (src: string) => {
  const response = await fetch(src)
  const blob = await response.blob()
  return await createImageBitmap(blob)
}

/**
 * 画像のプリロード
 *
 * @param srcs
 * @returns
 */
export const preloadAll = (srcs: string[]) => Promise.all(srcs.map(preload))

/**
 * スリーブ
 *
 * @param wait
 * @returns
 */
export const sleep = async (wait: number) =>
  await new Promise((resolve) => setTimeout(resolve, wait))
