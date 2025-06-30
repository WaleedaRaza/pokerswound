import { EntropySample } from '../types'
import { estimateEntropyBits } from '../utils'

export interface ImageProcessorConfig {
  width: number
  height: number
  channels: number
  bitDepth: number
  noiseThreshold: number
}

export class ImageProcessor {
  private config: ImageProcessorConfig

  constructor(config: Partial<ImageProcessorConfig> = {}) {
    this.config = {
      width: 1920,
      height: 1080,
      channels: 3, // RGB
      bitDepth: 8,
      noiseThreshold: 0.1,
      ...config
    }
  }

  /**
   * Process image data to extract entropy
   */
  processImageData(
    imageData: Uint8Array | Uint8ClampedArray,
    sourceId: string,
    timestamp: number
  ): EntropySample {
    // Convert to Uint8Array if needed
    const normalizedData = this.normalizeImageData(imageData)
    
    // Extract entropy from pixel variations
    const pixelEntropy = this.extractPixelEntropy(normalizedData)
    
    // Extract entropy from color distribution
    const colorEntropy = this.extractColorEntropy(normalizedData)
    
    // Extract entropy from spatial patterns
    const spatialEntropy = this.extractSpatialEntropy(normalizedData)
    
    // Combine all entropy sources
    const totalEntropy = pixelEntropy + colorEntropy + spatialEntropy
    
    // Create entropy sample
    return {
      sourceId,
      timestamp,
      data: this.imageDataToString(normalizedData),
      entropyBits: Math.floor(totalEntropy),
      quality: this.calculateQuality(normalizedData)
    }
  }

  /**
   * Normalize image data to Uint8Array
   */
  private normalizeImageData(imageData: Uint8Array | Uint8ClampedArray): Uint8Array {
    if (imageData instanceof Uint8Array) {
      return imageData
    }

    return new Uint8Array(imageData)
  }

  /**
   * Extract entropy from pixel value variations
   */
  private extractPixelEntropy(imageData: Uint8Array): number {
    if (imageData.length < 2) return 0

    // Calculate pixel differences
    const differences = new Uint8Array(imageData.length - 1)
    for (let i = 1; i < imageData.length; i++) {
      differences[i - 1] = Math.abs(imageData[i] - imageData[i - 1])
    }

    // Convert to Buffer for entropy estimation
    const buffer = Buffer.from(differences)
    return estimateEntropyBits(buffer)
  }

  /**
   * Extract entropy from color distribution
   */
  private extractColorEntropy(imageData: Uint8Array): number {
    if (imageData.length < this.config.channels) return 0

    // Separate color channels
    const channels: Uint8Array[] = []
    for (let c = 0; c < this.config.channels; c++) {
      const channel = new Uint8Array(imageData.length / this.config.channels)
      for (let i = 0; i < channel.length; i++) {
        channel[i] = imageData[i * this.config.channels + c]
      }
      channels.push(channel)
    }

    // Calculate entropy for each channel
    let totalEntropy = 0
    for (const channel of channels) {
      const buffer = Buffer.from(channel)
      totalEntropy += estimateEntropyBits(buffer)
    }

    return totalEntropy / this.config.channels
  }

  /**
   * Extract entropy from spatial patterns
   */
  private extractSpatialEntropy(imageData: Uint8Array): number {
    if (imageData.length < this.config.width * this.config.channels) return 0

    // Calculate horizontal gradients
    const horizontalGradients = new Uint8Array(imageData.length - this.config.channels)
    for (let i = this.config.channels; i < imageData.length; i++) {
      horizontalGradients[i - this.config.channels] = Math.abs(
        imageData[i] - imageData[i - this.config.channels]
      )
    }

    // Calculate vertical gradients (if we have enough rows)
    const verticalGradients: Uint8Array[] = []
    const rowLength = this.config.width * this.config.channels
    const numRows = Math.floor(imageData.length / rowLength)

    for (let row = 1; row < numRows; row++) {
      const gradient = new Uint8Array(rowLength)
      for (let col = 0; col < rowLength; col++) {
        const currentIndex = row * rowLength + col
        const previousIndex = (row - 1) * rowLength + col
        gradient[col] = Math.abs(imageData[currentIndex] - imageData[previousIndex])
      }
      verticalGradients.push(gradient)
    }

    // Combine gradients for entropy estimation
    let combinedGradients = Buffer.from(horizontalGradients)
    for (const gradient of verticalGradients) {
      combinedGradients = Buffer.concat([combinedGradients, Buffer.from(gradient)])
    }

    return estimateEntropyBits(combinedGradients)
  }

  /**
   * Calculate quality score for image data
   */
  private calculateQuality(imageData: Uint8Array): number {
    if (imageData.length === 0) return 0

    // Calculate average pixel value
    let sum = 0
    for (let i = 0; i < imageData.length; i++) {
      sum += imageData[i]
    }
    const average = sum / imageData.length

    // Calculate variance
    let variance = 0
    for (let i = 0; i < imageData.length; i++) {
      variance += Math.pow(imageData[i] - average, 2)
    }
    variance /= imageData.length

    // Quality based on variance (more variance = more entropy potential)
    const varianceQuality = Math.min(variance / 1000, 1) // Normalize variance
    
    // Quality based on data size
    const sizeQuality = Math.min(imageData.length / (this.config.width * this.config.height * this.config.channels), 1)

    return (varianceQuality + sizeQuality) / 2
  }

  /**
   * Convert image data to string for storage
   */
  private imageDataToString(imageData: Uint8Array): string {
    // Take a sample of the data to avoid huge strings
    const sampleSize = Math.min(imageData.length, 100)
    const sample = imageData.slice(0, sampleSize)
    
    return sample.join(',')
  }

  /**
   * Get processor configuration
   */
  getConfig(): ImageProcessorConfig {
    return { ...this.config }
  }
} 