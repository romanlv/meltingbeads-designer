"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, Download, Loader2, RefreshCw, Info, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { beadPalettes } from "@/lib/bead-palettes"
import { processImage } from "@/lib/image-processor"

export default function BeadPatternGenerator() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [beadPattern, setBeadPattern] = useState<string | null>(null)
  const [beadColors, setBeadColors] = useState<string[][]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [colorCounts, setColorCounts] = useState<Record<string, number>>({})
  const [showBeadCount, setShowBeadCount] = useState(false) // New state for toggling bead count visibility

  // Configuration options
  const [beadSize, setBeadSize] = useState(10) // Size of each bead in pixels
  const [maxBeads, setMaxBeads] = useState(29) // Maximum beads in width or height
  const [selectedPalette, setSelectedPalette] = useState("standard")
  const [showGrid, setShowGrid] = useState(true)
  const [dithering, setDithering] = useState(false)
  const [removeBackground, setRemoveBackground] = useState(false) // New setting for background removal
  const [backgroundThreshold, setBackgroundThreshold] = useState(30) // Threshold for background detection (0-100)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Process image whenever settings change
  useEffect(() => {
    if (!originalImage) return

    // Clear any existing timeout to prevent multiple processing
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
    }

    // Set a small delay to avoid processing on every single change
    setIsProcessing(true)
    processingTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await processImage(
          originalImage,
          beadSize,
          maxBeads,
          beadPalettes[selectedPalette as keyof typeof beadPalettes],
          showGrid,
          dithering,
          removeBackground,
          backgroundThreshold,
        )

        setBeadPattern(result.patternDataUrl)
        setBeadColors(result.colorGrid)

        // Count colors (excluding transparent/background)
        const counts: Record<string, number> = {}
        for (const row of result.colorGrid) {
          for (const color of row) {
            if (color !== "transparent") {
              counts[color] = (counts[color] || 0) + 1
            }
          }
        }
        setColorCounts(counts)
      } catch (error) {
        console.error("Error processing image:", error)
      } finally {
        setIsProcessing(false)
      }
    }, 300)

    // Cleanup
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [originalImage, beadSize, maxBeads, selectedPalette, showGrid, dithering, removeBackground, backgroundThreshold])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setOriginalImage(result)
    }
    reader.readAsDataURL(file)
  }

  const handleDownload = () => {
    if (!beadPattern) return

    const link = document.createElement("a")
    link.href = beadPattern
    link.download = "bead-pattern.png"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Calculate total bead count
  const totalBeadCount = Object.values(colorCounts).reduce((sum, count) => sum + count, 0)

  return (
    <main className="container max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-center mb-6">Melting Beads Pattern Generator</h1>

      {/* Main content area */}
      <div className="flex flex-col gap-6">
        {/* Upload Section - Always at top */}
        <Card>
          <CardContent className="pt-6">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={triggerFileInput}
            >
              <Upload className="mx-auto h-6 w-6 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload an image</p>
            </div>

            {originalImage && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">Original Image:</p>
                  <Button variant="ghost" size="sm" onClick={triggerFileInput}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Change
                  </Button>
                </div>
                <div className="flex justify-center">
                  <img
                    src={originalImage || "/placeholder.svg"}
                    alt="Original"
                    className="max-h-48 rounded-md object-contain"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings and Preview side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: Settings */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold mb-2">Pattern Settings</h2>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="max-beads">
                    Pattern Size: {maxBeads}×{maxBeads}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Maximum number of beads in width or height</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Slider
                  id="max-beads"
                  min={10}
                  max={50}
                  step={1}
                  value={[maxBeads]}
                  onValueChange={(value) => setMaxBeads(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="bead-size">Bead Display Size: {beadSize}px</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Visual size of beads (display only)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Slider
                  id="bead-size"
                  min={5}
                  max={20}
                  step={1}
                  value={[beadSize]}
                  onValueChange={(value) => setBeadSize(value[0])}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bead-palette">Bead Palette</Label>
                <Select value={selectedPalette} onValueChange={setSelectedPalette}>
                  <SelectTrigger id="bead-palette">
                    <SelectValue placeholder="Select a palette" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (48 colors)</SelectItem>
                    <SelectItem value="mini">Mini (24 colors)</SelectItem>
                    <SelectItem value="pastel">Pastel (12 colors)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Background Removal Section */}
              <div className="pt-2 border-t">
                <h3 className="text-sm font-medium mb-3">Background Options</h3>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="remove-background">Remove background</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Make the background transparent (removes most common color)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch id="remove-background" checked={removeBackground} onCheckedChange={setRemoveBackground} />
                </div>

                {removeBackground && (
                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="background-threshold">Sensitivity: {backgroundThreshold}%</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Higher values remove more similar colors as background</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Slider
                      id="background-threshold"
                      min={5}
                      max={50}
                      step={1}
                      value={[backgroundThreshold]}
                      onValueChange={(value) => setBackgroundThreshold(value[0])}
                    />
                  </div>
                )}
              </div>

              {/* Other Settings */}
              <div className="pt-2 border-t">
                <h3 className="text-sm font-medium mb-3">Display Options</h3>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="show-grid">Show grid lines</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Display grid lines between beads</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dithering">Use dithering</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Creates a pattern effect to simulate more colors</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch id="dithering" checked={dithering} onCheckedChange={setDithering} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right column: Pattern Preview */}
          <Card className="h-full">
            <CardContent className="pt-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Pattern Preview</h2>
                {beadPattern && (
                  <Button size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>

              <div
                className={`flex-grow flex flex-col items-center justify-center border rounded-md p-4 min-h-[300px] ${removeBackground ? "bg-gray-200 bg-opacity-50 bg-grid" : ""}`}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Processing image...</p>
                  </div>
                ) : !originalImage ? (
                  <div className="text-center text-muted-foreground">
                    <p>Upload an image to generate a pattern</p>
                  </div>
                ) : beadPattern ? (
                  <div className="overflow-auto max-h-[500px] max-w-full">
                    <img src={beadPattern || "/placeholder.svg"} alt="Bead Pattern" className="mx-auto" />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>Processing your image...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bead Count Section - Collapsible */}
        {beadPattern && Object.keys(colorCounts).length > 0 && (
          <Card>
            <CardContent className="pt-6 pb-4">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setShowBeadCount(!showBeadCount)}
              >
                <div>
                  <h2 className="text-lg font-semibold">Bead Count</h2>
                  <p className="text-sm text-muted-foreground">
                    Total: {totalBeadCount} beads using {Object.keys(colorCounts).length} colors
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  {showBeadCount ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </div>

              {showBeadCount && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(colorCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([color, count]) => (
                      <div key={color} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                        <span className="text-sm">{count} beads</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>All processing happens in your browser - no images are uploaded to any server.</p>
      </footer>
    </main>
  )
}
