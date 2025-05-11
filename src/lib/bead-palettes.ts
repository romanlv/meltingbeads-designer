export const beadPalettes = {
  // Standard palette with 48 colors
  standard: [
    // Whites and grays
    "#FFFFFF", // White
    "#F5F5F5", // Snow
    "#E0E0E0", // Light Gray
    "#A9A9A9", // Gray
    "#696969", // Dark Gray
    "#000000", // Black

    // Reds
    "#FFE4E1", // Misty Rose
    "#FFC0CB", // Pink
    "#FF69B4", // Hot Pink
    "#FF1493", // Deep Pink
    "#DC143C", // Crimson
    "#FF0000", // Red
    "#8B0000", // Dark Red

    // Oranges
    "#FFF0F5", // Lavender Blush
    "#FFDAB9", // Peach
    "#FFEFD5", // Papaya Whip
    "#FFD700", // Gold
    "#FFA500", // Orange
    "#FF8C00", // Dark Orange
    "#FF4500", // Orange Red

    // Yellows
    "#FFFFE0", // Light Yellow
    "#FFFACD", // Lemon Chiffon
    "#FFFF00", // Yellow
    "#FFD700", // Gold
    "#BDB76B", // Dark Khaki

    // Greens
    "#F0FFF0", // Honeydew
    "#98FB98", // Pale Green
    "#90EE90", // Light Green
    "#00FF00", // Lime
    "#32CD32", // Lime Green
    "#008000", // Green
    "#006400", // Dark Green
    "#2E8B57", // Sea Green

    // Blues
    "#F0FFFF", // Azure
    "#E0FFFF", // Light Cyan
    "#AFEEEE", // Pale Turquoise
    "#00FFFF", // Cyan
    "#00CED1", // Dark Turquoise
    "#1E90FF", // Dodger Blue
    "#0000FF", // Blue
    "#0000CD", // Medium Blue
    "#00008B", // Dark Blue
    "#191970", // Midnight Blue

    // Purples
    "#E6E6FA", // Lavender
    "#D8BFD8", // Thistle
    "#DDA0DD", // Plum
    "#EE82EE", // Violet
    "#DA70D6", // Orchid
    "#9370DB", // Medium Purple
    "#8A2BE2", // Blue Violet
    "#4B0082", // Indigo
  ],

  // Mini palette with 24 colors
  mini: [
    "#FFFFFF", // White
    "#E0E0E0", // Light Gray
    "#A9A9A9", // Gray
    "#000000", // Black
    "#FFC0CB", // Pink
    "#FF69B4", // Hot Pink
    "#FF0000", // Red
    "#8B0000", // Dark Red
    "#FFDAB9", // Peach
    "#FFA500", // Orange
    "#FFFF00", // Yellow
    "#FFD700", // Gold
    "#98FB98", // Pale Green
    "#00FF00", // Lime
    "#008000", // Green
    "#2E8B57", // Sea Green
    "#AFEEEE", // Pale Turquoise
    "#00FFFF", // Cyan
    "#1E90FF", // Dodger Blue
    "#0000FF", // Blue
    "#00008B", // Dark Blue
    "#DDA0DD", // Plum
    "#EE82EE", // Violet
    "#8A2BE2", // Blue Violet
  ],

  // Pastel palette with 12 colors
  pastel: [
    "#FFFFFF", // White
    "#000000", // Black
    "#FFE4E1", // Misty Rose
    "#FFC0CB", // Pink
    "#FFDAB9", // Peach
    "#FFFACD", // Lemon Chiffon
    "#F0FFF0", // Honeydew
    "#98FB98", // Pale Green
    "#E0FFFF", // Light Cyan
    "#AFEEEE", // Pale Turquoise
    "#E6E6FA", // Lavender
    "#D8BFD8", // Thistle
  ],
}

// Helper function to find the closest color in a palette to a given RGB color
export function findClosestColor(r: number, g: number, b: number, palette: string[]): string {
  let minDistance = Number.POSITIVE_INFINITY
  let closestColor = palette[0]

  for (const color of palette) {
    // Convert hex to RGB
    const hex = color.substring(1) // Remove #
    const pr = Number.parseInt(hex.substring(0, 2), 16)
    const pg = Number.parseInt(hex.substring(2, 4), 16)
    const pb = Number.parseInt(hex.substring(4, 6), 16)

    // Calculate Euclidean distance in RGB space
    const distance = Math.sqrt(Math.pow(r - pr, 2) + Math.pow(g - pg, 2) + Math.pow(b - pb, 2))

    if (distance < minDistance) {
      minDistance = distance
      closestColor = color
    }
  }

  return closestColor
}
