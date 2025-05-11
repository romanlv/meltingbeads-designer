import { findClosestColor } from "./bead-palettes"

interface ProcessImageResult {
  patternDataUrl: string
  colorGrid: string[][]
}

export async function processImage(
  imageUrl: string,
  beadSize: number,
  maxBeads: number,
  palette: string[],
  showGrid: boolean,
  dithering = false,
  removeBackground = false,
  backgroundThreshold = 30,
): Promise<ProcessImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        // Create a canvas to process the image
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Calculate dimensions to maintain aspect ratio
        let width = img.width
        let height = img.height

        // Scale down if needed to fit within maxBeads
        if (width > height) {
          if (width > maxBeads) {
            height = Math.round(height * (maxBeads / width))
            width = maxBeads
          }
        } else {
          if (height > maxBeads) {
            width = Math.round(width * (maxBeads / height))
            height = maxBeads
          }
        }

        // Set canvas size for processing
        canvas.width = width
        canvas.height = height

        // Draw and resize the image
        ctx.drawImage(img, 0, 0, width, height)

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        // Create a 2D array to store the color of each bead
        const colorGrid: string[][] = []

        // Detect background color if background removal is enabled
        const backgroundColors: { r: number; g: number; b: number; count: number }[] = []

        if (removeBackground) {
          // First, collect all colors and their frequencies
          const colorFrequency: Record<string, { r: number; g: number; b: number; count: number }> = {}

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const index = (y * width + x) * 4
              const r = data[index]
              const g = data[index + 1]
              const b = data[index + 2]

              const colorKey = `${r},${g},${b}`

              if (!colorFrequency[colorKey]) {
                colorFrequency[colorKey] = { r, g, b, count: 0 }
              }
              colorFrequency[colorKey].count++
            }
          }

          // Convert to array and sort by frequency (most common first)
          const sortedColors = Object.values(colorFrequency).sort((a, b) => b.count - a.count)

          // Take the most common color as the primary background color
          // and any similar colors based on threshold
          if (sortedColors.length > 0) {
            const primaryBackground = sortedColors[0]
            backgroundColors.push(primaryBackground)

            // Also include colors that are similar to the most common color
            // and have significant frequency (at least 5% of the most common)
            const similarityThreshold = (backgroundThreshold / 100) * 255 * 3
            const frequencyThreshold = primaryBackground.count * 0.05

            for (let i = 1; i < sortedColors.length; i++) {
              const color = sortedColors[i]
              if (color.count < frequencyThreshold) continue

              const distance = Math.sqrt(
                Math.pow(color.r - primaryBackground.r, 2) +
                  Math.pow(color.g - primaryBackground.g, 2) +
                  Math.pow(color.b - primaryBackground.b, 2),
              )

              if (distance < similarityThreshold) {
                backgroundColors.push(color)
              }
            }
          }
        }

        // Function to check if a color is similar to background
        const isBackgroundColor = (r: number, g: number, b: number): boolean => {
          if (!removeBackground || backgroundColors.length === 0) return false

          // Convert threshold percentage to color distance
          const threshold = (backgroundThreshold / 100) * 255 * 3

          // Check if the color is similar to any background color
          return backgroundColors.some((bgColor) => {
            const distance = Math.sqrt(
              Math.pow(r - bgColor.r, 2) + Math.pow(g - bgColor.g, 2) + Math.pow(b - bgColor.b, 2),
            )
            return distance < threshold
          })
        }

        // Process each pixel and find the closest bead color
        if (dithering) {
          // Floyd-Steinberg dithering
          // Create a copy of the image data to work with
          const buffer = new ArrayBuffer(data.length)
          const pixels = new Uint8ClampedArray(buffer)
          pixels.set(data)

          for (let y = 0; y < height; y++) {
            colorGrid[y] = []
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4
              const r = pixels[idx]
              const g = pixels[idx + 1]
              const b = pixels[idx + 2]
              const a = pixels[idx + 3]

              // Check if this pixel should be transparent (background)
              if (isBackgroundColor(r, g, b)) {
                colorGrid[y][x] = "transparent"
                data[idx + 3] = 0 // Make transparent in the output
                continue
              }

              // Find the closest color in the palette
              const closestColor = findClosestColor(r, g, b, palette)
              colorGrid[y][x] = closestColor

              // Get the RGB values of the closest color
              const hex = closestColor.substring(1) // Remove #
              const cr = Number.parseInt(hex.substring(0, 2), 16)
              const cg = Number.parseInt(hex.substring(2, 4), 16)
              const cb = Number.parseInt(hex.substring(4, 6), 16)

              // Calculate the error
              const errR = r - cr
              const errG = g - cg
              const errB = b - cb

              // Distribute the error to neighboring pixels
              if (x + 1 < width) {
                pixels[idx + 4] += (errR * 7) / 16
                pixels[idx + 5] += (errG * 7) / 16
                pixels[idx + 6] += (errB * 7) / 16
              }
              if (y + 1 < height) {
                if (x > 0) {
                  pixels[idx + 4 * width - 4] += (errR * 3) / 16
                  pixels[idx + 4 * width - 3] += (errG * 3) / 16
                  pixels[idx + 4 * width - 2] += (errB * 3) / 16
                }
                pixels[idx + 4 * width] += (errR * 5) / 16
                pixels[idx + 4 * width + 1] += (errG * 5) / 16
                pixels[idx + 4 * width + 2] += (errB * 5) / 16
                if (x + 1 < width) {
                  pixels[idx + 4 * width + 4] += (errR * 1) / 16
                  pixels[idx + 4 * width + 5] += (errG * 1) / 16
                  pixels[idx + 4 * width + 6] += (errB * 1) / 16
                }
              }

              // Replace the pixel color with the bead color for display
              data[idx] = cr
              data[idx + 1] = cg
              data[idx + 2] = cb
            }
          }
        } else {
          // Standard color mapping without dithering
          for (let y = 0; y < height; y++) {
            colorGrid[y] = []
            for (let x = 0; x < width; x++) {
              const index = (y * width + x) * 4
              const r = data[index]
              const g = data[index + 1]
              const b = data[index + 2]

              // Check if this pixel should be transparent (background)
              if (isBackgroundColor(r, g, b)) {
                colorGrid[y][x] = "transparent"
                data[index + 3] = 0 // Make transparent in the output
                continue
              }

              // Find the closest color in the palette
              const closestColor = findClosestColor(r, g, b, palette)
              colorGrid[y][x] = closestColor

              // Replace the pixel color with the bead color
              const hex = closestColor.substring(1) // Remove #
              data[index] = Number.parseInt(hex.substring(0, 2), 16) // R
              data[index + 1] = Number.parseInt(hex.substring(2, 4), 16) // G
              data[index + 2] = Number.parseInt(hex.substring(4, 6), 16) // B
            }
          }
        }

        // Put the processed image data back
        ctx.putImageData(imageData, 0, 0)

        // Create a new canvas for the final pattern with larger beads
        const patternCanvas = document.createElement("canvas")
        const patternCtx = patternCanvas.getContext("2d", { alpha: true })

        if (!patternCtx) {
          reject(new Error("Could not get pattern canvas context"))
          return
        }

        // Set the size of the pattern canvas
        patternCanvas.width = width * beadSize
        patternCanvas.height = height * beadSize

        // Clear the canvas to transparent if background removal is enabled
        if (removeBackground) {
          patternCtx.clearRect(0, 0, patternCanvas.width, patternCanvas.height)
        }

        // Draw each bead as a colored square
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const color = colorGrid[y][x]

            // Skip transparent beads
            if (color === "transparent") continue

            patternCtx.fillStyle = color
            patternCtx.fillRect(x * beadSize, y * beadSize, beadSize, beadSize)

            // Draw grid lines if enabled
            if (showGrid) {
              patternCtx.strokeStyle = "rgba(0, 0, 0, 0.2)"
              patternCtx.lineWidth = 0.5
              patternCtx.strokeRect(x * beadSize, y * beadSize, beadSize, beadSize)
            }
          }
        }

        // Convert the pattern canvas to a data URL
        const patternDataUrl = patternCanvas.toDataURL("image/png")

        resolve({
          patternDataUrl,
          colorGrid,
        })
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }

    img.src = imageUrl
  })
}
