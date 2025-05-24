"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, Download, Loader2, RefreshCw, Info, ChevronDown, ChevronUp, Pencil, Eraser, Check, X, Pipette } from "lucide-react"
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
  const [showBeadCount, setShowBeadCount] = useState(false) // State for toggling bead count visibility
  
  // Editing mode states
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTool, setEditTool] = useState<'add' | 'erase' | 'pick'>('add')
  const [selectedColor, setSelectedColor] = useState<string>('#000000')
  const [editedBeadColors, setEditedBeadColors] = useState<string[][]>([])
  const [hasEdits, setHasEdits] = useState(false)

  // Configuration options
  const [beadSize, setBeadSize] = useState(10) // Size of each bead in pixels
  const [maxBeads, setMaxBeads] = useState(29) // Maximum beads in width or height
  const [selectedPalette, setSelectedPalette] = useState("standard")
  const [showGrid, setShowGrid] = useState(true)
  const [dithering, setDithering] = useState(false)
  const [removeBackground, setRemoveBackground] = useState(false) // Setting for background removal
  const [backgroundThreshold, setBackgroundThreshold] = useState(30) // Threshold for background detection (0-100)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const patternCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null)

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
        
        // Initialize edited colors with the original pattern
        setEditedBeadColors(JSON.parse(JSON.stringify(result.colorGrid)))
        setHasEdits(false)

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
  
  // Initialize canvas for editing when entering edit mode
  useEffect(() => {
    if (isEditMode && editedBeadColors.length && patternCanvasRef.current) {
      const canvas = patternCanvasRef.current
      const ctx = canvas.getContext('2d', { alpha: true })
      
      if (!ctx) return
      
      const width = editedBeadColors[0].length
      const height = editedBeadColors.length
      
      // Set canvas size
      canvas.width = width * beadSize
      canvas.height = height * beadSize
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw each bead as a colored square
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const color = editedBeadColors[y][x]
          
          // Skip transparent beads
          if (color === "transparent") continue
          
          ctx.fillStyle = color
          ctx.fillRect(x * beadSize, y * beadSize, beadSize, beadSize)
          
          // Draw grid lines if enabled
          if (showGrid) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.2)"
            ctx.lineWidth = 0.5
            ctx.strokeRect(x * beadSize, y * beadSize, beadSize, beadSize)
          }
        }
      }
      
      // Store context for later use
      canvasContextRef.current = ctx
    }
  }, [isEditMode, editedBeadColors, beadSize, showGrid])

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

    // If in edit mode, generate pattern from current edits before downloading
    if (isEditMode && hasEdits) {
      generateEditedPattern()
    }

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

  // Handle pattern editing
  const handlePatternEdit = (x: number, y: number) => {
    if (!editedBeadColors.length || !isEditMode) return
    
    // Calculate the position in the grid based on mouse coordinates
    const width = editedBeadColors[0].length
    const height = editedBeadColors.length
    
    // Ensure x and y are within bounds
    if (x < 0 || x >= width || y < 0 || y >= height) return
    
    // Clone the current state to avoid direct mutation
    const newBeadColors = [...editedBeadColors]
    
    if (editTool === 'add') {
      // Add a bead with the selected color
      newBeadColors[y][x] = selectedColor
    } else if (editTool === 'erase') {
      // Make the bead transparent
      newBeadColors[y][x] = 'transparent'
    } else if (editTool === 'pick') {
      // Pick the color at the clicked position
      const pickedColor = editedBeadColors[y][x]
      if (pickedColor !== 'transparent') {
        setSelectedColor(pickedColor)
        setEditTool('add') // Switch back to add tool after picking a color
      }
    }
    
    setEditedBeadColors(newBeadColors)
    setHasEdits(true)
  }

  // Handle drawing on canvas (mouse or touch)
  const handleCanvasDraw = (clientX: number, clientY: number) => {
    const canvas = patternCanvasRef.current
    if (!canvas || !editedBeadColors.length) return
    
    // Calculate the position in the grid
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = Math.floor(((clientX - rect.left) * scaleX) / beadSize)
    const y = Math.floor(((clientY - rect.top) * scaleY) / beadSize)
    
    // Update the grid
    handlePatternEdit(x, y)
    
    // Redraw the canvas
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return
    
    // Clear the space where the bead was clicked/touched
    ctx.clearRect(x * beadSize, y * beadSize, beadSize, beadSize)
    
    // If we're not erasing, draw the new bead
    if (editTool !== 'erase') {
      const color = editedBeadColors[y][x]
      if (color !== 'transparent') {
        ctx.fillStyle = color
        ctx.fillRect(x * beadSize, y * beadSize, beadSize, beadSize)
        
        // Draw grid line if enabled
        if (showGrid) {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.2)"
          ctx.lineWidth = 0.5
          ctx.strokeRect(x * beadSize, y * beadSize, beadSize, beadSize)
        }
      }
    }
  }
  
  // Generate an updated pattern from edited bead colors
  const generateEditedPattern = () => {
    if (!editedBeadColors.length || !patternCanvasRef.current) return
    
    const canvas = patternCanvasRef.current
    const ctx = canvas.getContext('2d', { alpha: true })
    
    if (!ctx) return
    
    const width = editedBeadColors[0].length
    const height = editedBeadColors.length
    
    // Set canvas size
    canvas.width = width * beadSize
    canvas.height = height * beadSize
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw each bead as a colored square
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = editedBeadColors[y][x]
        
        // Skip transparent beads
        if (color === "transparent") continue
        
        ctx.fillStyle = color
        ctx.fillRect(x * beadSize, y * beadSize, beadSize, beadSize)
        
        // Draw grid lines if enabled
        if (showGrid) {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.2)"
          ctx.lineWidth = 0.5
          ctx.strokeRect(x * beadSize, y * beadSize, beadSize, beadSize)
        }
      }
    }
    
    // Convert to data URL
    const patternDataUrl = canvas.toDataURL("image/png")
    setBeadPattern(patternDataUrl)
    
    // Count colors
    const counts: Record<string, number> = {}
    for (const row of editedBeadColors) {
      for (const color of row) {
        if (color !== "transparent") {
          counts[color] = (counts[color] || 0) + 1
        }
      }
    }
    setColorCounts(counts)
  }
  
  // Apply edits and exit edit mode
  const applyEdits = () => {
    generateEditedPattern()
    setIsEditMode(false)
  }
  
  // Cancel edits and exit edit mode
  const cancelEdits = () => {
    // Restore original bead colors
    setEditedBeadColors(JSON.parse(JSON.stringify(beadColors)))
    setHasEdits(false)
    setIsEditMode(false)
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
                      min={1}
                      max={100}
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
                <div className="flex gap-2">
                  {beadPattern && !isEditMode && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setIsEditMode(true)}
                        disabled={isProcessing || !beadPattern}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleDownload}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </>
                  )}
                  {isEditMode && (
                    <>
                      <Button 
                        size="sm" 
                        variant="default" 
                        onClick={applyEdits}
                        disabled={!hasEdits}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Apply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={cancelEdits}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Editing tools */}
              {isEditMode && beadPattern && (
                <div className="mb-4 border rounded-md p-3 bg-muted/30">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm"
                              variant={editTool === 'add' ? 'default' : 'outline'}
                              onClick={() => setEditTool('add')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add pixels</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm"
                              variant={editTool === 'erase' ? 'default' : 'outline'}
                              onClick={() => setEditTool('erase')}
                            >
                              <Eraser className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Erase pixels</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm"
                              variant={editTool === 'pick' ? 'default' : 'outline'}
                              onClick={() => setEditTool('pick')}
                            >
                              <Pipette className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Pick color from pattern</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label htmlFor="color-preview">Current color:</Label>
                      <div 
                        id="color-preview"
                        className="w-6 h-6 border rounded" 
                        style={{ backgroundColor: selectedColor }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* All palette colors */}
                  <div>
                    <Label className="text-xs mb-1 block">All palette colors:</Label>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 border rounded bg-background">
                      {beadPalettes[selectedPalette as keyof typeof beadPalettes].map((color) => (
                        <TooltipProvider key={color}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={`w-5 h-5 rounded-sm border ${selectedColor === color ? 'ring-2 ring-primary' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  setSelectedColor(color)
                                  setEditTool('add') // Switch to add tool when selecting a color
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{color} {colorCounts[color] ? `(${colorCounts[color]} beads)` : ''}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                  
                  {/* Currently used colors */}
                  <div className="mt-2">
                    <Label className="text-xs mb-1 block">Used in pattern:</Label>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 border rounded bg-background">
                      {Object.keys(colorCounts)
                        .sort((a, b) => colorCounts[b] - colorCounts[a])
                        .map((color) => (
                          <TooltipProvider key={color}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={`w-5 h-5 rounded-sm border ${selectedColor === color ? 'ring-2 ring-primary' : ''}`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => {
                                    setSelectedColor(color)
                                    setEditTool('add') // Switch to add tool when selecting a color
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{colorCounts[color]} beads</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`flex-grow flex flex-col items-center justify-center border rounded-md p-4 min-h-[300px] ${removeBackground ? "bg-checkered" : ""}`}
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
                  <div className="overflow-auto max-h-[500px] max-w-full relative">
                    {isEditMode ? (
                      <canvas 
                        ref={patternCanvasRef}
                        className="mx-auto"
                        style={{ cursor: editTool === 'pick' ? 'crosshair' : editTool === 'erase' ? 'not-allowed' : 'pointer' }}
                        onClick={(e) => handleCanvasDraw(e.clientX, e.clientY)}
                        onMouseMove={(e) => {
                          // Only handle mouse move with button pressed (dragging)
                          if (e.buttons !== 1) return
                          handleCanvasDraw(e.clientX, e.clientY)
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault() // Prevent default touch behavior
                          const touch = e.touches[0]
                          handleCanvasDraw(touch.clientX, touch.clientY)
                        }}
                        onTouchMove={(e) => {
                          e.preventDefault() // Prevent default touch behavior
                          const touch = e.touches[0]
                          handleCanvasDraw(touch.clientX, touch.clientY)
                        }}
                      />
                    ) : (
                      <img src={beadPattern || "/placeholder.svg"} alt="Bead Pattern" className="mx-auto" />
                    )}
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
