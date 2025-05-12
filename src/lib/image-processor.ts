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
  // Convert threshold to 0-1 range for easier calculations
  const bgThreshold = backgroundThreshold / 100;
  
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
        
        // For background removal: store transparent pixel indices
        const transparentPixels = new Set<number>();
        let bgColorR = 0, bgColorG = 0, bgColorB = 0;
        
        // Background removal processing
        if (removeBackground) {
          // STEP 1: Determine background color from corners/edges
          // Sample points to check for background color
          const samplePoints = [
            {x: 0, y: 0},                    // Top-left corner
            {x: width-1, y: 0},              // Top-right corner
            {x: 0, y: height-1},             // Bottom-left corner
            {x: width-1, y: height-1},       // Bottom-right corner
            {x: Math.floor(width/2), y: 0},  // Top middle
            {x: Math.floor(width/2), y: height-1}, // Bottom middle
            {x: 0, y: Math.floor(height/2)}, // Left middle
            {x: width-1, y: Math.floor(height/2)}, // Right middle
          ];
          
          // Count color frequencies from sample points
          const colorFreq: Record<string, {r: number, g: number, b: number, count: number}> = {};
          
          for (const point of samplePoints) {
            const idx = (point.y * width + point.x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const key = `${r},${g},${b}`;
            
            if (!colorFreq[key]) {
              colorFreq[key] = {r, g, b, count: 0};
            }
            colorFreq[key].count++;
          }
          
          // Find the most common color from corners/edges
          const sortedColors = Object.values(colorFreq).sort((a, b) => b.count - a.count);
          if (sortedColors.length > 0) {
            bgColorR = sortedColors[0].r;
            bgColorG = sortedColors[0].g;
            bgColorB = sortedColors[0].b;
          }
          
          // STEP 2: Flood fill from edges ONLY to identify contiguous background
          // This ensures we only remove background outside the shape
          const queue: {x: number, y: number}[] = [];
          const visited = new Set<number>();
          
          // ONLY add edge pixels to the starting queue (borders of the image)
          // Top and bottom edges
          for (let x = 0; x < width; x++) {
            queue.push({x, y: 0});
            queue.push({x, y: height - 1});
          }
          
          // Left and right edges (excluding corners which are already added)
          for (let y = 1; y < height - 1; y++) {
            queue.push({x: 0, y});
            queue.push({x: width - 1, y});
          }
          
          // Flood fill algorithm to find connected background areas
          // ONLY starting from the edges - this prevents removing "inside" areas
          while (queue.length > 0) {
            const {x, y} = queue.shift()!;
            const idx = (y * width + x);
            const pixelIdx = idx * 4;
            
            // Skip if already visited
            if (visited.has(idx)) continue;
            visited.add(idx);
            
            // Get current pixel color
            const r = data[pixelIdx];
            const g = data[pixelIdx + 1];
            const b = data[pixelIdx + 2];
            
            // Color similarity calculation - normalized to 0-1 range
            const colorDiff = Math.sqrt(
              Math.pow(r - bgColorR, 2) + 
              Math.pow(g - bgColorG, 2) + 
              Math.pow(b - bgColorB, 2)
            ) / (255 * Math.sqrt(3));
            
            // If color is similar to background color
            if (colorDiff < bgThreshold) {
              // Mark as transparent
              transparentPixels.add(idx);
              
              // Add neighboring pixels to queue
              if (x > 0) queue.push({x: x-1, y});
              if (x < width-1) queue.push({x: x+1, y});
              if (y > 0) queue.push({x, y: y-1});
              if (y < height-1) queue.push({x, y: y+1});
            }
          }
          
          // REMOVED the second pass that was catching disconnected background areas
          // This ensures we ONLY remove the outer background and never similar colors inside the shape
        }
        
        // Function to check if a pixel should be transparent
        const isBackgroundColor = (x: number, y: number): boolean => {
          if (!removeBackground) return false;
          return transparentPixels.has(y * width + x);
        };

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
              if (isBackgroundColor(x, y)) {
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
              if (isBackgroundColor(x, y)) {
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